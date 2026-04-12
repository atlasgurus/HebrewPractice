import { Lesson, Noun, Pronoun, QueueItem, Tense } from '@/types';

const ALL_PRONOUNS: Pronoun[] = ['ani', 'ata', 'at', 'hu', 'hi', 'anachnu', 'atem', 'aten', 'hem', 'hen'];
const IMPERATIVE_PRONOUNS: Pronoun[] = ['ata', 'at', 'atem', 'aten'];
const ALL_TENSES: Tense[] = ['past', 'present', 'future', 'imperative'];

const FALLBACK_NOUNS: Noun[] = [
  { hebrew: 'בית', english: 'house' },
  { hebrew: 'ספר', english: 'book' },
  { hebrew: 'מים', english: 'water' },
  { hebrew: 'יום', english: 'day' },
  { hebrew: 'שנה', english: 'year' },
  { hebrew: 'עיר', english: 'city' },
  { hebrew: 'ילד', english: 'child' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function buildQueue(lesson: Lesson, targetCount = 20): QueueItem[] {
  if (!lesson.verbs.length) return [];

  const nouns = lesson.nouns.length >= 3 ? lesson.nouns : [...lesson.nouns, ...FALLBACK_NOUNS];
  const queue: QueueItem[] = [];
  const verbs = shuffle(lesson.verbs);

  while (queue.length < targetCount) {
    for (const verb of verbs) {
      if (queue.length >= targetCount) break;
      const tense = randomFrom(ALL_TENSES);
      const pronounPool = tense === 'imperative' ? IMPERATIVE_PRONOUNS : ALL_PRONOUNS;
      const pronoun = randomFrom(pronounPool);
      queue.push({
        verb,
        pronoun,
        tense,
        nouns: shuffle(nouns).slice(0, 3),
      });
    }
  }

  return queue;
}
