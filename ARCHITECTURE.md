# Hebrew Practice App — Architecture

## Overview

A web-first application for intermediate Hebrew learners to practice verb conjugation
through a conversational, speech-driven flow. The LLM (Claude API) handles sentence
generation and answer grading. Lessons are managed as local JSON documents.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (App Router) | Frontend + API routes in one repo; easy Vercel deploy |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS | Utility-first, works with React Native via NativeWind later |
| State | Zustand | Lightweight, React Native compatible |
| LLM | Claude API (Anthropic) | Sentence generation + answer grading |
| S2T | Web Speech API | Zero dependencies for MVP; abstracted for future swap |
| Storage | localStorage + IndexedDB | No backend DB needed for single-user MVP |
| Deployment | Vercel | Zero-config for Next.js |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│  ┌──────────────┐   ┌──────────────────────────────┐   │
│  │LessonManager │   │       PracticeSession         │   │
│  │              │   │                               │   │
│  │ - lesson list│   │  ┌─────────┐  ┌────────────┐ │   │
│  │ - word editor│   │  │ Prompt  │  │SpeechInput │ │   │
│  │ - import/    │   │  │ Display │  │(Web Speech)│ │   │
│  │   export     │   │  └─────────┘  └────────────┘ │   │
│  └──────┬───────┘   └──────────────┬───────────────┘   │
│         │                          │                    │
│  ┌──────▼──────────────────────────▼───────────────┐   │
│  │                  Service Layer                   │   │
│  │  LessonService │ SessionService │ SpeechService  │   │
│  │                │ LLMService     │                │   │
│  └────────────────┬────────────────────────────────┘   │
│                   │ HTTP                                │
└───────────────────┼─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│               Next.js API Routes                        │
│                                                         │
│   POST /api/practice/generate                           │
│   POST /api/practice/grade                             │
└───────────────────┬─────────────────────────────────────┘
                    │ Claude API
┌───────────────────▼─────────────────────────────────────┐
│                  Anthropic Claude API                   │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Components

### `LessonManager`
- Lists all lesson documents stored in localStorage
- Add / remove lessons
- Edit word lists within a lesson (verbs + optional nouns)
- Import lesson from local JSON or plain text file (drag & drop or file picker)
- Export lesson to JSON

### `PracticeSession`
- Displays the current practice prompt (English sentence with blank)
- Shows current verb, pronoun, tense, and binyan being drilled
- Renders result feedback (correct / correction only, no explanation)
- Tracks session progress (n of m questions)

### `SpeechInput`
- Push-to-talk or always-on microphone button
- Transcribes via Web Speech API
- Auto-submits on silence / end of utterance
- Displays transcription briefly before auto-grading

---

## Service Layer

### `LessonService`
Manages CRUD for lesson documents in localStorage.

```typescript
interface Verb {
  hebrew: string;       // e.g. "לכתוב"
  root: string;         // e.g. "כ-ת-ב"
  binyan: Binyan;       // e.g. "paal"
  english: string;      // e.g. "to write"
}

interface Noun {
  hebrew: string;
  english: string;
}

interface Lesson {
  id: string;
  name: string;
  createdAt: string;    // ISO date
  verbs: Verb[];
  nouns: Noun[];        // optional fillers; app has built-in fallbacks
}
```

### `SessionService`
Drives the practice queue. Selects next item based on app logic (not LLM).

```typescript
interface PracticeItem {
  verb: Verb;
  pronoun: Pronoun;     // ani, ata, at, hu, hi, anachnu, atem, aten, hem, hen
  tense: Tense;         // past, present, future, imperative
  binyan: Binyan;       // paal, nifal, piel, pual, hitpael, hifil, hufal
  prompt: string;       // LLM-generated sentence with blank
  expectedAnswer: string; // LLM-provided correct conjugation
}

interface SessionState {
  lessonId: string;
  queue: PracticeItem[];
  currentIndex: number;
  results: SessionResult[];
}

interface SessionResult {
  item: PracticeItem;
  userAnswer: string;
  correct: boolean;
  correction?: string;  // only set when incorrect
}
```

**Word selection logic (MVP):**
1. Pool = current lesson verbs + (if pool < 5) words from previous lessons
2. Shuffle pool at session start
3. For each verb: randomly assign pronoun, tense, and binyan
4. Cycle through the pool; repeat with new random assignments after one full pass

### `SpeechService`
Thin abstraction over the S2T provider.

```typescript
interface SpeechAdapter {
  start(): void;
  stop(): void;
  onResult(cb: (transcript: string) => void): void;
  onEnd(cb: () => void): void;
}
```

