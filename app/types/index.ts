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

export const PRONOUN_LABELS: Record<Pronoun, {
  english: string;       // full disambiguated label, e.g. "you (m.s.)" — for UI
  englishWord: string;   // plain pronoun for sentence substitution, e.g. "you"
  hebrew: string;
  hebrewNikud: string;
}> = {
  ani:     { english: 'I',           englishWord: 'I',    hebrew: 'אני',   hebrewNikud: 'אֲנִי'   },
  ata:     { english: 'you (m.s.)',  englishWord: 'you',  hebrew: 'אתה',   hebrewNikud: 'אַתָּה'  },
  at:      { english: 'you (f.s.)',  englishWord: 'you',  hebrew: 'את',    hebrewNikud: 'אַתְּ'   },
  hu:      { english: 'he',          englishWord: 'he',   hebrew: 'הוא',   hebrewNikud: 'הוּא'    },
  hi:      { english: 'she',         englishWord: 'she',  hebrew: 'היא',   hebrewNikud: 'הִיא'    },
  anachnu: { english: 'we',          englishWord: 'we',   hebrew: 'אנחנו', hebrewNikud: 'אֲנַחְנוּ' },
  atem:    { english: 'you (m.pl.)', englishWord: 'you',  hebrew: 'אתם',   hebrewNikud: 'אַתֶּם'  },
  aten:    { english: 'you (f.pl.)', englishWord: 'you',  hebrew: 'אתן',   hebrewNikud: 'אַתֶּן'  },
  hem:     { english: 'they (m.)',   englishWord: 'they', hebrew: 'הם',    hebrewNikud: 'הֵם'     },
  hen:     { english: 'they (f.)',   englishWord: 'they', hebrew: 'הן',    hebrewNikud: 'הֵן'     },
};

// All verb forms stored with nikud for correct TTS and display
export type ConjugationTable = {
  past: Record<Pronoun, string>;
  present: Record<Pronoun, string>;
  future: Record<Pronoun, string>;
  imperative: Partial<Record<Pronoun, string>>; // only ata / at / atem / aten
};

// Single-verb sentence template with {P} (pronoun) and {V} (verb) placeholders.
// Used to instantly build practice items by substituting pre-conjugated forms.
export interface SentenceTemplate {
  template: string;       // no nikud, e.g. "{P} {V} את הספר אתמול"
  templateNikud: string;  // with nikud on everything except placeholders
  englishTemplate: string; // e.g. "{P} read the book yesterday"
}

export type VerbTemplates = Partial<Record<Tense, SentenceTemplate>>;

export interface Verb {
  hebrew: string;
  root: string;
  binyan: Binyan;
  english: string;
  conjugations?: ConjugationTable;
  templates?: VerbTemplates;
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
  sourcePronoun: Pronoun;   // pronoun used in the shown sentence
  targetPronoun: Pronoun;   // pronoun the user must restate with
  tense: Tense;
  nouns: Noun[];
}

export interface PracticeItem extends QueueItem {
  originalSentence: string;        // full Hebrew sentence with sourcePronoun (no nikud)
  expectedSentence: string;        // full Hebrew sentence with targetPronoun (no nikud)
  expectedAnswer: string;          // just the conjugated verb form for targetPronoun
  originalSentenceNikud: string;   // same sentence with nikud — used for TTS only
  expectedSentenceNikud: string;   // target sentence with nikud — used for feedback TTS
  originalSentenceEnglish: string; // English translation of originalSentence
}

export interface SessionResult {
  item: PracticeItem;
  userAnswer: string;
  correct: boolean;
  correction?: string;        // the correct full sentence if wrong
}

export type SessionStatus =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'listening'
  | 'grading'
  | 'result'
  | 'complete';
