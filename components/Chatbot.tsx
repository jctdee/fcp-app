'use client';

import { useEffect, useRef, useState } from 'react';
import { CARS, isStationCompatible } from '@/lib/cars';
import { classifyIntent } from '@/lib/intent';
import { speak } from '@/lib/speak';
import {
  googleMapsDirectionsUrl,
  wazeDirectionsUrl,
} from '@/lib/stations';
import { useSpeechRecognition } from '@/lib/useSpeechRecognition';
import type {
  Announcement,
  Position,
  StationWithDistance,
} from './AppShell';

type Action = { label: string; href: string };

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
  action?: Action;
  actions?: Action[];
};

function parseMapChoice(text: string): 'google' | 'waze' | null {
  const t = text.toLowerCase();
  if (/\bwaze\b/.test(t)) return 'waze';
  if (/\b(google|gmaps?|maps?)\b/.test(t)) return 'google';
  return null;
}

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

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'bot',
    text:
      "Hey! Tell me your car (\"I drive a GreenGSM\") then ask \"what's the nearest station?\" — or say \"guide me to BGC High Street\" and I'll ask Google Maps or Waze.",
  },
];

type Props = {
  position: Position | null;
  allStations: StationWithDistance[];
  carId: string;
  onCarChange: (id: string) => void;
  announcement?: Announcement | null;
};

export default function Chatbot({
  position,
  allStations,
  carId,
  onCarChange,
  announcement,
}: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [pendingNav, setPendingNav] = useState<StationWithDistance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep latest stations/position/pending-nav/car in refs so the speech callback always reads fresh values.
  const allStationsRef = useRef(allStations);
  const positionRef = useRef(position);
  const pendingNavRef = useRef(pendingNav);
  const carIdRef = useRef(carId);
  useEffect(() => {
    allStationsRef.current = allStations;
    positionRef.current = position;
  }, [allStations, position]);
  useEffect(() => {
    pendingNavRef.current = pendingNav;
  }, [pendingNav]);
  useEffect(() => {
    carIdRef.current = carId;
  }, [carId]);

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

  // Live state refs so the announcement effect can read current values without
  // re-firing whenever they change.
  const speakRepliesRef = useRef(speakReplies);
  const listeningRef = useRef(speech.listening);
  useEffect(() => {
    speakRepliesRef.current = speakReplies;
  }, [speakReplies]);
  useEffect(() => {
    listeningRef.current = speech.listening;
  }, [speech.listening]);

  // Auto-prompt: when AppShell pushes a new announcement, append it to the
  // conversation and (if conditions allow) speak it aloud.
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
    // Don't barge in over the user's voice input. Don't speak if muted.
    // Speak even if the panel is closed — a heads-up is still useful audio.
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
      if (speakReplies) speak(reply);
    };

    // 0. If we asked the driver "Google Maps or Waze?", resolve their answer.
    const pending = pendingNavRef.current;
    if (pending) {
      const choice = parseMapChoice(text);
      if (choice) {
        const url =
          choice === 'waze'
            ? wazeDirectionsUrl(pending.lat, pending.lng)
            : googleMapsDirectionsUrl(pending.lat, pending.lng);
        const appName = choice === 'waze' ? 'Waze' : 'Google Maps';
        const replyText = `Opening ${appName} directions to ${pending.name}.`;
        const botMsg: Message = {
          id: crypto.randomUUID(),
          role: 'bot',
          text: replyText,
          actions: [{ label: `Open ${appName}`, href: url }],
        };
        setMessages((prev) => [...prev, botMsg]);
        announce(replyText);
        try {
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch {
          /* swallowed — fallback button handles it */
        }
        setPendingNav(null);
        setSending(false);
        return;
      }
      setPendingNav(null);
    }

    // 1. Did the driver mention their car? ("I drive a GreenGSM…")
    const carMention = parseCarMention(text);
    const carChanged = carMention !== null && carMention !== carIdRef.current;
    if (carChanged) onCarChange(carMention!);
    const activeCarId = carMention ?? carIdRef.current;
    const activeCar = CARS.find((c) => c.id === activeCarId) ?? CARS[0];

    // 2. Filter the station list to the (possibly newly-selected) car.
    const filteredStations = allStationsRef.current.filter((s) =>
      isStationCompatible(s.connectors, activeCar.connectors),
    );

    // 3. Try local intent matching on the car-filtered list.
    const local = classifyIntent(
      text,
      filteredStations,
      positionRef.current !== null,
    );

    if (local) {
      const replyText = carChanged
        ? `Filtering for your ${activeCar.label}. ${local.reply}`
        : local.reply;
      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: replyText,
        action: local.action,
        actions: local.actions,
      };
      setMessages((prev) => [...prev, botMsg]);
      announce(replyText);

      if (local.pendingNav) {
        const station = filteredStations.find(
          (s) => s.id === local.pendingNav!.stationId,
        );
        if (station) setPendingNav(station);
      }

      setSending(false);
      return;
    }

    // 3b. Car mentioned but no specific question — acknowledge the filter change.
    if (carChanged) {
      const ack = `Got it — filtering chargers for your ${activeCar.label}. Ask me about the nearest, cheapest, or fastest.`;
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'bot', text: ack },
      ]);
      announce(ack);
      setSending(false);
      return;
    }

    // 2. Fallback to the chat API for off-script questions.
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'bot', text: data.reply },
      ]);
      announce(data.reply);
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
    if (speech.listening) speech.stop();
    else speech.start();
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-ink-900 shadow-lg shadow-brand-600/40 transition hover:bg-brand-600 active:scale-95 sm:bottom-8 sm:right-8"
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
              <p className="text-sm font-semibold text-white">ChargeBot</p>
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
                actions={m.actions ?? (m.action ? [m.action] : undefined)}
              />
            ))}
            {sending && <Bubble role="bot" text="…" />}
          </div>

          {(speech.listening || speech.transcript || speech.error) && (
            <div className="border-t border-ink-800 px-4 py-2 text-xs">
              {speech.error ? (
                <span className="text-red-300">{speech.error}</span>
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
            {speech.supported && (
              <button
                type="button"
                aria-label={speech.listening ? 'Stop listening' : 'Start voice input'}
                aria-pressed={speech.listening}
                onClick={toggleMic}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 ${
                  speech.listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-ink-800 text-ink-200 hover:bg-ink-700'
                }`}
              >
                <MicIcon />
              </button>
            )}
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
