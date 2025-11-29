/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ConfigKey, IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IExtensionContribution } from '../../common/contributions';

const CMD_TOGGLE_AUTO_APPROVE_SHELL = 'github.copilot.chat.toggleAutoApproveShell';

/**
 * Contribution that adds a status bar item to toggle auto-approve shell commands in agent mode.
 * This provides a quick way to enable/disable automatic terminal command execution without user confirmation.
 * Click the status bar button or use Command Palette (Ctrl+Shift+P) to toggle.
 */
export class AutoApproveShellStatusContribution extends Disposable implements IExtensionContribution {

	private readonly _statusBarItem: vscode.StatusBarItem;
	private _isEnabled: boolean = false;

	constructor(
		@IConfigurationService private readonly _configService: IConfigurationService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();

		// Create status bar item (right side, priority 100)
		this._statusBarItem = this._register(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100));
		this._statusBarItem.command = CMD_TOGGLE_AUTO_APPROVE_SHELL;
		this._statusBarItem.tooltip = 'Click to toggle auto-approve shell commands in agent mode';

		// Register the toggle command
		this._register(vscode.commands.registerCommand(CMD_TOGGLE_AUTO_APPROVE_SHELL, () => this._toggleAutoApprove()));

		// Initialize state from config
		this._isEnabled = this._configService.getConfig(ConfigKey.Advanced.AutoApproveShellCommands);
		this._updateStatusBar();

		// Listen for configuration changes
		this._register(this._configService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration(ConfigKey.Advanced.AutoApproveShellCommands.fullyQualifiedId)) {
				this._isEnabled = this._configService.getConfig(ConfigKey.Advanced.AutoApproveShellCommands);
				this._updateStatusBar();
			}
		}));

		// Show the status bar item
		this._statusBarItem.show();

		this._logService.trace('[AutoApproveShellStatus] Status bar item created');
	}

	private _updateStatusBar(): void {
		if (this._isEnabled) {
			this._statusBarItem.text = '$(check) Auto Run: ON';
			this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		} else {
			this._statusBarItem.text = '$(circle-slash) Auto Run: OFF';
			this._statusBarItem.backgroundColor = undefined;
		}
		this._logService.trace(`[AutoApproveShellStatus] Status bar updated: enabled=${this._isEnabled}`);
	}

	private async _toggleAutoApprove(): Promise<void> {
		const newValue = !this._isEnabled;

		this._logService.info(`[AutoApproveShellStatus] Toggling auto-approve shell commands: ${this._isEnabled} -> ${newValue}`);

		try {
			await this._configService.setConfig(ConfigKey.Advanced.AutoApproveShellCommands, newValue);
			this._isEnabled = newValue;
			this._updateStatusBar();

			// Show notification to user
			const message = newValue
				? 'Auto-approve terminal commands is now ENABLED. Commands will execute without confirmation.'
				: 'Auto-approve terminal commands is now DISABLED. Commands will require confirmation.';

			if (newValue) {
				vscode.window.showWarningMessage(message);
			} else {
				vscode.window.showInformationMessage(message);
			}
		} catch (error) {
			this._logService.error(`[AutoApproveShellStatus] Failed to toggle setting: ${error}`);
			vscode.window.showErrorMessage('Failed to toggle auto-approve setting');
		}
	}
}
