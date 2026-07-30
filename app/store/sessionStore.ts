import { create } from 'zustand';
import { PracticeItem, Pronoun, QueueItem, SessionResult, SessionStatus } from '@/types';
import { generatePrompt, generateNextPronoun, gradeAnswer } from '@/services/llmService';
import { pickNextPronoun } from '@/services/sessionService';

interface SessionStore {
  status: SessionStatus;
  lessonName: string;
  queue: QueueItem[];
  currentIndex: number;
  currentItem: PracticeItem | null;
  results: SessionResult[];
  error: string | null;
  usedPronouns: Pronoun[]; // pronouns already drilled for the current sentence (verb+tense)

  startSession: (queue: QueueItem[], lessonName: string) => Promise<void>;
  submitAnswer: (transcript: string) => Promise<void>;
  retry: () => void;
  retryGenerate: () => Promise<void>;
  advance: () => Promise<void>;
  nextPronoun: () => Promise<void>;
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
  usedPronouns: [],

  startSession: async (queue, lessonName) => {
    set({ queue, lessonName, currentIndex: 0, results: [], status: 'generating', error: null, currentItem: null, usedPronouns: [] });
    try {
      const item = await generatePrompt(queue[0]);
      set({ currentItem: item, status: 'ready', usedPronouns: [item.targetPronoun] });
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

  retry: () => set({ status: 'ready' }),

  retryGenerate: async () => {
    const { queue, currentIndex } = get();
    if (!queue.length) return;
    set({ status: 'generating', error: null });
    try {
      const item = await generatePrompt(queue[currentIndex]);
      set({ currentItem: item, status: 'ready' });
    } catch {
      set({ error: 'Failed to load question. Please try again.', status: 'ready' });
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
      // New sentence → reset used pronouns to just this one
      set({ currentItem: item, status: 'ready', usedPronouns: [item.targetPronoun] });
    } catch {
      set({ error: 'Failed to load next question. Please try again.', status: 'ready' });
    }
  },

  nextPronoun: async () => {
    const { currentItem, usedPronouns } = get();
    if (!currentItem) return;
    const newTarget = pickNextPronoun(currentItem.tense, usedPronouns);
    set({ status: 'generating' });
    try {
      const item = await generateNextPronoun(currentItem.expectedSentence, currentItem, newTarget);
      set({ currentItem: item, status: 'ready', usedPronouns: [...usedPronouns, newTarget] });
    } catch {
      set({ error: 'Failed to generate next pronoun. Please try again.', status: 'ready' });
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
      usedPronouns: [],
    }),
}));
