import { TFile, Vault } from 'obsidian';

export interface RecordingResult {
  audioFile: TFile;
  diskPath: string;
}

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

  async stop(vault: Vault, note: TFile, folder: string): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
        this.convertToWav(blob).then(async (wavBuffer) => {
          const folderPath = folder.replace(/\/+$/, '');
          if (!vault.getAbstractFileByPath(folderPath)) {
            await vault.createFolder(folderPath);
          }
          const audioFileName = `${folderPath}/${note.basename}.wav`;
          const audioFile = await vault.createBinary(audioFileName, wavBuffer);

          const embed = `![[${audioFile.name}]]\n`;
          await vault.append(note, embed);

          // Resolve the absolute disk path for whisper-cli
          const adapter = vault.adapter as unknown as { getBasePath(): string };
          const diskPath = `${adapter.getBasePath()}/${audioFileName}`;

          this.cleanup();
          resolve({ audioFile, diskPath });
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

  private async convertToWav(blob: Blob): Promise<ArrayBuffer> {
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Resample to 16kHz mono via OfflineAudioContext
      const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      const rendered = await offlineCtx.startRendering();

      return this.encodeWav(rendered);
    } finally {
      await audioCtx.close();
    }
  }

  private encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
    const numChannels = 1;
    const sampleRate = audioBuffer.sampleRate;
    const samples = audioBuffer.getChannelData(0);
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = samples.length * (bitsPerSample / 8);
    const headerSize = 44;

    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');

    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Convert float32 samples to int16
    let offset = headerSize;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
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
}
