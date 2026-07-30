import { BINYAN_LABELS, Noun, PRONOUN_LABELS, Pronoun, Tense, TENSE_LABELS, Verb } from '@/types';

// ---------------------------------------------------------------------------
// Conjugation table generation (called once at import time)
// ---------------------------------------------------------------------------

export const CONJUGATION_SYSTEM_PROMPT = `You are a Hebrew grammar expert.
Generate complete conjugation tables for a list of Hebrew verbs.
Include full nikud (vowel marks) on every form — required for correct TTS pronunciation.

Return a JSON array — one object per verb, in the SAME ORDER as the input:
[
  {
    "past":       { "ani":"", "ata":"", "at":"", "hu":"", "hi":"", "anachnu":"", "atem":"", "aten":"", "hem":"", "hen":"" },
    "present":    { "ani":"", "ata":"", "at":"", "hu":"", "hi":"", "anachnu":"", "atem":"", "aten":"", "hem":"", "hen":"" },
    "future":     { "ani":"", "ata":"", "at":"", "hu":"", "hi":"", "anachnu":"", "atem":"", "aten":"", "hem":"", "hen":"" },
    "imperative": { "ata":"", "at":"", "atem":"", "aten":"" }
  }
]

GRAMMAR RULES:
- Present tense shares forms by gender/number: ani/ata/hu → masc.sg; at/hi → fem.sg;
  anachnu/atem/hem → masc.pl; aten/hen → fem.pl
- Future tense prefix patterns:
    ani → אֶ-/אֲ-      ata → תִּ-/תְּ-      at → תִּ-/תְּ-...-ִי
    hu → יִ-/יְ-       hi → תִּ-/תְּ-       anachnu → נִ-/נְ-
    atem → תִּ-/תְּ-...-וּ     aten → תִּ-/תְּ-...-וּ (modern colloquial)
    hem → יִ-/יְ-...-וּ        hen → יִ-/יְ-...-וּ (modern colloquial; same as hem)
- For Pi'el future, use the מ-prefix forms (e.g., יְתַקֵּן for hu, יְתַקְּנוּ for hem/hen)
- IMPORTANT: modern Hebrew uses hem=hen for future tense (both end in -וּ). The literary -נָה ending is archaic and should NOT be used.
- Imperative has only 2nd-person forms: ata, at, atem, aten

Return ONLY the JSON array, no other text.`;

export function buildConjugationUserPrompt(verbs: Verb[]): string {
  const list = verbs
    .map((v, i) => `${i + 1}. ${v.hebrew} (${v.english}), root: ${v.root || 'unknown'}, binyan: ${BINYAN_LABELS[v.binyan]}`)
    .join('\n');
  return `Generate conjugation tables for these ${verbs.length} verbs:\n\n${list}`;
}

// ---------------------------------------------------------------------------
// Sentence template generation (called once at import time, after conjugations)
// ---------------------------------------------------------------------------

