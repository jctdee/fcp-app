# fcp-app

A **mobile-first web app** built with Next.js 14, TypeScript, and Tailwind CSS. Includes a landing page and a floating chatbot that talks to a built-in API route. Designed to deploy to Vercel in one click.

---

## What's in here

```
fcp-app/
├── app/
│   ├── api/chat/route.ts   # Chat API (replace with a real LLM)
│   ├── globals.css
│   ├── layout.tsx          # Root layout + mobile viewport config
│   └── page.tsx            # Landing page
├── components/
│   └── Chatbot.tsx         # Floating chat button + chat panel
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── next.config.mjs
```

---

## Prerequisites

- **Node.js 18.18 or newer** — install from [nodejs.org](https://nodejs.org/) (LTS is fine).
- A code editor (VS Code recommended).

That's it. No mobile toolchains required — this is a normal web app.

---

## macOS — running locally

Open Terminal and run:

```bash
cd fcp-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To preview on your phone, find your Mac's local IP (`ipconfig getifaddr en0`) and visit `http://<that-ip>:3000` from your phone on the same Wi-Fi.

---

## Windows — running locally

Open **PowerShell** or **Command Prompt** and run:

```powershell
cd fcp-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. To preview on your phone, find your PC's IP (`ipconfig` → look for "IPv4 Address") and visit `http://<that-ip>:3000` from your phone on the same Wi-Fi.

> If `npm` is not recognized, install Node.js from [nodejs.org](https://nodejs.org/) and reopen your terminal.

---

## Testing on mobile (HTTPS for geolocation)

The app uses the browser Geolocation API (`navigator.geolocation`), which browsers only allow on **secure contexts** — `https://` or `localhost`. Visiting `http://<your-mac-ip>:3000` from your phone will load the page but **silently deny location access** with no useful error.

To test geolocation on a real device, expose the dev server through an HTTPS tunnel using Cloudflare's free quick tunnel:

```bash
brew install cloudflared    # macOS, one-time
npm run dev                 # in one terminal
npm run tunnel              # in another — prints an https://*.trycloudflare.com URL
```

Open the printed `https://...trycloudflare.com` URL on your phone. Geolocation will prompt and work normally.

> The quick tunnel URL is public for as long as `npm run tunnel` is running and changes every restart. Fine for local testing; don't share it broadly.

For Windows / Linux, install `cloudflared` from [the official docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) and run `npm run tunnel` the same way.

---

## Running with Docker (Node 24)

A multi-stage `Dockerfile` is included. It builds the app on `node:24-alpine` and runs the Next.js standalone server as a non-root user. Final image is small (~150 MB) and starts in under a second.

**Prerequisites:** Docker Desktop ([macOS](https://www.docker.com/products/docker-desktop/) / [Windows](https://www.docker.com/products/docker-desktop/)). After install, make sure Docker is running.

### Quickest path — docker compose

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). To stop: `Ctrl+C`, then `docker compose down`.

### Plain docker

```bash
docker build -t fcp-app .
docker run --rm -p 3000:3000 fcp-app
```

### Pinning a different Node 24 patch version

The `Dockerfile` defaults to `node:24-alpine` (latest 24.x). To pin a specific version:

```bash
docker build --build-arg NODE_VERSION=24.0.0-alpine -t fcp-app .
```

Or change `NODE_VERSION` in `docker-compose.yml`.

### Environment variables (e.g. LLM keys)

Create a `.env.local` file with your secrets, then uncomment the `env_file` block in `docker-compose.yml`. For plain `docker run`, pass them with `-e`:

```bash
docker run --rm -p 3000:3000 -e OPENAI_API_KEY=sk-... fcp-app
```

---

## Deploying to Vercel

1. Push this folder to a GitHub repo.
2. Go to [vercel.com/new](https://vercel.com/new) → "Import Git Repository" → select the repo.
3. Vercel auto-detects Next.js. Click **Deploy** — no settings to change.
4. You'll get a public URL like `fcp-app.vercel.app`. Share that with judges.

The free **Hobby** tier is plenty for a hackathon demo — no credits or payment needed.

---

## Editing the app

- **Landing page** → `app/page.tsx`
- **Chatbot UI** → `components/Chatbot.tsx`
- **Chat backend** → `app/api/chat/route.ts` (currently echoes; swap in OpenAI/Anthropic/etc.)
- **Colors and theme** → `tailwind.config.ts`

Save any file and the browser will hot-reload.

---

## Wiring the chatbot to a real LLM

Open `app/api/chat/route.ts`. The route receives `{ message: string }` and must return `{ reply: string }`. Replace the demo response with a call to your provider of choice. Example (OpenAI):

```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const completion = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: message }],
});

const reply = completion.choices[0]?.message?.content ?? '';
return NextResponse.json({ reply });
```

Add `OPENAI_API_KEY` to a `.env.local` file locally and to your Vercel project's Environment Variables for production.

---

## Common scripts

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the dev server on port 3000     |
| `npm run build` | Production build                      |
| `npm run start` | Run the production build locally      |
| `npm run lint`  | Lint the project                      |

---

## Troubleshooting

**Port 3000 already in use** → run `npm run dev -- -p 3001`.

**Phone can't reach `http://<ip>:3000`** → corporate/guest Wi-Fi often blocks device-to-device traffic. Use a personal hotspot, or just deploy to Vercel and test from the live URL.

**Build fails on Vercel** → make sure you committed `package.json` and `package-lock.json`. Vercel runs `npm install` then `npm run build`.

Good luck at the hackathon!
