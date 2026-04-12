import Anthropic from '@anthropic-ai/sdk';
import { buildGenerateUserPrompt, GENERATE_SYSTEM_PROMPT } from '@/lib/prompts';
import { QueueItem } from '@/types';

const client = new Anthropic();

export async function POST(request: Request) {
  const body: QueueItem = await request.json();
  const { verb, pronoun, tense, nouns } = body;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system: GENERATE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildGenerateUserPrompt(verb, pronoun, tense, nouns) }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return Response.json({ error: 'Invalid LLM response' }, { status: 500 });
  }

  return Response.json(JSON.parse(match[0]));
}
