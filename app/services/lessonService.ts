import { Lesson, Verb } from '@/types';

const STORAGE_KEY = 'hebrew-practice-lessons';

function loadAll(): Lesson[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(lessons: Lesson[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
}

export const lessonService = {
  getAll(): Lesson[] {
    return loadAll();
  },

  getById(id: string): Lesson | undefined {
    return loadAll().find((l) => l.id === id);
  },

  create(name: string): Lesson {
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      verbs: [],
      nouns: [],
    };
    const lessons = loadAll();
    lessons.push(lesson);
    saveAll(lessons);
    return lesson;
  },

  update(updated: Lesson): void {
    saveAll(loadAll().map((l) => (l.id === updated.id ? updated : l)));
  },

  delete(id: string): void {
    saveAll(loadAll().filter((l) => l.id !== id));
  },

  importFromJson(json: string): Lesson {
    const data = JSON.parse(json);
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      name: data.name || 'Imported Lesson',
      createdAt: new Date().toISOString(),
      verbs: data.verbs ?? [],
      nouns: data.nouns ?? [],
    };
    const lessons = loadAll();
    lessons.push(lesson);
    saveAll(lessons);
    return lesson;
  },

  importFromText(text: string, name: string): Lesson {
    const verbs: Verb[] = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        verbs.push({
          hebrew: parts[0],
          english: parts.slice(1).join(' '),
          root: '',
          binyan: 'paal',
        });
      }
    }
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      verbs,
      nouns: [],
    };
    const lessons = loadAll();
    lessons.push(lesson);
    saveAll(lessons);
    return lesson;
  },

  exportToJson(lesson: Lesson): string {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, ...data } = lesson;
    return JSON.stringify(data, null, 2);
  },
};
