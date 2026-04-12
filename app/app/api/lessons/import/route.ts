import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const PARSE_PROMPT = `This document contains a Hebrew vocabulary list. Extract all Hebrew words and their English translations.

Return ONLY valid JSON in this exact format, no other text:
{
  "name": "lesson name if you can detect one, otherwise 'Imported Lesson'",
  "verbs": [
    { "hebrew": "לכתוב", "english": "to write", "root": "כ-ת-ב", "binyan": "paal" }
  ],
  "nouns": [
    { "hebrew": "בית", "english": "house" }
  ]
}

Rules:
- Words that are verbs (infinitives, action words translated as "to ...") go in "verbs"
- All other words (nouns, adjectives, etc.) go in "nouns"
- For "binyan", guess from the verb form — default to "paal" if unsure
- For "root", leave empty string "" if you cannot determine it
- Include every Hebrew word you find, do not skip any
- Return only the JSON object, nothing else`;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Upload file to Anthropic Files API
  const uploaded = await client.beta.files.upload({ file });

  // Ask Claude to extract the vocabulary
  const message = await client.beta.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'file', file_id: uploaded.id },
          } as never,
          {
            type: 'text',
            text: PARSE_PROMPT,
          },
        ],
      },
    ],
  } as never);

  // Clean up the uploaded file
  await client.beta.files.delete(uploaded.id).catch(() => {});

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return Response.json({ error: 'Could not parse document' }, { status: 500 });
  }

  return Response.json(JSON.parse(match[0]));
}
