/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { t } from '@vscode/l10n';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IExtensionContribution } from '../../common/contributions';

const CMD_TOGGLE_AUTO_APPROVE_SHELL = 'github.copilot.chat.toggleAutoApproveShell';

/**
 * Contribution that adds a ChatStatusItem to toggle auto-approve shell commands in agent mode.
 * This provides a quick way to enable/disable automatic terminal command execution without user confirmation.
 */
export class AutoApproveShellStatusContribution extends Disposable implements IExtensionContribution {

	private readonly _statusItem: vscode.ChatStatusItem;
	private _isEnabled: boolean = false;

	constructor(
		@IConfigurationService private readonly _configService: IConfigurationService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();

		// Create the status item
		this._statusItem = this._register(vscode.window.createChatStatusItem('copilot.autoApproveShell'));

		// Register the toggle command
		this._register(vscode.commands.registerCommand(CMD_TOGGLE_AUTO_APPROVE_SHELL, () => this._toggleAutoApprove()));

		// Initialize state from config
		this._isEnabled = this._configService.getConfig(ConfigKey.Advanced.AutoApproveShellCommands);
		this._updateStatusItem();

		// Listen for configuration changes
		this._register(this._configService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ConfigKey.Advanced.AutoApproveShellCommands.fullyQualifiedId)) {
				this._isEnabled = this._configService.getConfig(ConfigKey.Advanced.AutoApproveShellCommands);
				this._updateStatusItem();
			}
		}));

		// Show the status item
		this._statusItem.show();
	}

	private _updateStatusItem(): void {
		const icon = this._isEnabled ? '$(check)' : '$(circle-slash)';
		const statusText = this._isEnabled ? t('ON') : t('OFF');

		this._statusItem.title = {
			label: `${icon} Auto Run: ${statusText}`,
			link: `command:${CMD_TOGGLE_AUTO_APPROVE_SHELL}`
		};

		this._statusItem.description = this._isEnabled
			? t('Click to disable auto-approve for terminal commands')
			: t('Click to enable auto-approve for terminal commands');

		this._statusItem.detail = this._isEnabled
			? t('⚠️ Terminal commands will execute automatically without confirmation')
			: t('Terminal commands will require user confirmation before execution');

		this._logService.trace(`[AutoApproveShellStatus] Status updated: enabled=${this._isEnabled}`);
	}

	private async _toggleAutoApprove(): Promise<void> {
		const newValue = !this._isEnabled;

		this._logService.info(`[AutoApproveShellStatus] Toggling auto-approve shell commands: ${this._isEnabled} -> ${newValue}`);

		try {
			await this._configService.setConfig(ConfigKey.Advanced.AutoApproveShellCommands, newValue);
			this._isEnabled = newValue;
			this._updateStatusItem();

			// Show notification to user
			const message = newValue
				? t('Auto-approve terminal commands is now ENABLED. Commands will execute without confirmation.')
				: t('Auto-approve terminal commands is now DISABLED. Commands will require confirmation.');

			if (newValue) {
				vscode.window.showWarningMessage(message);
			} else {
				vscode.window.showInformationMessage(message);
			}
		} catch (error) {
			this._logService.error(`[AutoApproveShellStatus] Failed to toggle setting: ${error}`);
			vscode.window.showErrorMessage(t('Failed to toggle auto-approve setting'));
		}
	}
}
