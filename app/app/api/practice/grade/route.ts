import Anthropic from '@anthropic-ai/sdk';
import { buildGradeUserPrompt, GRADE_SYSTEM_PROMPT } from '@/lib/prompts';

const client = new Anthropic();

function stripNikud(s: string): string {
  return s.replace(/[\u05B0-\u05C7]/g, '').trim();
}

export async function POST(request: Request) {
  const { expectedAnswer, userAnswer } = await request.json();

  // Fast path: exact match after stripping nikud
  if (stripNikud(expectedAnswer) === stripNikud(userAnswer)) {
    return Response.json({ correct: true });
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    system: GRADE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGradeUserPrompt(expectedAnswer, userAnswer) }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return Response.json({ correct: false, correction: expectedAnswer });
  }

  return Response.json(JSON.parse(match[0]));
}
