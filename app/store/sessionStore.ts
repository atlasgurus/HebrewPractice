import { create } from 'zustand';
import { PracticeItem, QueueItem, SessionResult, SessionStatus } from '@/types';
import { generatePrompt, gradeAnswer } from '@/services/llmService';

interface SessionStore {
  status: SessionStatus;
  lessonName: string;
  queue: QueueItem[];
  currentIndex: number;
  currentItem: PracticeItem | null;
  results: SessionResult[];
  error: string | null;

  startSession: (queue: QueueItem[], lessonName: string) => Promise<void>;
  submitAnswer: (transcript: string) => Promise<void>;
  advance: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  status: 'idle',
  lessonName: '',
  queue: [],
  currentIndex: 0,
  currentItem: null,
  results: [],
  error: null,

  startSession: async (queue, lessonName) => {
    set({ queue, lessonName, currentIndex: 0, results: [], status: 'generating', error: null, currentItem: null });
    try {
      const item = await generatePrompt(queue[0]);
      set({ currentItem: item, status: 'ready' });
    } catch {
      set({ error: 'Failed to load first question. Check your API key.', status: 'idle' });
    }
  },

  submitAnswer: async (transcript) => {
    const { currentItem } = get();
    if (!currentItem) return;
    set({ status: 'grading' });
    try {
      const result = await gradeAnswer(currentItem, transcript);
      set((s) => ({
        results: [
          ...s.results,
          { item: currentItem, userAnswer: transcript, correct: result.correct, correction: result.correction },
        ],
        status: 'result',
      }));
    } catch {
      set({ error: 'Grading failed. Please try again.', status: 'ready' });
    }
  },

  advance: async () => {
    const { queue, currentIndex } = get();
    const next = currentIndex + 1;
    if (next >= queue.length) {
      set({ status: 'complete' });
      return;
    }
    set({ currentIndex: next, status: 'generating', currentItem: null });
    try {
      const item = await generatePrompt(queue[next]);
      set({ currentItem: item, status: 'ready' });
    } catch {
      set({ error: 'Failed to load next question. Please try again.', status: 'ready' });
    }
  },

  reset: () =>
    set({
      status: 'idle',
      lessonName: '',
      queue: [],
      currentIndex: 0,
      currentItem: null,
      results: [],
      error: null,
    }),
}));
