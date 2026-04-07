import { Notice, Plugin, setIcon, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, Vote4DickTaidPluginSettings, Vote4DickTaidSettingTab } from "./settings";
import { AudioRecorder } from "./recorder";
import { transcribe } from "./transcriber";
import { AudioFileSuggestModal, AUDIO_EXTENSIONS } from "./audio-file-modal";
import { TranscribeConfirmModal } from "./transcribe-confirm-modal";

export default class Vote4DickTaidPlugin extends Plugin {
	settings!: Vote4DickTaidPluginSettings;
	private recorder = new AudioRecorder();
	private activeNote: TFile | null = null;
	private ribbonIconEl: HTMLElement | null = null;
	private ownRecordings = new Set<string>();

	async onload() {
		await this.loadSettings();

		this.ribbonIconEl = this.addRibbonIcon('mic', 'Start/stop dictation', () => {
			void this.toggleDictation();
		});

		this.addCommand({
			id: 'start-dictation',
			name: 'Start dictation',
			callback: () => {
				void this.startDictation();
			},
		});

		this.addCommand({
			id: 'stop-dictation',
			name: 'Stop dictation',
			callback: () => {
				void this.stopDictation();
			},
		});

		this.addCommand({
			id: 'transcribe-audio-file',
			name: 'Transcribe audio file',
			callback: () => {
				new AudioFileSuggestModal(this.app, (file) => {
					void this.transcribeFile(file);
				}).open();
			},
		});

		this.addSettingTab(new Vote4DickTaidSettingTab(this.app, this));

		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) return;
				if (!AUDIO_EXTENSIONS.has(file.extension)) return;
				if (this.ownRecordings.delete(file.path)) return;
				if (!this.settings.modelPath) return;
				if (!this.settings.promptOnNewAudioFile) return;

				new TranscribeConfirmModal(this.app, file.name, () => {
					void this.transcribeFile(file);
				}, () => {
					this.settings.promptOnNewAudioFile = false;
					void this.saveSettings();
				}).open();
			})
		);
	}

	async toggleDictation() {
		if (this.recorder.isRecording) {
			await this.stopDictation();
		} else {
			await this.startDictation();
		}
	}

	async startDictation() {
		try {
			const timestamp = window.moment().format('YYYY-MM-DD HHmmss');
			const fileName = `Dictation ${timestamp}.md`;
			const file = await this.app.vault.create(fileName, '');
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);

			this.activeNote = file;
			await this.recorder.start();
			this.updateRibbonIcon();
			new Notice('Recording started');
		} catch (err) {
			this.updateRibbonIcon();
			new Notice('Failed to start recording: ' + (err as Error).message);
		}
	}

	async stopDictation() {
		if (!this.recorder.isRecording || !this.activeNote) {
			new Notice('No active recording');
			return;
		}
		try {
			const expectedAudioPath = `${this.settings.recordingFolder.replace(/\/+$/, '')}/${this.activeNote.basename}.wav`;
			this.ownRecordings.add(expectedAudioPath);

			const { diskPath } = await this.recorder.stop(this.app.vault, this.activeNote, this.settings.recordingFolder);
			new Notice('Recording saved, transcribing…');

			if (this.settings.modelPath) {
				const text = await transcribe({
					whisperCliPath: this.settings.whisperCliPath,
					modelPath: this.settings.modelPath,
					language: this.settings.language,
					audioFilePath: diskPath,
				});

				if (text && this.activeNote) {
					await this.app.vault.append(this.activeNote, '\n' + text + '\n');
				}
				new Notice('Transcription complete');
			} else {
				new Notice('Skipped transcription — no model path configured');
			}
		} catch (err) {
			new Notice('Failed: ' + (err as Error).message);
		} finally {
			this.activeNote = null;
			this.updateRibbonIcon();
		}
	}

	private updateRibbonIcon() {
		if (!this.ribbonIconEl) return;
		const recording = this.recorder.isRecording;
		setIcon(this.ribbonIconEl, recording ? 'mic-off' : 'mic');
		this.ribbonIconEl.setAttribute('aria-label', recording ? 'Stop dictation' : 'Start dictation');
	}

	async transcribeFile(audioFile: TFile) {
		if (!this.settings.modelPath) {
			new Notice('No model path configured. Set it in the plugin settings.');
			return;
		}

		const adapter = this.app.vault.adapter as unknown as { getBasePath(): string };
		const diskPath = `${adapter.getBasePath()}/${audioFile.path}`;

		new Notice('Transcribing…');
		try {
			const text = await transcribe({
				whisperCliPath: this.settings.whisperCliPath,
				modelPath: this.settings.modelPath,
				language: this.settings.language,
				audioFilePath: diskPath,
			});

			const noteName = `${audioFile.basename}.md`;
			const noteDir = audioFile.parent?.path ?? '';
			const notePath = noteDir ? `${noteDir}/${noteName}` : noteName;

			const existing = this.app.vault.getAbstractFileByPath(notePath);
			if (existing instanceof TFile) {
				await this.app.vault.append(existing, '\n' + text + '\n');
			} else {
				await this.app.vault.create(notePath, `![[${audioFile.name}]]\n\n${text}\n`);
			}

			const noteFile = this.app.vault.getAbstractFileByPath(notePath);
			if (noteFile instanceof TFile) {
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(noteFile);
			}

			new Notice('Transcription complete');
		} catch (err) {
			new Notice('Transcription failed: ' + (err as Error).message);
		}
	}

	onunload() {
		this.recorder.cancel();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<Vote4DickTaidPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
