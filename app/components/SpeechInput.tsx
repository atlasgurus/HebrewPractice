'use client';

import { useEffect, useRef, useState } from 'react';
import { WebSpeechAdapter } from '@/services/adapters/webSpeechAdapter';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function SpeechInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const adapterRef = useRef<WebSpeechAdapter | null>(null);
  const transcriptRef = useRef('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const adapter = new WebSpeechAdapter();
    setSupported(adapter.isSupported());

    adapter.onResult = (text) => {
      transcriptRef.current = text;
      setTranscript(text);
    };

    adapter.onEnd = () => {
      setListening(false);
      const text = transcriptRef.current;
      if (text) {
        onTranscriptRef.current(text);
        transcriptRef.current = '';
        setTranscript('');
      }
    };

    adapter.onError = (error) => {
      if (error !== 'no-speech' && error !== 'aborted') {
        console.error('Speech error:', error);
      }
      setListening(false);
    };

    adapterRef.current = adapter;
    return () => adapter.abort();
  }, []);

  function startListening() {
    if (!adapterRef.current?.isSupported() || listening) return;
    transcriptRef.current = '';
    setTranscript('');
    setListening(true);
    adapterRef.current.start();
  }

  function stopListening() {
    adapterRef.current?.stop();
  }

  if (!supported) {
    return (
      <p className="text-sm text-red-500">
        Speech recognition is not supported in this browser. Please use Chrome.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onMouseDown={startListening}
        onTouchStart={startListening}
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        aria-label={listening ? 'Stop recording' : 'Start recording'}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center text-3xl
          transition-all duration-150 shadow-md
          ${disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : listening
              ? 'bg-red-500 text-white scale-110 shadow-red-300 shadow-lg animate-pulse'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }
        `}
      >
        🎤
      </button>

      {listening && (
        <p className="text-sm text-gray-500 animate-pulse">Listening…</p>
      )}

      {transcript && !listening && (
        <p className="text-base text-gray-700 font-medium" dir="rtl">{transcript}</p>
      )}

      {!listening && !transcript && !disabled && (
        <p className="text-xs text-gray-400">Tap to speak</p>
      )}
    </div>
  );
}
