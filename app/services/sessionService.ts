import { Lesson, Noun, Pronoun, QueueItem, Tense, Verb } from '@/types';

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

function pickTwo<T>(arr: T[]): [T, T] {
  const shuffled = shuffle(arr);
  return [shuffled[0], shuffled[1]];
}

export function pickNextPronoun(tense: Tense, used: Pronoun[]): Pronoun {
  const pool = tense === 'imperative' ? IMPERATIVE_PRONOUNS : ALL_PRONOUNS;
  const unused = pool.filter((p) => !used.includes(p));
  if (unused.length > 0) return randomFrom(unused);
  // All pronouns covered — pick any except the most recent
  const last = used[used.length - 1];
  const fallback = pool.filter((p) => p !== last);
  return fallback.length ? randomFrom(fallback) : pool[0];
}

export interface QueueOptions {
  targetCount?: number;
  verbHebrews?: string[]; // empty/undefined = all verbs
  tenses?: Tense[];       // empty/undefined = all tenses
}

export function buildQueue(lesson: Lesson, options: QueueOptions = {}): QueueItem[] {
  const { targetCount = 40, verbHebrews, tenses: tenseFilters } = options;
  if (!lesson.verbs.length) return [];

  const verbs = verbHebrews?.length
    ? lesson.verbs.filter((v) => verbHebrews.includes(v.hebrew))
    : lesson.verbs;
  if (!verbs.length) return [];

  const tenses = tenseFilters?.length ? tenseFilters : ALL_TENSES;

  const nouns = lesson.nouns.length >= 3 ? lesson.nouns : [...lesson.nouns, ...FALLBACK_NOUNS];

  // Build all (verb × tense) combinations and shuffle truly randomly so each
  // "Next sentence" gives a random tense (subject to the filter)
  const combos: Array<{ verb: Verb; tense: Tense }> = [];
  for (const tense of tenses) {
    for (const verb of verbs) {
      combos.push({ verb, tense });
    }
  }
  const shuffled = shuffle(combos);

  const queue: QueueItem[] = [];
  for (let i = 0; queue.length < targetCount; i++) {
    const { verb, tense } = shuffled[i % shuffled.length];
    const pronounPool = tense === 'imperative' ? IMPERATIVE_PRONOUNS : ALL_PRONOUNS;
    const [sourcePronoun, targetPronoun] = pickTwo(pronounPool);
    queue.push({ verb, sourcePronoun, targetPronoun, tense, nouns: shuffle(nouns).slice(0, 3) });
  }

  return queue;
}
