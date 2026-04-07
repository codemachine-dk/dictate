import { App, FuzzySuggestModal, TFile } from 'obsidian';

export const AUDIO_EXTENSIONS = new Set(['wav', 'mp3', 'ogg', 'webm', 'm4a', 'flac', 'aac']);

export class AudioFileSuggestModal extends FuzzySuggestModal<TFile> {
	private onChoose: (file: TFile) => void;

	constructor(app: App, onChoose: (file: TFile) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder('Select an audio file to transcribe');
	}

	getItems(): TFile[] {
		return this.app.vault.getFiles().filter(f => AUDIO_EXTENSIONS.has(f.extension));
	}

	getItemText(item: TFile): string {
		return item.path;
	}

	onChooseItem(item: TFile): void {
		this.onChoose(item);
	}
}
