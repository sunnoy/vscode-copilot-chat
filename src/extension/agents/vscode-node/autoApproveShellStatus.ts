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
 * Contribution that registers a command to toggle auto-approve shell commands in agent mode.
 * This provides a quick way to enable/disable automatic terminal command execution without user confirmation.
 * Use Command Palette (Ctrl+Shift+P) and search for "Toggle Auto-Approve Shell Commands" to use.
 */
export class AutoApproveShellStatusContribution extends Disposable implements IExtensionContribution {

	constructor(
		@IConfigurationService private readonly _configService: IConfigurationService,
		@ILogService private readonly _logService: ILogService,
	) {
		super();

		// Register the toggle command
		this._register(vscode.commands.registerCommand(CMD_TOGGLE_AUTO_APPROVE_SHELL, () => this._toggleAutoApprove()));

		this._logService.trace('[AutoApproveShellStatus] Command registered');
	}

	private async _toggleAutoApprove(): Promise<void> {
		const currentValue = this._configService.getConfig(ConfigKey.Advanced.AutoApproveShellCommands);
		const newValue = !currentValue;

		this._logService.info(`[AutoApproveShellStatus] Toggling auto-approve shell commands: ${currentValue} -> ${newValue}`);

		try {
			await this._configService.setConfig(ConfigKey.Advanced.AutoApproveShellCommands, newValue);

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
