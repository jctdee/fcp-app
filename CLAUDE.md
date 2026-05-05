# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Pluggo is a hackathon prototype: a mobile-first Next.js 14 (App Router) app that helps EV drivers in Metro Manila find the nearest charging station, with a floating "Pluggobot" chat panel. The chatbot is currently rule-based + an echo API stub; the real LLM backend is not wired up yet (see "Wiring the chatbot" below). Pure TS helpers for the upcoming Claude wiring live in `lib/chatbot/`. Hackathon test scope: tests target the `/api/chat` route handler (the chatbot itself), not per-helper unit logic.

## Commands

| | |
|---|---|
| `npm run dev` | Dev server on port 3000. Add `-- -H 0.0.0.0` to expose on LAN. |
| `npm run build` | Production build. Outputs `.next/standalone` (see `next.config.mjs`). |
| `npm run start` | Run the production build. |
| `npm run lint` | Next/ESLint. |
| `npm test` | Run vitest once. Targets `/api/chat` route tests (mocked Anthropic SDK). |
| `npm run test:watch` | Vitest in watch mode. |
| `docker compose up --build` | Full prod-style container at `localhost:3000`. |

Auto-deploys to Vercel on push to `main`. PRs get preview URLs automatically.

## Architecture

### State ownership and the two-list pattern

`components/AppShell.tsx` is the single source of truth for `position`, `carId`, `overrides`, and `announcement`. It produces **two** derived station lists:

- `allStations` — full list with overrides + distance, no car filter. Passed to `Chatbot` so the bot can re-filter on the fly when the driver mentions a car mid-conversation ("I drive a GreenGSM").
- `stations` — `allStations` further filtered by `isStationCompatible` against the active car's connectors. Drives `StationList` and the map.

If you find yourself filtering stations a third way, prefer pushing the logic into the consumer rather than adding a third memoized list.

### Chatbot pipeline (`components/Chatbot.tsx::handleSubmit`)

Order of operations on every user message — earlier steps short-circuit the rest:

1. **Resolve pending nav** — if a previous bot turn asked "Google Maps or Waze?", `parseMapChoice` resolves the answer and opens the directions URL.
2. **Parse car mention** — `parseCarMention` looks for "I drive a X" / "GreenGSM" / "Tesla" / etc. and calls `onCarChange`. The new car is applied to the same turn's station filter.
3. **Local intent match** — `lib/intent.ts::classifyIntent` is a regex-based classifier covering nearest, cheapest, fastest, available, price, wait, ETA, and directions. Returns `IntentReply | null`. Reply may include a `pendingNav` to set up the next turn.
4. **Fallback to `/api/chat`** — only reached when the local matcher returns `null`.

When extending the bot, prefer adding a branch in `classifyIntent` over expanding the API fallback — local matching is deterministic and works offline.

### Auto-prompt loop (Demo Mode)

`lib/demoTimeline.ts` schedules `setTimeout` patches against station state when Demo Mode is on. `AppShell` diffs the resulting `stations` list against the previous render and emits an `Announcement` (e.g., "A slot just opened at Greenbelt 5"). The `Chatbot` appends the announcement as a bot message and speaks it via `lib/speak.ts` unless replies are muted or the user is currently dictating. This is the headline demo moment — when tweaking pacing, edit the `at` values in `DEMO_TIMELINE`.

### Domain data is intentional, not random

- `lib/stations.ts` uses real Metro Manila coordinates (Greenbelt, BGC, MOA, etc.) so testers familiar with the city see names they trust.
- `lib/cars.ts` has a `greengsm` profile scoped to **CHAdeMO only** on purpose — picking it visibly excludes the closest CCS2/Type 2 stations and forces the bot to recommend a station further out. This is a demo trick, not a data error.

### Voice (Web Speech API)

- `lib/useSpeechRecognition.ts` wraps `webkitSpeechRecognition` (input).
- `lib/speak.ts` wraps `window.speechSynthesis` (output).
- Both are client-only and browser-dependent. The mic button **always renders** even when `speech.supported` is false — tapping it shows an inline notice instead of silently doing nothing. Don't re-gate the button on `supported`.

### Chat API

`app/api/chat/route.ts` runs on the Edge runtime (`export const runtime = 'edge'`) and currently echoes the message. The plan recorded in auto-memory is to wire this to the **Claude API** (not AWS Lex) using `@anthropic-ai/sdk` with tool use, streaming the response. Keep the request shape `{ message: string }` and the response shape `{ reply: string }` (or extend it with streaming chunks) so `Chatbot.handleSubmit` doesn't need to change. The Edge runtime is required to avoid Vercel Hobby's 10s function timeout on streaming responses; the `ANTHROPIC_API_KEY` env var is set in Vercel.

### `lib/chatbot/` — pure TS helpers for the Claude wiring

These modules encode the safety invariants for the future `/api/chat` route. They are pure functions (no React, no Edge primitives, no network) and are TypeScript-checked at build time. The route will compose them rather than redefining validation, sanitization, or wrapping logic. Coverage is at the route level, not per-helper — keeping tests focused on the actual chatbot behavior for the hackathon.

- `wrap.ts` — JSON-encodes the untrusted client payload as a single user-message string for Claude (no XML delimiters, so attacks like `</driver_message>` cannot break out).
- `validate.ts` — runtime validator for the request body. Hard-400s missing/empty `driverMessage` or non-object body; soft-coerces everything else.
- `overrides.ts` — `sanitizeOverrides` (server) whitelists the four mutable demo-override fields; `normalizeOverridesForWire` (client) maps `waitMinutes: undefined` → `null` so JSON.stringify preserves the "clear" signal.
- `station-resolver.ts`, `find-stations.ts`, `directions.ts` — server-side tool implementations; all canonical station facts come from `lib/stations.ts::STATIONS`, never from the client.
- `tool-input.ts` — validates *model* tool inputs as untrusted (clamps `limit`, validates enums, etc.).
- `primary-station.ts` — `PrimaryStationTracker` enforces "first valid result wins" so Maps + Waze buttons attach deterministically.
- `view.ts` — merges canonical stations with sanitized overrides + computes distance.

## Conventions worth knowing

- Path alias `@/*` maps to the repo root (see `tsconfig.json`). Use `@/lib/...` and `@/components/...` rather than relative paths.
- `'use client'` is required on every interactive component — there is no server-component boundary above `AppShell` other than `app/page.tsx`.
- Tailwind tokens `ink-*` (slate-ish neutrals) and `brand-*` (cyan) are defined in `tailwind.config.ts`. Stick to them rather than raw `#hex` values.
- `next.config.mjs` sets `output: 'standalone'` for the Docker image — don't remove it without updating the `Dockerfile` COPY paths.

## Code style

- **No `any`.** Use proper types, generics, or `unknown` with a type guard. If a Web API isn't in `lib.dom.d.ts` (e.g. `webkitSpeechRecognition`), declare a minimal local interface — see `lib/useSpeechRecognition.ts` for the pattern.
- **No `as SomeType` casting.** Use type guards or runtime validation. Casting hides bugs the compiler would otherwise catch.
- **Guard clauses over nested `if`/`else`** in loops and handlers. The `Chatbot.handleSubmit` pipeline is the canonical example — each step `return`s early on match rather than nesting the next step inside an `else`.
