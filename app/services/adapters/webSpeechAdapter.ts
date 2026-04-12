import { SpeechAdapter } from '@/services/speechService';

// Web Speech API types (not always present in TS lib)
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

export class WebSpeechAdapter implements SpeechAdapter {
  private recognition: ISpeechRecognition | null = null;

  onResult: ((transcript: string) => void) | null = null;
  onEnd: (() => void) | null = null;
  onError: ((error: string) => void) | null = null;

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  start(): void {
    if (!this.isSupported()) return;

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = 'he-IL';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      this.onResult?.(transcript.trim());
    };

    this.recognition.onend = () => {
      this.onEnd?.();
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.onError?.(event.error);
      this.onEnd?.();
    };

    this.recognition.start();
  }

  stop(): void {
    this.recognition?.stop();
  }

  abort(): void {
    this.recognition?.abort();
    this.recognition = null;
  }
}
