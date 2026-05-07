# Pluggo

A **voice-first EV charging assistant** for Filipino drivers — find the nearest available charging station without taking your eyes off the road.

**Live:** [pluggo-two.vercel.app](https://pluggo-two.vercel.app)

Built by **Team FCP**.

## What it does

Drivers ask Pluggobot for nearby stations by voice. Claude orchestrates the conversation, filters by car compatibility (CHAdeMO, CCS2, Type 2), computes distances, and surfaces Maps/Waze deep links — all hands-free.

## Stack

- **Next.js 14** (App Router) on the **Edge runtime**
- **Claude** via the Anthropic Messages API, with two server-side tools: `find_stations`, `get_directions`
- **Web Speech API** for voice in/out
- **Tailwind CSS** for styling
- Deployed on **Vercel**

## Running locally

```bash
npm install
npm run dev          # localhost:3000
npm run tunnel       # https://*.trycloudflare.com — needed for geolocation/mic on phone
```

`.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
CHAT_MODEL=claude-...
CHAT_MAX_TOKENS=...
CHAT_MAX_TOOL_ITERATIONS=...
```

All chat env vars are required — the route fails closed if any are missing.

## Running with Docker (Node 24)

A multi-stage `Dockerfile` is included. It builds the app on `node:24-alpine` and runs the Next.js standalone server as a non-root user.

```bash
docker compose up --build       # quickest path
# or
docker build -t pluggo .
docker run --rm -p 3000:3000 pluggo
```

Pass env vars with `-e ANTHROPIC_API_KEY=...` for plain `docker run`, or via `env_file` in `docker-compose.yml`.

## Tests

```bash
npm test
```

Vitest tests target the `/api/chat` route handler with a mocked Anthropic API.

## Architecture

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture, including:
- The two-list pattern in `AppShell.tsx`
- Chatbot pipeline in `Chatbot.tsx::handleSubmit`
- Demo Mode auto-announcements
- Trust boundaries on user input

## Presentation

3-minute hackathon retrospective: [`presentation/slides.md`](./presentation/slides.md) — Slidev deck.
