# Hebrew Practice

A web app for practicing Hebrew verb conjugation out loud. You're shown a full
Hebrew sentence using one pronoun (and can hear it spoken); you restate it aloud
with a different pronoun. The app listens, checks your conjugation, and reads
back the correct answer.

- **Import your own vocabulary** — upload a file (PDF, image, text) or paste a
  free-form Hebrew word list. Claude parses it into verbs and nouns.
- **Everything is pre-generated at import time** — conjugation tables and sentence
  templates are built once, so practice has no per-question latency.
- **Speak and listen** — push-to-talk speech recognition (Web Speech API) plus
  natural spoken Hebrew via Google WaveNet text-to-speech.
- **Drills you control** — filter by verb, tense, and binyan; search your word list.
- **Forgiving grading** — accepts colloquial and ktiv-male spellings, but rejects
  genuinely wrong conjugations.

The app is a Next.js project living in the [`app/`](app/) directory.

## Requirements

- **Node.js 20+** (built and tested on Node 20)
- **An Anthropic API key** (required) — powers import, sentence generation, and grading
- **A Google Cloud Text-to-Speech API key** (optional) — enables spoken Hebrew
- A modern browser with Web Speech API support (**Chrome** recommended) for
  speech recognition

## Setup

```bash
git clone <your-repo-url>
cd HebrewPractice/app

# 1. Install dependencies
npm install

# 2. Configure your API keys
cp .env.local.example .env.local
# then edit .env.local and paste in your keys (see below)

# 3. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

### API keys

Edit `app/.env.local`:

| Variable             | Required | What it's for                                                        |
| -------------------- | -------- | -------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`  | Yes      | Lesson import, sentence generation, and answer grading (Claude).     |
| `GOOGLE_TTS_API_KEY` | No       | Spoken Hebrew (text-to-speech). App works without it; audio buttons just error. |

- **Anthropic key:** create one at
  <https://console.anthropic.com/settings/keys>.
- **Google TTS key:** in the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
  enable the **Cloud Text-to-Speech API**, then create a plain **API key**
  (not a service account). Optionally restrict it to the Text-to-Speech API.

> `.env.local` is git-ignored — your keys are never committed.

## Production build

```bash
cd app
npm run build   # compiles and type-checks
npm start       # serves the production build on http://localhost:3000
```

## Usage

1. **Create a lesson.** From the home page, go to **Manage lessons**. Add
   vocabulary either by:
   - **Uploading a file** — a PDF, image (photo of a textbook page), or text file
     containing a Hebrew word list. Claude reads it and extracts verbs and nouns.
   - **Pasting text** — click **Paste text…** and drop in a free-form Hebrew list
     (no particular format needed).

   Import runs once and pre-computes full conjugation tables and sentence
   templates for every verb, so it can take a few seconds for a large list.
   Lessons are stored in your browser's `localStorage`.

2. **Start practicing.** Pick a lesson and hit **Practice →**. You'll see a Hebrew
   sentence using one pronoun, with its English translation available on toggle.

3. **Listen.** Click the 🔊 speaker to hear the sentence (requires the Google TTS
   key). It auto-plays new sentences too.

4. **Answer out loud.** Press and hold the record button and say the sentence with
   the **target** pronoun, conjugating the verb correctly. Release to submit.
   - If you're right, you'll hear the correct pronunciation played back.
   - If you're wrong, you'll see a word-by-word diff of what you said vs. what was
     expected, and can record again immediately to retry.

5. **Move on.**
   - **Next pronoun** keeps the same sentence and tense, choosing a pronoun you
     haven't used yet.
   - **Next sentence** picks a new sentence with a randomized tense.

6. **Set up a drill (optional).** Use **Configure drill** on the practice screen to
   filter which verbs and tenses you practice, restrict to a specific binyan, or
   search your word list. You can reopen and change this mid-session.

## Notes & troubleshooting

- **Speech recognition** relies on the browser's Web Speech API. It works best in
  Chrome; some browsers don't support Hebrew recognition at all.
- **No sound?** Check that `GOOGLE_TTS_API_KEY` is set and the Cloud
  Text-to-Speech API is enabled for that key.
- See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design and data-flow overview.
