import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface Vote4DickTaidPluginSettings {
	recordingFolder: string;
}

export const DEFAULT_SETTINGS: Vote4DickTaidPluginSettings = {
	recordingFolder: 'Vote 4 Dick Taid Recordings'
}

export class Vote4DickTaidSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Recording folder')
			.setDesc('Folder where audio recordings are saved.')
			.addText(text => text
				.setPlaceholder('Recordings')
				.setValue(this.plugin.settings.recordingFolder)
				.onChange(async (value) => {
					this.plugin.settings.recordingFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
