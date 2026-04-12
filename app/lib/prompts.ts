import { BINYAN_LABELS, Noun, PRONOUN_LABELS, Pronoun, Tense, TENSE_LABELS, Verb } from '@/types';

export const GENERATE_SYSTEM_PROMPT = `You are a Hebrew language tutor. Given a Hebrew verb, pronoun, tense, and binyan, generate a short English sentence (8–14 words) with a blank (___) where the conjugated Hebrew verb should go. Also provide the correct Hebrew conjugation for that blank.

Rules:
- The sentence must make the pronoun and tense clear from context
- Use filler nouns from the provided list when possible
- The blank must be exactly ___ (three underscores)
- Return valid JSON only, no extra text: { "prompt": "...", "hebrewCue": "...", "expectedAnswer": "..." }
- hebrewCue is a short Hebrew instruction naming the pronoun, e.g. "השתמש ב־הוא" or "השתמשי ב־את"
- expectedAnswer is the correctly conjugated Hebrew verb form, written without nikud`;

export function buildGenerateUserPrompt(
  verb: Verb,
  pronoun: Pronoun,
  tense: Tense,
  nouns: Noun[],
): string {
  const pronounInfo = PRONOUN_LABELS[pronoun];
  const tenseLabel = TENSE_LABELS[tense];
  const binyanLabel = BINYAN_LABELS[verb.binyan];
  const nounList = nouns.map((n) => `${n.hebrew} (${n.english})`).join(', ');

  return `Verb: ${verb.hebrew} (${verb.english}), root: ${verb.root || 'unknown'}, binyan: ${binyanLabel}
Pronoun: ${pronounInfo.hebrew} — ${pronounInfo.english}
Tense: ${tenseLabel}
Filler nouns: ${nounList || 'use any common Hebrew nouns'}

Generate the practice sentence.`;
}

export const GRADE_SYSTEM_PROMPT = `You are a Hebrew language grader. Compare the expected Hebrew verb conjugation with the user's spoken answer.

Rules:
- Strip nikud (vowel marks, Unicode range U+05B0–U+05C7) from both before comparing
- Accept the answer only if it matches the expected conjugation
- Do NOT accept a different tense, binyan, gender, or person
- Return valid JSON only, no extra text: { "correct": true } or { "correct": false, "correction": "..." }
- correction contains only the correct Hebrew form, nothing else`;

export function buildGradeUserPrompt(expectedAnswer: string, userAnswer: string): string {
  return `Expected: ${expectedAnswer}
User answered: ${userAnswer}

Is the answer correct?`;
}
