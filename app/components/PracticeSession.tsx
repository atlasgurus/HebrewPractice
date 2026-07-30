'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { BINYAN_LABELS, PRONOUN_LABELS, TENSE_LABELS } from '@/types';
import { buildQueue } from '@/services/sessionService';
import { lessonService } from '@/services/lessonService';
import SpeechInput from '@/components/SpeechInput';
import DrillSetupModal from '@/components/DrillSetupModal';

import type { Tense, Lesson } from '@/types';

interface Props {
  lessonId: string;
}

function stripNikud(s: string) {
  return s.replace(/[\u0591-\u05C7]/g, '').trim();
}

// Returns arrays of {word, wrong} for user answer and expected sentence
function diffWords(userAnswer: string, expected: string) {
  const uWords = stripNikud(userAnswer).split(/\s+/);
  const eWords = stripNikud(expected).split(/\s+/);
  const len = Math.max(uWords.length, eWords.length);
  const user = Array.from({ length: len }, (_, i) => ({
    word: uWords[i] ?? '',
    wrong: (uWords[i] ?? '') !== (eWords[i] ?? ''),
  }));
  const exp = Array.from({ length: len }, (_, i) => ({
    word: eWords[i] ?? '',
    different: (uWords[i] ?? '') !== (eWords[i] ?? ''),
  }));
  return { user, exp };
}

let currentAudio: HTMLAudioElement | null = null;

async function speakHebrew(text: string) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.play();
    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; };
  } catch { /* silently ignore */ }
}