export const TEMPLATE_SYSTEM_PROMPT = `You are a Hebrew language tutor.
For each verb, write ONE natural Hebrew sentence template per tense (past, present, future, imperative).
Each template uses {P} for the subject pronoun and {V} for the conjugated verb — these placeholders are replaced later with different pronouns/forms during practice.

CRITICAL RULES:
- Use EXACTLY {P} (subject pronoun placeholder) and {V} (verb placeholder)
- The sentence must contain ONLY ONE conjugated verb — the one represented by {V}
- DO NOT include any secondary clauses with other conjugated verbs (no "before he left", "while she ate", "when they arrived", etc.)
- Infinitives (לקרוא, ללכת) are allowed; gerunds and other conjugated verbs are NOT
- DO NOT use possessive pronoun suffixes that imply a specific person (לחבריו "his friends", בביתה "her house", שלי "mine", etc.). The template must work naturally for any subject pronoun. Use definite articles instead (לחברים, בבית).
- DO NOT use any other pronoun or pronoun-derived word besides {P} (avoid אותו, אותה, אצלו, איתה, עליהם, etc.)
- Sentence length: 5–9 words including placeholders
- Use simple, natural Hebrew that makes sense for any pronoun substitution
- Include full nikud on every word EXCEPT the placeholders {P} and {V}
- For imperative: omit {P} (commands have no explicit subject)

Return a JSON array — one object per verb, in the SAME ORDER as the input:
[
  {
    "past":       { "template": "...", "templateNikud": "...", "englishTemplate": "..." },
    "present":    { "template": "...", "templateNikud": "...", "englishTemplate": "..." },
    "future":     { "template": "...", "templateNikud": "...", "englishTemplate": "..." },
    "imperative": { "template": "...", "templateNikud": "...", "englishTemplate": "..." }
  }
]

Example for the verb לקרוא (to read):
{
  "past":       { "template": "{P} {V} את הספר אתמול בערב", "templateNikud": "{P} {V} אֶת הַסֵּפֶר אֶתְמוֹל בָּעֶרֶב", "englishTemplate": "{P} read the book yesterday evening" },
  "present":    { "template": "{P} {V} את הספר עכשיו", "templateNikud": "{P} {V} אֶת הַסֵּפֶר עַכְשָׁו", "englishTemplate": "{P} read the book now" },
  "future":     { "template": "{P} {V} את הספר מחר", "templateNikud": "{P} {V} אֶת הַסֵּפֶר מָחָר", "englishTemplate": "{P} will read the book tomorrow" },
  "imperative": { "template": "{V} את הספר עכשיו", "templateNikud": "{V} אֶת הַסֵּפֶר עַכְשָׁו", "englishTemplate": "Read the book now" }
}

Return ONLY the JSON array, no other text.`;

export function buildTemplateUserPrompt(verbs: Verb[]): string {
  const list = verbs
    .map((v, i) => `${i + 1}. ${v.hebrew} (${v.english}), root: ${v.root || 'unknown'}, binyan: ${BINYAN_LABELS[v.binyan]}`)
    .join('\n');
  return `Generate sentence templates for these ${verbs.length} verbs:\n\n${list}`;
}

// ---------------------------------------------------------------------------
// Sentence generation (per queue item, during practice — fallback when no template)
// ---------------------------------------------------------------------------

export const GENERATE_SYSTEM_PROMPT = `You are a Hebrew language tutor creating sentence-rewriting drills.

You receive a pre-conjugated Hebrew verb form for the source and target pronouns.
These forms are GUARANTEED CORRECT — use them exactly as provided, do not alter them.

1. Write a natural Hebrew sentence (8–12 words) using the SOURCE verb form exactly as provided
2. Rewrite the same sentence using the TARGET verb form — change only the verb (and the explicit pronoun if present), keep every other word identical
3. Write the original sentence again with full nikud for TTS
4. Provide an English translation of the original sentence

Return valid JSON only, no extra text:
{
  "originalSentence": "הם הצליחו לסיים את העבודה בזמן",
  "originalSentenceNikud": "הֵם הִצְלִיחוּ לְסַיֵּם אֶת הָעֲבוֹדָה בִּזְמַן",
  "originalSentenceEnglish": "They managed to finish the work on time",
  "expectedSentence": "אני הצלחתי לסיים את העבודה בזמן",
  "expectedAnswer": "הצלחתי"
}

Rules:
- Use the provided verb forms EXACTLY — do NOT re-conjugate or change them
- Keep every word identical between originalSentence and expectedSentence except the verb (and explicit pronoun)
- Write natural, idiomatic Hebrew — pick any common vocabulary that makes the sentence flow well
- originalSentence and expectedSentence: no nikud; originalSentenceNikud: full nikud
- expectedAnswer: target verb form stripped of nikud`;

