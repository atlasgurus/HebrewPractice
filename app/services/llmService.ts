import { PracticeItem, PRONOUN_LABELS, Pronoun, QueueItem } from '@/types';

function stripNikud(s: string): string {
  // Covers nikud (U+05B0–U+05C7) + cantillation marks (U+0591–U+05AF)
  return s.replace(/[֑-ׇ]/g, '').trim();
}

// Try to build the practice item locally from pre-computed templates + conjugations.
// Returns null if data is missing — caller should fall back to the LLM.
export function tryBuildPracticeItem(item: QueueItem): PracticeItem | null {
  const { verb, sourcePronoun, targetPronoun, tense } = item;
  const template = verb.templates?.[tense];
  const conjugations = verb.conjugations?.[tense];
  if (!template || !conjugations) return null;

  const sourceFormNikud = conjugations[sourcePronoun];
  const targetFormNikud = conjugations[targetPronoun];
  if (!sourceFormNikud || !targetFormNikud) return null;

  const src = PRONOUN_LABELS[sourcePronoun];
  const tgt = PRONOUN_LABELS[targetPronoun];
  const sourceForm = stripNikud(sourceFormNikud);
  const targetForm = stripNikud(targetFormNikud);

  const subst = (tpl: string, p: string, v: string) =>
    tpl.replace('{P}', p).replace('{V}', v).replace(/\s+/g, ' ').trim();

  // The no-nikud outputs get an extra stripNikud pass as a safety net in case
  // the LLM accidentally leaked nikud chars into the supposedly-clean template
  return {
    ...item,
    originalSentence:        stripNikud(subst(template.template,        src.hebrew,      sourceForm)),
    originalSentenceNikud:   subst(template.templateNikud,   src.hebrewNikud, sourceFormNikud),
    originalSentenceEnglish: subst(template.englishTemplate, src.englishWord, verb.english.replace(/^to /, '')),
    expectedSentence:        stripNikud(subst(template.template,      tgt.hebrew,      targetForm)),
    expectedSentenceNikud:   subst(template.templateNikud, tgt.hebrewNikud, targetFormNikud),
    expectedAnswer:          stripNikud(targetForm),
  };
}

export async function generatePrompt(item: QueueItem): Promise<PracticeItem> {
  // Fast path: build from template + conjugation table — no LLM call
  const local = tryBuildPracticeItem(item);
  if (local) return local;

  const res = await fetch('/api/practice/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to generate prompt');
  }
  const data = await res.json();
  // Fallback for older LLM responses that don't include expectedSentenceNikud
  if (!data.expectedSentenceNikud) data.expectedSentenceNikud = data.expectedSentence ?? '';
  return { ...item, ...data };
}

export async function generateNextPronoun(
  baseSentence: string,
  currentItem: QueueItem,
  targetPronoun: Pronoun,
): Promise<PracticeItem> {
  const nextItem: QueueItem = { ...currentItem, sourcePronoun: currentItem.targetPronoun, targetPronoun };

  // Fast path: build from template — keeps the same sentence skeleton, swaps in new pronoun + form
  const local = tryBuildPracticeItem(nextItem);
  if (local) return local;

  const res = await fetch('/api/practice/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...nextItem, baseSentence }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to generate next pronoun');
  }
  const data = await res.json();
  if (!data.expectedSentenceNikud) data.expectedSentenceNikud = data.expectedSentence ?? '';
  return { ...nextItem, ...data };
}

export async function gradeAnswer(
  item: PracticeItem,
  userAnswer: string,
): Promise<{ correct: boolean; correction?: string }> {
  // Build the list of accepted verb forms.
  const accepted: string[] = [item.expectedAnswer];
  const conj = item.verb.conjugations?.[item.tense];

  // Imperative: also accept future-tense form (colloquial Hebrew uses future-as-imperative)
  if (item.tense === 'imperative') {
    const futureForm = item.verb.conjugations?.future?.[item.targetPronoun];
    if (futureForm) accepted.push(stripNikud(futureForm));
  }

  // Plural masc/fem pronouns sound nearly identical (ם vs ן) — Google STT often
  // confuses them. Accept the other-gender form so the user isn't punished for STT errors.
  const swap: Partial<Record<typeof item.targetPronoun, typeof item.targetPronoun>> = {
    hem: 'hen', hen: 'hem',
    atem: 'aten', aten: 'atem',
  };
  const altPronoun = swap[item.targetPronoun];
  if (altPronoun && conj?.[altPronoun]) {
    accepted.push(stripNikud(conj[altPronoun]!));
  }

  const res = await fetch('/api/practice/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expectedSentence: item.expectedSentence,
      expectedAnswer: item.expectedAnswer,
      acceptedAnswers: accepted,
      userAnswer,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? 'Failed to grade answer');
  }
  return res.json();
}
