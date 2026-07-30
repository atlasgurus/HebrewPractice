import Anthropic from '@anthropic-ai/sdk';
import { buildGradeUserPrompt, GRADE_SYSTEM_PROMPT } from '@/lib/prompts';

const client = new Anthropic();

function stripNikud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '').trim();
}

// Normalize for comparison: strip nikud, collapse whitespace, remove punctuation
function normalize(s: string): string {
  return stripNikud(s)
    .replace(/[.,!?;:'"\u05F4\u05F3]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}


export async function POST(request: Request) {
  const { expectedSentence, expectedAnswer, acceptedAnswers, userAnswer } = await request.json();

  const userNorm = normalize(userAnswer);
  const sentNorm = normalize(expectedSentence);
  // All accepted verb forms (primary + colloquial alternatives like future-as-imperative)
  const acceptedNorms: string[] = Array.from(
    new Set([expectedAnswer, ...(acceptedAnswers ?? [])].filter(Boolean).map(normalize)),
  );

  // Fast path 1: user said the entire expected sentence
  if (userNorm === sentNorm) {
    return Response.json({ correct: true });
  }
  // Fast path 2: user said exactly one of the accepted verb forms (short answer)
  if (acceptedNorms.includes(userNorm)) {
    return Response.json({ correct: true });
  }
  // Fast path 3: user said one of the accepted verb forms somewhere in their sentence
  const userWords = userNorm.split(/\s+/);
  if (acceptedNorms.some((a) => a && userWords.includes(a))) {
    return Response.json({ correct: true });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: GRADE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildGradeUserPrompt(expectedSentence, expectedAnswer, userAnswer) }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ correct: false, correction: expectedSentence });
    }

    return Response.json(JSON.parse(match[0]));
  } catch (err: unknown) {
    let msg = 'Unknown error calling Claude API';
    if (err instanceof Error) {
      try { msg = JSON.parse(err.message)?.error?.message ?? err.message; } catch { msg = err.message; }
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
