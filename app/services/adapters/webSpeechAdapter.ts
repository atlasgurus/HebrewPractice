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

interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string; confidence: number };
  readonly isFinal: boolean;
  readonly length: number;
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
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
    this.recognition.continuous = true; // keep recording through pauses

    let accumulated = '';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Append only the newly finalized phrase(s)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          accumulated += (accumulated ? ' ' : '') + event.results[i][0].transcript.trim();
        }
      }
      this.onResult?.(accumulated);
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
