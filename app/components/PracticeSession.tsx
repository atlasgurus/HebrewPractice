'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { BINYAN_LABELS, PRONOUN_LABELS, TENSE_LABELS } from '@/types';
import { buildQueue } from '@/services/sessionService';
import { lessonService } from '@/services/lessonService';
import SpeechInput from '@/components/SpeechInput';

interface Props {
  lessonId: string;
}

export default function PracticeSession({ lessonId }: Props) {
  const router = useRouter();
  const store = useSessionStore();
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start session on mount
  useEffect(() => {
    const lesson = lessonService.getById(lessonId);
    if (!lesson) {
      router.push('/lessons');
      return;
    }
    const queue = buildQueue(lesson);
    store.startSession(queue, lesson.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Auto-advance 2s after result
  useEffect(() => {
    if (store.status === 'result') {
      autoAdvanceRef.current = setTimeout(() => store.advance(), 2000);
    }
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, [store.status, store]);

  const { status, currentItem, currentIndex, queue, results, error, lessonName } = store;
  const total = queue.length;
  const lastResult = results[results.length - 1];

  if (status === 'idle' && !error) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  if (status === 'complete') {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className="flex flex-col items-center gap-6 py-12 px-4 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-800">Session Complete!</h2>
        <p className="text-5xl font-bold text-blue-600">{correct}/{total}</p>
        <p className="text-gray-500">questions answered correctly</p>
        <div className="w-full divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white">
              <span className="text-lg">{r.correct ? '✓' : '✗'}</span>
              <span className="text-sm text-gray-500 flex-1">
                {r.item.verb.hebrew} · {TENSE_LABELS[r.item.tense]} · {PRONOUN_LABELS[r.item.pronoun].hebrew}
              </span>
              <span dir="rtl" className="font-medium text-gray-800">{r.item.expectedAnswer}</span>
              {!r.correct && (
                <span dir="rtl" className="text-sm text-red-500 line-through">{r.userAnswer}</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              store.reset();
              router.push('/');
            }}
            className="px-5 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Home
          </button>
          <button
            onClick={() => {
              const lesson = lessonService.getById(lessonId);
              if (lesson) {
                store.startSession(buildQueue(lesson), lesson.name);
              }
            }}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Practice Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => { store.reset(); router.push('/'); }}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Exit
        </button>
        <span className="text-sm text-gray-500 font-medium">{lessonName}</span>
        <span className="text-sm text-gray-400">
          {status !== 'idle' ? `${currentIndex + 1} / ${total}` : ''}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: total ? `${((currentIndex) / total) * 100}%` : '0%' }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Generating */}
      {(status === 'generating') && (
        <div className="flex flex-col items-center gap-3 py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating question…</p>
        </div>
      )}

      {/* Active question */}
      {currentItem && status !== 'generating' && (
        <>
          {/* Verb info */}
          <div className="w-full bg-gray-50 rounded-xl p-4 flex flex-wrap gap-2 text-sm">
            <span className="font-bold text-gray-800" dir="rtl">{currentItem.verb.hebrew}</span>
            <span className="text-gray-500">({currentItem.verb.english})</span>
            <span className="mx-1 text-gray-300">·</span>
            <span className="text-indigo-600">{BINYAN_LABELS[currentItem.verb.binyan]}</span>
            <span className="mx-1 text-gray-300">·</span>
            <span className="text-teal-600">{TENSE_LABELS[currentItem.tense]}</span>
            <span className="mx-1 text-gray-300">·</span>
            <span className="text-purple-600">{PRONOUN_LABELS[currentItem.pronoun].english}</span>
          </div>

          {/* Hebrew cue */}
          <p className="text-lg font-medium text-gray-600" dir="rtl">{currentItem.hebrewCue}</p>

          {/* Prompt sentence */}
          <div className="w-full rounded-xl bg-white border border-gray-200 shadow-sm p-6 text-center">
            <p className="text-xl text-gray-800 leading-relaxed">{currentItem.prompt}</p>
          </div>

          {/* Result feedback */}
          {status === 'result' && lastResult && (
            <div
              className={`w-full rounded-xl p-4 text-center transition-all ${
                lastResult.correct
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              {lastResult.correct ? (
                <p className="text-green-700 font-semibold text-lg">✓ Correct!</p>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-red-600 font-semibold">✗ Incorrect</p>
                  <p className="text-2xl font-bold text-gray-800" dir="rtl">
                    {lastResult.correction ?? currentItem.expectedAnswer}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Grading spinner */}
          {status === 'grading' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              Checking…
            </div>
          )}

          {/* Mic */}
          <SpeechInput
            onTranscript={(text) => store.submitAnswer(text)}
            disabled={status !== 'ready'}
            autoStart={status === 'ready'}
          />
        </>
      )}
    </div>
  );
}
