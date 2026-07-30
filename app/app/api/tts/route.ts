const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export async function POST(request: Request) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'GOOGLE_TTS_API_KEY not configured' }, { status: 503 });
  }

  const { text } = await request.json();
  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

  // Strip cantillation marks (U+0591–U+05AF) — they're for Torah/biblical reading and
  // confuse Google TTS into spelling words letter-by-letter. Keep nikud (U+05B0–U+05C7).
  const cleanText = text.replace(/[֑-֯]/g, '');
  console.log('[TTS] sending:', cleanText);

  const res = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: cleanText },
      voice: { languageCode: 'he-IL', name: 'he-IL-Wavenet-D' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.85 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return Response.json(
      { error: err?.error?.message ?? 'Google TTS request failed' },
      { status: res.status },
    );
  }

  const { audioContent } = await res.json();
  const audio = Buffer.from(audioContent, 'base64');
  return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg' } });
}
