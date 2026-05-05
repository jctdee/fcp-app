# Deploying Pluggo to Vercel

Step-by-step guide to publish this app on Vercel via GitHub. The free **Hobby** tier is plenty for the hackathon — no credits or payment required.

---

## Prerequisites

- **GitHub account** — sign in / create one at [github.com](https://github.com).
- **Vercel account** — sign in at [vercel.com](https://vercel.com) using your GitHub login (one click).
- **Git installed locally** — verify with:
  ```bash
  git --version
  ```
  - macOS: comes with Xcode CLI tools (`xcode-select --install` if missing).
  - Windows: install from [git-scm.com](https://git-scm.com/).

---

## 1. Push the code to GitHub

If you've already cloned an existing repo, skip ahead to step 2.

### 1a. Initialize git locally

From inside the `pluggo/` folder:

```bash
git init
git branch -M main
```

### 1b. Verify .gitignore

The repo already includes a `.gitignore` that excludes `node_modules/`, `.next/`, `.env*`, and `.vercel/`. Quick check:

```bash
cat .gitignore
```

If those lines aren't there, add them before committing — you don't want to push your `node_modules` (huge) or any local env files.

### 1c. Create the GitHub repo

Go to [github.com/new](https://github.com/new):

- **Owner**: your username (e.g. `jctdee`)
- **Repository name**: `pluggo`
- **Visibility**: Public or Private (either works with Vercel)
- **Do NOT** initialize with README / .gitignore / license — your local repo already has them and adding them here causes a merge conflict on first push.

Click **Create repository**. GitHub will then show a "push an existing repository" snippet.

### 1d. First commit + push

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/jctdee/pluggo.git
git push -u origin main
```

**Authentication note:** GitHub no longer accepts your password over HTTPS. Use one of:

- A **Personal Access Token** — create one at [github.com/settings/tokens](https://github.com/settings/tokens) → "Generate new token (classic)" → check the `repo` scope. Use the token as the password when prompted.
- **GitHub CLI** — `brew install gh && gh auth login`, then push normally.
- **SSH** — set up an SSH key with GitHub, then change the remote:
  ```bash
  git remote set-url origin git@github.com:jctdee/pluggo.git
  git push -u origin main
  ```

---

## 2. Import the repo into Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **"Import Git Repository"**. If this is your first time, Vercel asks to install its GitHub app — grant it access to either all repos or just `jctdee/pluggo`.
3. Find `pluggo` in the list and click **Import**.

---

## 3. Configure the project

Vercel auto-detects Next.js, so you don't change anything. Defaults are correct:

| Setting | Auto-detected value |
| --- | --- |
| Framework Preset | Next.js |
| Build Command | `next build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Root Directory | `./` |

Click **Deploy**.

The first build takes about 1-3 minutes. When it finishes you'll get a URL like:

```
https://pluggo.vercel.app
```

That's your live demo. Share it with judges.

---

## 4. Test the deployed app

Open the URL on your phone (Chrome or Safari work best):

- Tap **Use my location** → if you're in Manila, distances are real. Outside Manila, tap **demo location**.
- Tap the chat button → the **mic icon** should now appear (Vercel runs on HTTPS, which the Web Speech API requires).
- Try the demo line: **"I drive a GreenGSM, what's the nearest charging station?"** — bot will filter automatically.

---

## 5. Future updates

Once connected, **every push to `main` auto-deploys to production.** Pushing to any other branch creates a **preview deployment** with its own URL — handy for sharing work-in-progress without affecting the main URL.

Typical update flow:

```bash
# Edit files locally...
git add .
git commit -m "Tweak demo timeline"
git push
```

Vercel starts building automatically. Watch progress in the **Deployments** tab of your Vercel project.

---

## 6. Environment variables (when you wire up a real LLM)

The chatbot's `/api/chat` route currently echoes. When you swap it for OpenAI, Anthropic, or another provider, add the API key in Vercel:

1. Vercel dashboard → your project → **Settings → Environment Variables**.
2. Add a key like `OPENAI_API_KEY` with the secret value.
3. Apply to **Production**, **Preview**, **Development** as appropriate.
4. Trigger a redeploy: push a commit, or hit **Redeploy** in the Deployments tab.

Locally, mirror the keys in a `.env.local` file (already gitignored):

```
OPENAI_API_KEY=sk-...
```

---

## 7. Custom domain (optional)

In Vercel dashboard → **Settings → Domains** → "Add". You can:

- Use a free `*.vercel.app` subdomain (e.g. `pluggo.vercel.app`) — already yours.
- Point a domain you own. Vercel issues TLS certificates automatically.

---

## Troubleshooting

**Build fails on Vercel**
Open the failed build in the Deployments tab → click **View Build Logs**. The most common cause is a dependency missing from `package.json`. Run `npm run build` locally first to catch errors before pushing.

**"Repository not found" when pushing**
Make sure the repo exists on GitHub and the URL matches. Check with:
```bash
git remote -v
```

**Geolocation prompt doesn't appear on the deployed site**
Geolocation requires HTTPS. Vercel auto-applies it — confirm the URL starts with `https://`. On your phone, also check the site has location permission in browser settings.

**Mic button is missing on the deployed site**
The Web Speech API works in **Chrome, Edge, Safari (iOS 14.5+), and Android Chrome**. Firefox does **not** support it. Use a supported browser to demo.

**Deployed site uses the wrong Node version**
Vercel defaults to Node 20+, which works fine. To pin a specific version, add this to `package.json`:
```json
"engines": { "node": "24.x" }
```

---

## TL;DR

```
github.com/jctdee/pluggo  →  vercel.com/new  →  https://pluggo.vercel.app
```

Every `git push` redeploys the live site automatically.
