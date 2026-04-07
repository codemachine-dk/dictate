import { TFile, Vault } from 'obsidian';

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;

  get isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async start(): Promise<void> {
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: this.getSupportedMimeType(),
    });
    this.mediaRecorder.addEventListener('dataavailable', (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    });
    this.mediaRecorder.start();
  }

  async stop(vault: Vault, note: TFile): Promise<TFile> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const ext = this.getFileExtension();
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
        blob.arrayBuffer().then(async (arrayBuffer) => {
          const audioFileName = note.basename + '.' + ext;
          const audioFile = await vault.createBinary(audioFileName, arrayBuffer);

          const embed = `![[${audioFile.name}]]\n`;
          await vault.append(note, embed);

          this.cleanup();
          resolve(audioFile);
        }).catch((err: unknown) => {
          this.cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        });
      }, { once: true });

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm', 'audio/ogg', 'audio/mp4'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  private getFileExtension(): string {
    const mime = this.mediaRecorder?.mimeType ?? '';
    if (mime.includes('webm')) return 'webm';
    if (mime.includes('ogg')) return 'ogg';
    if (mime.includes('mp4')) return 'm4a';
    return 'webm';
  }
}
