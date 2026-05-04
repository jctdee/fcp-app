'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Minimal typing — Web Speech API isn't in lib.dom.d.ts.
type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionErrorEventLike = { error: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type Options = {
  onFinal: (text: string) => void;
  lang?: string;
};

export function useSpeechRecognition({ onFinal, lang = 'en-US' }: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (interim) setTranscript(interim);
      if (final) {
        setTranscript('');
        onFinalRef.current(final.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      const code = e.error;
      setError(
        code === 'not-allowed'
          ? 'Microphone permission denied.'
          : code === 'no-speech'
            ? "Didn't catch that — try again."
            : `Speech error: ${code}`,
      );
      setListening(false);
    };

    recRef.current = rec;
    setSupported(true);

    return () => {
      rec.abort();
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    setTranscript('');
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      // start() throws if already listening — safe to ignore
    }
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
