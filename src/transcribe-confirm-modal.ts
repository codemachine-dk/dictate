import { App, Modal, Setting } from 'obsidian';

export class TranscribeConfirmModal extends Modal {
  private fileName: string;
  private onConfirm: () => void;
  private onNever: () => void;

  constructor(app: App, fileName: string, onConfirm: () => void, onNever: () => void) {
    super(app);
    this.fileName = fileName;
    this.onConfirm = onConfirm;
    this.onNever = onNever;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('p', { text: `Audio file detected: ${this.fileName}` });
    contentEl.createEl('p', { text: 'Would you like to transcribe it?' });

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Transcribe')
        .setCta()
        .onClick(() => {
          this.close();
          this.onConfirm();
        }))
      .addButton(btn => btn
        .setButtonText('Skip')
        .onClick(() => {
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText('Never ask again')
        .setWarning()
        .onClick(() => {
          this.close();
          this.onNever();
        }));
  }

  onClose() {
    this.contentEl.empty();
  }
}
