import Anthropic from '@anthropic-ai/sdk';
import { buildConjugationUserPrompt, buildTemplateUserPrompt, CONJUGATION_SYSTEM_PROMPT, TEMPLATE_SYSTEM_PROMPT } from '@/lib/prompts';
import { ConjugationTable, Verb, VerbTemplates } from '@/types';

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
- Words that are verbs/infinitives ("to ...") go in "verbs"
- All other words (nouns, adjectives, phrases) go in "nouns"
- For "binyan", guess from the verb form — default to "paal" if unsure
- For "root", leave empty string "" if you cannot determine it
- Include every Hebrew word you find
- Return only the JSON object, nothing else`;

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
]);

const UNSUPPORTED_BINARY = new Set([
  'application/vnd.oasis.opendocument.text',       // .odt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                             // .doc
]);

function extToMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
    txt: 'text/plain', md: 'text/plain', csv: 'text/csv',
    json: 'application/json',
    odt: 'application/vnd.oasis.opendocument.text',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  const mimeType = file.type || extToMime(file.name);

  // Reject known unsupported binary formats upfront
  if (UNSUPPORTED_BINARY.has(mimeType)) {
    return Response.json(
      { error: `${file.name.split('.').pop()?.toUpperCase()} format is not directly supported. Please open the file in LibreOffice or Word and export it as PDF, then import the PDF.` },
      { status: 415 },
    );
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const isImage = SUPPORTED_IMAGE_TYPES.has(mimeType);
  const isPdf = mimeType === 'application/pdf';
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json';

  // Build content blocks depending on file type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fileBlock: any;

  if (isPdf) {
    fileBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  } else if (isImage) {
    fileBlock = {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64 },
    };
  } else if (isText) {
    const text = Buffer.from(buffer).toString('utf-8');
    fileBlock = { type: 'text', text: `File contents:\n\n${text}` };
  } else {
    return Response.json(
      { error: `Unsupported file type: ${mimeType}. Try PDF, image, or plain text files.` },
      { status: 415 },
    );
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            { type: 'text', text: PARSE_PROMPT },
          ],
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return Response.json({ error: 'Claude could not extract a word list from this file.' }, { status: 500 });
    }

    const lesson = JSON.parse(match[0]) as { name: string; verbs: Verb[]; nouns: unknown[] };

    // Generate conjugation tables and sentence templates for all verbs, in batches
    if (lesson.verbs?.length) {
      async function batchedCall<T>(
        verbs: Verb[],
        system: string,
        buildPrompt: (vs: Verb[]) => string,
        model: string,
        batchSize = 10,
      ): Promise<(T | undefined)[]> {
        const batches: Verb[][] = [];
        for (let i = 0; i < verbs.length; i += batchSize) {
          batches.push(verbs.slice(i, i + batchSize));
        }
        const results = await Promise.all(
          batches.map(async (batch): Promise<(T | undefined)[]> => {
            try {
              const msg = await client.messages.create({
                model,
                max_tokens: 8192,
                system,
                messages: [{ role: 'user', content: buildPrompt(batch) }],
              });
              const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
              const match = text.match(/\[[\s\S]*\]/);
              if (!match) return new Array(batch.length).fill(undefined);
              try {
                const parsed = JSON.parse(match[0]) as T[];
                // Pad to batch length so indices align across batches
                while (parsed.length < batch.length) parsed.push(undefined as unknown as T);
                return parsed;
              } catch {
                return new Array(batch.length).fill(undefined);
              }
            } catch {
              return new Array(batch.length).fill(undefined);
            }
          }),
        );
        return results.flat();
      }

      const [tables, templates] = await Promise.all([
        // Conjugations: use Opus for max grammar accuracy (one-time call per import)
        batchedCall<ConjugationTable>(lesson.verbs, CONJUGATION_SYSTEM_PROMPT, buildConjugationUserPrompt, 'claude-opus-4-6'),
        // Templates: Sonnet is plenty — natural sentences don't need Opus
        batchedCall<VerbTemplates>(lesson.verbs, TEMPLATE_SYSTEM_PROMPT, buildTemplateUserPrompt, 'claude-sonnet-4-6'),
      ]);

      lesson.verbs = lesson.verbs.map((v, i) => ({
        ...v,
        ...(tables[i] && { conjugations: tables[i] }),
        ...(templates[i] && { templates: templates[i] }),
      }));
    }

    return Response.json(lesson);
  } catch (err: unknown) {
    // Extract clean message from Anthropic SDK errors
    let msg = 'Unknown error calling Claude API';
    if (err instanceof Error) {
      try {
        // Anthropic errors often embed JSON in the message
        const parsed = JSON.parse(err.message);
        msg = parsed?.error?.message ?? err.message;
      } catch {
        msg = err.message;
      }
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
