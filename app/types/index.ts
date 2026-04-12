export type Binyan = 'paal' | 'nifal' | 'piel' | 'pual' | 'hitpael' | 'hifil' | 'hufal';
export type Tense = 'past' | 'present' | 'future' | 'imperative';
export type Pronoun =
  | 'ani' | 'ata' | 'at' | 'hu' | 'hi'
  | 'anachnu' | 'atem' | 'aten' | 'hem' | 'hen';

export const BINYAN_LABELS: Record<Binyan, string> = {
  paal: "Pa'al",
  nifal: "Nif'al",
  piel: "Pi'el",
  pual: "Pu'al",
  hitpael: "Hitpa'el",
  hifil: "Hif'il",
  hufal: "Huf'al",
};

export const TENSE_LABELS: Record<Tense, string> = {
  past: 'Past',
  present: 'Present',
  future: 'Future',
  imperative: 'Imperative',
};

export const PRONOUN_LABELS: Record<Pronoun, { english: string; hebrew: string }> = {
  ani:     { english: 'I',            hebrew: 'אני'   },
  ata:     { english: 'you (m.s.)',   hebrew: 'אתה'   },
  at:      { english: 'you (f.s.)',   hebrew: 'את'    },
  hu:      { english: 'he',           hebrew: 'הוא'   },
  hi:      { english: 'she',          hebrew: 'היא'   },
  anachnu: { english: 'we',           hebrew: 'אנחנו' },
  atem:    { english: 'you (m.pl.)',  hebrew: 'אתם'   },
  aten:    { english: 'you (f.pl.)',  hebrew: 'אתן'   },
  hem:     { english: 'they (m.)',    hebrew: 'הם'    },
  hen:     { english: 'they (f.)',    hebrew: 'הן'    },
};

export interface Verb {
  hebrew: string;
  root: string;
  binyan: Binyan;
  english: string;
}

export interface Noun {
  hebrew: string;
  english: string;
}

export interface Lesson {
  id: string;
  name: string;
  createdAt: string;
  verbs: Verb[];
  nouns: Noun[];
}

export interface QueueItem {
  verb: Verb;
  pronoun: Pronoun;
  tense: Tense;
  nouns: Noun[];
}

export interface PracticeItem extends QueueItem {
  prompt: string;
  hebrewCue: string;
  expectedAnswer: string;
}

export interface SessionResult {
  item: PracticeItem;
  userAnswer: string;
  correct: boolean;
  correction?: string;
}

export type SessionStatus =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'listening'
  | 'grading'
  | 'result'
  | 'complete';
