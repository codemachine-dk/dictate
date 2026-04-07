import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Vote4DickTaidPluginSettings, SampleSettingTab } from "./settings";

export default class Vote4DickTaidPlugin extends Plugin {
	settings!: Vote4DickTaidPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('mic', 'Start dictation', () => {
			void this.startDictation();
		});

		this.addCommand({
			id: 'start-dictation',
			name: 'Start dictation',
			callback: () => {
				void this.startDictation();
			},
		});
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async startDictation() {
		const timestamp = window.moment().format('YYYY-MM-DD HHmmss');
		const fileName = `Dictation ${timestamp}.md`;
		const file = await this.app.vault.create(fileName, '');
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);
		new Notice('Dictation started');
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<Vote4DickTaidPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
