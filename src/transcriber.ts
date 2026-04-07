import { execFile } from 'child_process';

export interface TranscribeOptions {
  whisperCliPath: string;
  modelPath: string;
  language: string;
  audioFilePath: string;
}

export function transcribe(options: TranscribeOptions): Promise<string> {
  const { whisperCliPath, modelPath, language, audioFilePath } = options;

  const args = [
    '-m', modelPath,
    '-f', audioFilePath,
    '-l', language,
    '--no-timestamps',
  ];

  return new Promise((resolve, reject) => {
    execFile(whisperCliPath, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`whisper-cli failed: ${stderr || error.message}`));
        return;
      }

      const text = stdout.trim();
      if (!text) {
        reject(new Error(`whisper-cli produced no output. stderr: ${stderr}`));
        return;
      }
      resolve(text);
    });
  });
}
