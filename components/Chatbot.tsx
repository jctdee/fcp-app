'use client';

import { useEffect, useRef, useState } from 'react';
import { CARS } from '@/lib/cars';
import { speak } from '@/lib/speak';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import {
  normalizeOverridesForWire,
  type StationOverride,
} from '@/lib/chatbot/overrides';
import { isChatResponse, type Action } from '@/lib/chatbot/response';
import type { Announcement, Position } from './AppShell';

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  actions?: Action[];
};

// Detect "I drive a [car]" / "my car is X" / "I have a [car]" patterns.
// Returns the matching car id from CARS, or null.
function parseCarMention(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(green\s?gsm|greengsm|grin\s?gsm)\b/.test(t)) return 'greengsm';
  if (/\b(vin\s?fast|vinfast)\b/.test(t)) return 'vinfast';
  if (/\b(byd|atto|dolphin)\b/.test(t)) return 'byd';
  if (/\b(nissan leaf|nissan|leaf)\b/.test(t)) return 'nissan-leaf';
  if (/\b(hyundai|kia|ioniq|kona|ev6)\b/.test(t)) return 'hyundai-kia';
  if (/\btesla\b/.test(t)) return 'tesla';
  if (/\b(mg zs|mg ev|mg 4)\b/.test(t)) return 'mg';
  if (/\b(phev|hybrid)\b/.test(t)) return 'phev';
  return null;
}

const WELCOME_ID = 'welcome';
const initialMessages: Message[] = [
  {
    id: WELCOME_ID,
    role: 'bot',
    text:
      "Hey! Tell me your car (\"I drive a GreenGSM\") then ask \"what's the nearest station?\" — or say \"guide me to BGC High Street\".",
  },
];

type Props = {
  position: Position | null;
  carId: string;
  onCarChange: (id: string) => void;
  overrides: Record<string, StationOverride>;
  announcement?: Announcement | null;
};

