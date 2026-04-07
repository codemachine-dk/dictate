import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./main";

export interface Vote4DickTaidPluginSettings {
	recordingFolder: string;
	whisperCliPath: string;
	modelPath: string;
	language: string;
	promptOnNewAudioFile: boolean;
	autoTranscribeNewAudioFiles: boolean;
}

export const DEFAULT_SETTINGS: Vote4DickTaidPluginSettings = {
	recordingFolder: 'Vote 4 Dick Taid Recordings',
	whisperCliPath: 'whisper-cli',
	modelPath: '',
	language: 'en',
	promptOnNewAudioFile: true,
	autoTranscribeNewAudioFiles: false,
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

		new Setting(containerEl)
			.setName('Whisper CLI path')
			.setDesc('Full path to the whisper CLI program.')
			.addText(text => text
				.setPlaceholder('Whisper-cli')
				.setValue(this.plugin.settings.whisperCliPath)
				.onChange(async (value) => {
					this.plugin.settings.whisperCliPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model path')
			.setDesc('Path to the whisper ggml model file.')
			.addText(text => text
				.setPlaceholder('/path/to/ggml-base.en.bin')
				.setValue(this.plugin.settings.modelPath)
				.onChange(async (value) => {
					this.plugin.settings.modelPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Language')
			.setDesc('Language code for transcription, such as en, da, de, or auto.')
			.addText(text => text
				.setPlaceholder('Auto')
				.setValue(this.plugin.settings.language)
				.onChange(async (value) => {
					this.plugin.settings.language = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Prompt to transcribe new audio files')
			.setDesc('Show a prompt when an audio file is added to the vault.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.promptOnNewAudioFile)
				.onChange(async (value) => {
					this.plugin.settings.promptOnNewAudioFile = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-transcribe new audio files')
			.setDesc('Automatically transcribe audio files when added to the vault.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoTranscribeNewAudioFiles)
				.onChange(async (value) => {
					this.plugin.settings.autoTranscribeNewAudioFiles = value;
					await this.plugin.saveSettings();
				}));
	}
}