export function buildGenerateUserPrompt(
  verb: Verb,
  sourcePronoun: Pronoun,
  targetPronoun: Pronoun,
  tense: Tense,
  nouns: Noun[],
  sourceForm?: string,
  targetForm?: string,
): string {
  const src = PRONOUN_LABELS[sourcePronoun];
  const tgt = PRONOUN_LABELS[targetPronoun];
  const tenseLabel = TENSE_LABELS[tense];
  const binyanLabel = BINYAN_LABELS[verb.binyan];

  const srcLine = sourceForm
    ? `Source pronoun: ${src.hebrew} (${src.english}) — use this exact verb form: ${sourceForm}`
    : `Source pronoun: ${src.hebrew} (${src.english})`;
  const tgtLine = targetForm
    ? `Target pronoun: ${tgt.hebrew} (${tgt.english}) — use this exact verb form: ${targetForm}`
    : `Target pronoun: ${tgt.hebrew} (${tgt.english})`;

  void nouns; // intentionally not used — let the LLM choose natural vocabulary

  return `Verb: ${verb.hebrew} (${verb.english}), binyan: ${binyanLabel}
Tense: ${tenseLabel}
${srcLine}
${tgtLine}

Generate the drill.`;
}

// ---------------------------------------------------------------------------
// Next-pronoun variant (same sentence context, new target pronoun)
// ---------------------------------------------------------------------------

export const NEXT_PRONOUN_SYSTEM_PROMPT = `You are a Hebrew language tutor.

You are given an existing Hebrew sentence and a new target pronoun with its pre-conjugated verb form.
Rewrite the sentence using the target verb form exactly as provided — change only the verb (and explicit pronoun if present). Keep every other word identical.
Also provide the original sentence with full nikud for TTS.

Return valid JSON only, no extra text:
{
  "originalSentence": "<the input sentence unchanged, no nikud>",
  "originalSentenceNikud": "<the input sentence with full nikud added>",
  "originalSentenceEnglish": "<English translation of the original sentence>",
  "expectedSentence": "<rewritten with target pronoun, no nikud>",
  "expectedAnswer": "<target verb form, no nikud>"
}`;

export function buildNextPronounUserPrompt(
  baseSentence: string,
  targetPronoun: Pronoun,
  targetForm?: string,
): string {
  const tgt = PRONOUN_LABELS[targetPronoun];
  const tgtLine = targetForm
    ? `Target pronoun: ${tgt.hebrew} (${tgt.english}) — use this exact verb form: ${targetForm}`
    : `Target pronoun: ${tgt.hebrew} (${tgt.english})`;
  return `Existing sentence: ${baseSentence}
${tgtLine}

Rewrite the sentence.`;
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export const GRADE_SYSTEM_PROMPT = `You are a Hebrew language grader.

The student was shown a Hebrew sentence and asked to restate it using a different pronoun.
Check whether the student's spoken answer correctly conjugated the verb for the target pronoun.

Grading rules:
- The verb conjugation must be correct for the target pronoun, tense, and binyan
- DIFFERENT tense/pronoun = INCORRECT (e.g., "כתב" past is NOT the same as "כותב" present)
- Strip nikud before comparing
- Accept BOTH ktiv male AND ktiv chaser spellings of the SAME conjugation. Modern Hebrew speech often adds a yod after a chirik (i-vowel) or vav after a cholam (o-vowel) — these added letters are matres lectionis and the word is identical. Specifically accept:
    * Pi'el past forms: "דיברתם" = "דברתם", "סיפרתי" = "ספרתי", "ניקיתם" = "נקיתם", "טיפלתי" = "טפלתי"
    * Pi'el present: "מדבר" = "מדבר" (no variation), "מנקה" = "מנקה"
    * Pa'al present m.sg.: "כותב" = "כתב" (cholam → ktiv chaser drops vav)
    * Any case where the only difference is an internal yod or vav that corresponds to a chirik or cholam in the same conjugation
- But: do NOT accept across DIFFERENT conjugations even if they look similar (e.g., "כתב" past ≠ "כותב" present)
- Ignore minor word-order or filler-word differences
- If the student used a synonym verb with the correct conjugation pattern, accept

Return ONLY valid JSON — no commentary, no explanation, no extra text:
{ "correct": true }
or
{ "correct": false, "correction": "the full correct sentence in Hebrew, nothing else" }

The "correction" field must contain ONLY the correct Hebrew sentence — no English, no explanations.`;

export function buildGradeUserPrompt(
  expectedSentence: string,
  expectedAnswer: string,
  userAnswer: string,
): string {
  return `Expected sentence: ${expectedSentence}
Expected verb form: ${expectedAnswer}
Student said: ${userAnswer}

Did the student use the correct verb conjugation?`;
}