export default function PracticeSession({ lessonId }: Props) {
  const router = useRouter();
  const store = useSessionStore();
  const spokenSentenceRef = useRef<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [selectedVerbs, setSelectedVerbs] = useState<string[]>([]); // [] = all
  const [selectedTenses, setSelectedTenses] = useState<Tense[]>([]); // [] = all
  const [drillSetupOpen, setDrillSetupOpen] = useState(false);

  useEffect(() => {
    const l = lessonService.getById(lessonId);
    if (!l) { router.push('/lessons'); return; }
    setLesson(l);
    store.startSession(buildQueue(l, {}), l.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  function applyFilters(verbs: string[], tenses: Tense[]) {
    if (!lesson) return;
    setSelectedVerbs(verbs);
    setSelectedTenses(tenses);
    store.startSession(
      buildQueue(lesson, { verbHebrews: verbs, tenses }),
      lesson.name,
    );
  }

  useEffect(() => {
    if (store.status === 'ready' && store.currentItem) {
      const sentence = store.currentItem.originalSentence;
      if (sentence !== spokenSentenceRef.current) {
        spokenSentenceRef.current = sentence;
        setShowTranslation(false);
        speakHebrew(store.currentItem.originalSentenceNikud || sentence);
      }
    }
    // After grading, auto-play the expected sentence as pronunciation feedback
    if (store.status === 'result' && store.currentItem) {
      speakHebrew(store.currentItem.expectedSentenceNikud || store.currentItem.expectedSentence);
    }
  }, [store.status, store.currentItem]);

  const { status, currentItem, currentIndex, queue, results, error, lessonName } = store;
  const total = queue.length;
  const lastResult = results[results.length - 1];

  if (status === 'idle' && !error) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  if (status === 'complete') {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className="flex flex-col items-center gap-6 py-12 px-4 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800">Session Complete!</h2>
        <p className="text-5xl font-bold text-blue-600">{correct}/{total}</p>
        <p className="text-gray-500">correct</p>
        <div className="w-full divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white">
              <span className="text-lg mt-0.5">{r.correct ? '✓' : '✗'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500">
                  {r.item.verb.hebrew} · {TENSE_LABELS[r.item.tense]} · {PRONOUN_LABELS[r.item.targetPronoun].hebrew}
                </p>
                <p className="text-sm mt-0.5" dir="rtl">
                  {r.correct
                    ? <span className="text-green-700">{r.item.expectedSentence}</span>
                    : <><span className="text-red-500 line-through">{r.userAnswer}</span>
                       <span className="text-gray-700 ml-2">← {r.item.expectedSentence}</span></>
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { store.reset(); router.push('/'); }}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            Home
          </button>
          <button onClick={() => applyFilters(selectedVerbs, selectedTenses)}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Practice Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button onClick={() => { store.reset(); router.push('/'); }}
          className="text-sm text-gray-400 hover:text-gray-600">← Exit</button>
        <span className="text-sm text-gray-500 font-medium">{lessonName}</span>
        <span className="text-sm text-gray-400">{status !== 'idle' ? `${currentIndex + 1} / ${total}` : ''}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: total ? `${(currentIndex / total) * 100}%` : '0%' }} />
      </div>

      {/* Drill setup bar */}
      {lesson && (
        <div className="w-full flex items-center justify-between gap-2 text-sm">
          <span className="text-xs text-gray-500">
            {selectedVerbs.length === 0 ? `All ${lesson.verbs.length} verbs` : `${selectedVerbs.length} verb${selectedVerbs.length === 1 ? '' : 's'}`}
            <span className="text-gray-300 mx-1">·</span>
            {selectedTenses.length === 0 ? 'All tenses' : selectedTenses.map((t) => TENSE_LABELS[t]).join(', ')}
          </span>
          <button
            onClick={() => setDrillSetupOpen(true)}
            className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:bg-gray-50"
          >
            Configure drill
          </button>
        </div>
      )}

      {drillSetupOpen && lesson && (
        <DrillSetupModal
          verbs={lesson.verbs}
          initialVerbs={selectedVerbs}
          initialTenses={selectedTenses}
          onCancel={() => setDrillSetupOpen(false)}
          onApply={(verbs, tenses) => {
            setDrillSetupOpen(false);
            applyFilters(verbs, tenses);
          }}
        />
      )}

      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between gap-3">
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={() => store.retryGenerate()}
            className="px-3 py-1 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'generating' && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating question…</p>
        </div>
      )}

      {currentItem && status !== 'generating' && (
        <>
          {/* Verb + tense header */}
          <div className="w-full text-center pb-1 border-b border-gray-100">
            <span className="font-bold text-gray-800 text-lg" dir="rtl">{currentItem.verb.hebrew}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-gray-600">{currentItem.verb.english}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-teal-600 font-medium">{TENSE_LABELS[currentItem.tense]}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-indigo-500 text-sm">{BINYAN_LABELS[currentItem.verb.binyan]}</span>
          </div>

          {/* Original sentence */}
          <div className="w-full rounded-xl bg-gray-50 border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Original sentence</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTranslation((v) => !v)}
                  title={showTranslation ? 'Hide translation' : 'Show translation'}
                  className="px-2.5 py-1 rounded-md bg-white border border-gray-300 text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
                >
                  {showTranslation ? 'Hide translation' : 'Translate'}
                </button>
                <button
                  onClick={() => speakHebrew(currentItem.originalSentenceNikud || currentItem.originalSentence)}
                  title="Read aloud"
                  className="text-gray-400 hover:text-blue-500 transition-colors text-lg leading-none"
                >
                  🔊
                </button>
              </div>
            </div>
            <p className="text-xl text-gray-800 leading-relaxed text-right" dir="rtl">
              {currentItem.originalSentence}
            </p>
            {showTranslation && currentItem.originalSentenceEnglish && (
              <p className="text-sm text-gray-500 italic mt-2 text-left">
                {currentItem.originalSentenceEnglish}
              </p>
            )}
          </div>

          {/* Arrow + target pronoun */}
          <div className="flex items-center gap-3 text-lg">
            <span className="text-gray-400">→</span>
            <span className="text-gray-600">Rewrite using:</span>
            <span className="font-bold text-blue-600" dir="rtl">
              {PRONOUN_LABELS[currentItem.targetPronoun].hebrew}
            </span>
            <span className="text-gray-500">
              ({PRONOUN_LABELS[currentItem.targetPronoun].english})
            </span>
          </div>

          {/* Result feedback */}
          {status === 'result' && lastResult && (
            <div className={`w-full rounded-xl p-4 ${
              lastResult.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {lastResult.correct ? (
                <div className="text-center">
                  <p className="text-green-700 font-semibold text-lg mb-1">✓ Correct!</p>
                  <p className="text-green-800 text-lg" dir="rtl">{currentItem.expectedSentence}</p>
                </div>
              ) : (() => {
                const correct = lastResult.correction ?? currentItem.expectedSentence;
                const { user, exp } = diffWords(lastResult.userAnswer, correct);
                return (
                  <div className="space-y-3">
                    <p className="text-red-600 font-semibold text-center">✗ Incorrect</p>

                    <div>
                      <p className="text-xs text-gray-400 mb-1 text-right">You said</p>
                      <p className="text-lg leading-relaxed text-right" dir="rtl">
                        {user.map((w, i) => (
                          <span key={i}>
                            {i > 0 ? ' ' : ''}
                            <span className={w.wrong ? 'bg-red-200 text-red-800 rounded px-0.5' : ''}>
                              {w.word}
                            </span>
                          </span>
                        ))}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 mb-1 text-right">Expected</p>
                      <p className="text-lg font-medium leading-relaxed text-right" dir="rtl">
                        {exp.map((w, i) => (
                          <span key={i}>
                            {i > 0 ? ' ' : ''}
                            <span className={w.different ? 'bg-green-200 text-green-800 rounded px-0.5' : ''}>
                              {w.word}
                            </span>
                          </span>
                        ))}
                      </p>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}

          {status === 'grading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Checking…
            </div>
          )}

          <SpeechInput
            onTranscript={(text) => store.submitAnswer(text)}
            disabled={status === 'grading'}
          />

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => store.nextPronoun()}
              disabled={status === 'grading'}
              className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 font-medium hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Next pronoun
            </button>
            <button
              onClick={() => store.advance()}
              disabled={status === 'grading'}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Next sentence
            </button>
          </div>
        </>
      )}
    </div>
  );
}