Implementations:
- `WebSpeechAdapter` — uses `window.SpeechRecognition` (MVP)
- `WhisperAdapter` — future drop-in replacement

### `LLMService`
Calls Next.js API routes; never calls Claude directly from the browser.

```typescript
// Generate a practice prompt for a given PracticeItem
generatePrompt(item: Omit<PracticeItem, 'prompt' | 'expectedAnswer'>): Promise<{
  prompt: string;
  expectedAnswer: string;
}>

// Grade a user's answer
gradeAnswer(item: PracticeItem, userAnswer: string): Promise<{
  correct: boolean;
  correction?: string;
}>
```

---

## Backend API Routes

### `POST /api/practice/generate`

**Request:**
```json
{
  "verb": { "hebrew": "לכתוב", "english": "to write", "binyan": "paal" },
  "pronoun": "hu",
  "tense": "past",
  "binyan": "paal"
}
```

**Response:**
```json
{
  "prompt": "Yesterday, ___ a long letter to his mother.",
  "hebrewCue": "השתמש ב־הוא",
  "expectedAnswer": "כתב"
}
```

### `POST /api/practice/grade`

**Request:**
```json
{
  "expectedAnswer": "כתב",
  "userAnswer": "כותב"
}
```

**Response:**
```json
{
  "correct": false,
  "correction": "כתב"
}
```

---

## LLM Prompt Design

### Generation prompt (system)
```
You are a Hebrew language tutor. Given a Hebrew verb, pronoun, tense, and binyan,
generate a short English sentence (8–14 words) with a blank where the conjugated
Hebrew verb should go. Also provide the correct Hebrew conjugation for that blank.

Rules:
- The sentence must make the pronoun and tense unambiguous from context
- Include simple filler nouns; prefer the nouns provided, otherwise use common words
- Return JSON only: { "prompt": "...", "hebrewCue": "...", "expectedAnswer": "..." }
- hebrewCue is a short Hebrew instruction, e.g. "השתמש ב־הוא" or "השתמשי ב־את"
```

### Grading prompt (system)
```
You are a Hebrew language grader. Compare the expected Hebrew conjugation with the
user's answer. Accept only exact matches (ignoring nikud).
Return JSON only: { "correct": true|false, "correction": "..." }
correction is only set when correct is false, and contains only the correct form.
```

---

## Lesson File Format

### JSON (canonical)
```json
{
  "name": "Lesson 5 — Movement Verbs",
  "verbs": [
    { "hebrew": "לָלֶכֶת", "root": "ה-ל-כ", "binyan": "paal", "english": "to go/walk" },
    { "hebrew": "לָרוּץ",  "root": "ר-ו-צ", "binyan": "paal", "english": "to run" }
  ],
  "nouns": [
    { "hebrew": "בַּיִת", "english": "house" },
    { "hebrew": "שׁוּק",  "english": "market" }
  ]
}
```

### Plain text (simple import)
```
# Lesson 5 — Movement Verbs
לָלֶכֶת to go/walk
לָרוּץ to run
```
Plain text imports ask the user to confirm the root and binyan after parsing.

---

## Directory Structure

```
/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home / lesson selector
│   ├── lessons/
│   │   └── page.tsx            # Lesson manager
│   ├── practice/
│   │   └── page.tsx            # Practice session
│   └── api/
│       └── practice/
│           ├── generate/route.ts
│           └── grade/route.ts
├── components/
│   ├── LessonManager/
│   ├── PracticeSession/
│   └── SpeechInput/
├── services/
│   ├── lessonService.ts
│   ├── sessionService.ts
│   ├── speechService.ts        # abstract adapter
│   ├── adapters/
│   │   └── webSpeechAdapter.ts
│   └── llmService.ts
├── store/
│   └── sessionStore.ts         # Zustand store
├── types/
│   └── index.ts                # Shared types
└── lib/
    └── prompts.ts              # LLM prompt templates
```

---

## Future Considerations

| Feature | How the current design accommodates it |
|---|---|
| Mobile (React Native) | Zustand + service layer are framework-agnostic; swap Tailwind → NativeWind |
| Whisper S2T | Drop in `WhisperAdapter` behind the same `SpeechAdapter` interface |
| Google Drive / Dropbox import | Add new `LessonLoader` implementations behind a common interface |
| Spaced repetition | `SessionResult` history already stored; add weighting in `SessionService` |
| Multi-user / cloud sync | Replace `LessonService` localStorage backend with Supabase/Firebase adapter |
| Hebrew UI | All prompt strings are in `lib/prompts.ts`; add i18n layer |
| Nikud validation | Add a flag to `gradeAnswer`; toggle strict/loose matching in grading prompt |