export default function Chatbot({
  position,
  carId,
  onCarChange,
  overrides,
  announcement,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Latest values exposed via refs so the speech-recognition callback (set up
  // once) always reads fresh state at call time.
  const positionRef = useRef(position);
  const carIdRef = useRef(carId);
  const overridesRef = useRef(overrides);
  const announcementRef = useRef(announcement);
  const messagesRef = useRef(messages);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    carIdRef.current = carId;
  }, [carId]);
  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);
  useEffect(() => {
    announcementRef.current = announcement;
  }, [announcement]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const speech = useSpeechRecognition({
    onFinal: (text) => {
      void handleSubmit(text);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, open, speech.transcript]);

  const speakRepliesRef = useRef(speakReplies);
  const listeningRef = useRef(speech.listening);
  useEffect(() => {
    speakRepliesRef.current = speakReplies;
  }, [speakReplies]);
  useEffect(() => {
    listeningRef.current = speech.listening;
  }, [speech.listening]);

  // Auto-prompt: append + speak each new announcement bubble.
  useEffect(() => {
    if (!announcement) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === announcement.id)) return prev;
      return [
        ...prev,
        {
          id: announcement.id,
          role: 'bot',
          text: `🔔 ${announcement.text}`,
        },
      ];
    });
    if (speakRepliesRef.current && !listeningRef.current) {
      speak(announcement.text);
    }
  }, [announcement]);

  async function handleSubmit(raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    const announce = (reply: string) => {
      if (speakRepliesRef.current) speak(reply);
    };

    // Local UX-only step: if the driver mentioned a car, switch the active
    // car immediately so the UI list filter updates this turn AND the new
    // carId is sent to Claude alongside the message.
    const carMention = parseCarMention(text);
    const activeCarId = carMention ?? carIdRef.current;
    const carChanged = carMention !== null && carMention !== carIdRef.current;
    if (carChanged) onCarChange(carMention);
    const activeCar = CARS.find((c) => c.id === activeCarId) ?? CARS[0];

    // Build the prior-turn transcript from current messages, dropping the
    // welcome bubble and the just-appended user turn (which is sent as
    // driverMessage instead). Last 10 only — server caps the same.
    const priorTurns = messagesRef.current
      .filter((m) => m.id !== WELCOME_ID)
      .slice(-10)
      .map((m) => ({
        speaker: m.role === 'user' ? ('driver' as const) : ('bot' as const),
        text: m.text,
      }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverMessage: text,
          priorTurns,
          position: positionRef.current,
          carId: activeCarId,
          overrides: normalizeOverridesForWire(overridesRef.current),
          latestAnnouncement: announcementRef.current?.text,
        }),
      });
      const raw: unknown = await res.json();
      // Throw on shape mismatch so the existing catch below shows the
      // generic "something went wrong" message. Never render unvalidated
      // action hrefs onto the page.
      if (!isChatResponse(raw)) throw new Error('invalid_chat_response');
      const replyText = carChanged
        ? `Filtering for your ${activeCar.label}. ${raw.reply}`
        : raw.reply;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: replyText,
          actions: raw.actions,
        },
      ]);
      announce(replyText);
    } catch {
      const fallback = 'Sorry — something went wrong reaching the server.';
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'bot', text: fallback },
      ]);
      announce(fallback);
    } finally {
      setSending(false);
    }
  }

  function toggleSpeakReplies() {
    if (speakReplies && typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
    setSpeakReplies((s) => !s);
  }

  function toggleMic() {
    if (!speech.supported) {
      setMicNotice(
        "Voice input isn't supported in this browser — try Chrome on desktop, or type your message instead.",
      );
      return;
    }
    setMicNotice(null);
    if (speech.listening) speech.stop();
    else speech.start();
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-5 right-5 z-40 h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-ink-900 shadow-lg shadow-brand-600/40 transition hover:bg-brand-600 active:scale-95 sm:bottom-8 sm:right-8 ${open ? 'hidden' : 'flex'}`}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Chatbot"
          className="fixed inset-x-0 bottom-0 z-30 flex h-[85dvh] flex-col rounded-t-3xl border border-ink-800 bg-ink-900 shadow-2xl sm:inset-x-auto sm:bottom-24 sm:right-8 sm:h-[34rem] sm:w-96 sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-white">Pluggobot</p>
              <p className="text-xs text-ink-400">
                {speech.listening
                  ? 'Listening…'
                  : speech.supported
                    ? 'Type or tap the mic to speak'
                    : 'Type a question'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={
                  speakReplies ? 'Mute voice replies' : 'Unmute voice replies'
                }
                aria-pressed={!speakReplies}
                onClick={toggleSpeakReplies}
                className={`rounded-full p-1.5 transition hover:bg-ink-800 ${
                  speakReplies
                    ? 'text-brand-500 hover:text-white'
                    : 'text-ink-400 hover:text-white'
                }`}
              >
                {speakReplies ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-ink-400 hover:bg-ink-800 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) => (
              <Bubble
                key={m.id}
                role={m.role}
                text={m.text}
                actions={m.actions}
              />
            ))}
            {sending && <Bubble role="bot" text="…" />}
          </div>

          {(speech.listening ||
            speech.transcript ||
            speech.error ||
            micNotice) && (
            <div className="border-t border-ink-800 px-4 py-2 text-xs">
              {speech.error ? (
                <span className="text-red-300">{speech.error}</span>
              ) : micNotice ? (
                <span className="text-ink-300">{micNotice}</span>
              ) : (
                <span className="text-ink-400">
                  <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500 align-middle" />
                  {speech.transcript || 'Listening…'}
                </span>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit(input);
            }}
            className="flex items-center gap-2 border-t border-ink-800 px-3 py-3"
          >
            <button
              type="button"
              aria-label={
                !speech.supported
                  ? 'Voice input not supported'
                  : speech.listening
                    ? 'Stop listening'
                    : 'Start voice input'
              }
              aria-pressed={speech.listening}
              onClick={toggleMic}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                speech.listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : speech.supported
                    ? 'bg-ink-800 text-ink-200 hover:bg-ink-700'
                    : 'bg-ink-800/60 text-ink-400'
              }`}
            >
              <MicIcon />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 rounded-full bg-ink-800 px-4 py-2.5 text-sm text-white placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-brand-600 disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  text,
  actions,
}: {
  role: Message['role'];
  text: string;
  actions?: Action[];
}) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[85%] flex-col gap-2">
        <div
          className={`rounded-2xl px-4 py-2 text-sm leading-snug ${
            isUser ? 'bg-brand-500 text-ink-900' : 'bg-ink-800 text-ink-200'
          }`}
        >
          {text}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 self-start">
            {actions.map((a) => {
              const isWaze = a.label.toLowerCase().includes('waze');
              return (
                <a
                  key={a.href + a.label}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    isWaze
                      ? 'bg-[#33ccff] text-ink-900 hover:brightness-110'
                      : 'bg-emerald-500 text-ink-900 hover:bg-emerald-400'
                  }`}
                >
                  {a.label} →
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}
