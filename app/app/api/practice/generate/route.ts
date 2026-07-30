import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages';
import { buildGenerateUserPrompt, buildNextPronounUserPrompt, GENERATE_SYSTEM_PROMPT, NEXT_PRONOUN_SYSTEM_PROMPT } from '@/lib/prompts';
import { QueueItem } from '@/types';

const client = new Anthropic();

function stripNikud(s: string): string {
  return s.replace(/[\u0591-\u05C7]/g, '').trim();
}

export async function POST(request: Request) {
  const body: QueueItem & { baseSentence?: string } = await request.json();
  const { verb, sourcePronoun, targetPronoun, tense, nouns, baseSentence } = body;

  // Look up pre-computed conjugated forms (with nikud) if available
  const sourceForm = verb.conjugations?.[tense]?.[sourcePronoun];
  const targetForm = verb.conjugations?.[tense]?.[targetPronoun];

  const isNextPronoun = !!baseSentence;
  const systemPrompt = isNextPronoun ? NEXT_PRONOUN_SYSTEM_PROMPT : GENERATE_SYSTEM_PROMPT;
  const userPrompt = isNextPronoun
    ? buildNextPronounUserPrompt(baseSentence, targetPronoun, targetForm)
    : buildGenerateUserPrompt(verb, sourcePronoun, targetPronoun, tense, nouns, sourceForm, targetForm);

  async function callClaude(attempt = 0): Promise<Message> {
    try {
      return await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
    } catch (e: unknown) {
      const status = (e as { status?: number })?.status;
      // Retry on 429 (rate limit) and 5xx with exponential backoff, up to 3 attempts
      if (attempt < 2 && (status === 429 || (status && status >= 500))) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        return callClaude(attempt + 1);
      }
      throw e;
    }
  }

  try {
    const message = await callClaude();

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: 'Invalid LLM response' }, { status: 500 });
    }

    const data = JSON.parse(match[0]);
    // Always strip nikud from expectedAnswer (pre-computed forms have nikud)
    if (data.expectedAnswer) data.expectedAnswer = stripNikud(data.expectedAnswer);
    return Response.json(data);
  } catch (err: unknown) {
    let msg = 'Unknown error calling Claude API';
    if (err instanceof Error) {
      try { msg = JSON.parse(err.message)?.error?.message ?? err.message; } catch { msg = err.message; }
    }
    console.error('[generate] error:', msg, err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
