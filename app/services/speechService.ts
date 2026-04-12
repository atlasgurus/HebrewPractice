export interface SpeechAdapter {
  isSupported(): boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onResult: ((transcript: string) => void) | null;
  onEnd: (() => void) | null;
  onError: ((error: string) => void) | null;
}
