# 🧰 AI Toolbox

A completely free, full-stack AI tools suite. Chat, summarize, improve, translate, proofread, and work with PDFs & images — without paying for AI.

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript — single app, UI + API in one server
- **AI providers (all free):**
  - 🪙 **OpenRouter** — free `:free` models, $0 cost
  - 🌐 **Google Gemini** — generous free tier
  - ⚡ **xkiro** — free `:free` models via OpenAI-compatible gateway
  - 🐇 **OpenCode** — free allowance, `space-bunny-free` model
  - 🖥️ **Puter** — 1000+ models, free monthly allowance (≈$1)

## ✨ Features

- 💬 **Chat** with any provider/model, Markdown rendering, system prompts
- 🖼️ **In-chat images** — attach a photo and ask about it, or flip the ✨ composer toggle to generate images right inside the chat (no tab jumps; uses Gemini, Puter, xkiro's free SenseNova U1.5 Lite, or free Pollinations)
- 🤖 **Auto model** — pick “Auto” in the model picker for smart defaults; when you attach an image with a non-vision model it automatically switches to a vision-capable one and tells you
- 📄 **Summarize** long text
- ✍️ **Improve / rewrite** text in 5 styles (professional, friendly, concise, casual, formal)
- 🌍 **Translate** into 12+ languages (any language, really)
- 🕵️ **Proofread** text
- 📄 **PDF tools** — convert to Word/text/images, merge & split (100% in your browser)
- 🖼️ **Image tools** — AI analyze, OCR, convert, palette, remove background
- 📚 **Prompt library** — save reusable prompts and send them to chat in one click
- 🎨 **UI picker** — five built-in themes
- ⚙️ **Settings** — API keys stored locally in your browser (localStorage), never logged by the server

## 🚀 Quick start

Requirements: **Node.js 20.9+** and npm.

```bash
cd D:\ai-toolbox
npm install
npm run dev     # starts UI + API together on http://localhost:3001
```

Open **http://localhost:3001**.

### Option A — Zero setup (recommended to start): OpenCode free allowance

1. Open the app — **OpenCode** is the default provider with a prefilled free key.
2. Pick **Space Bunny (free Zen model)** in the model picker.
3. Send a message. Done — no account, no setup (free monthly allowance).

### Option B — OpenRouter free models

1. Create a free key at https://openrouter.ai/keys
2. Paste it in the app's **Settings** tab (or `.env.local` as `OPENROUTER_API_KEY`)
3. Pick a model ending in `:free` (costs $0)

### Option C — Google Gemini free tier

1. Create a free key at https://aistudio.google.com/apikey
2. Paste it in **Settings** (or `.env.local` as `GEMINI_API_KEY`)
3. Pick a Gemini model like `gemini-2.0-flash`

## 🔧 Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server (UI + API, port 3001) |
| `npm run build` | Type-check + production build (`next build`) |
| `npm start` | Run the production build (port 3001) |
| `npm run lint` | oxlint over `src/` |

## 🗂️ Project structure

```
ai-toolbox/
├── src/
│   ├── app/                 # Next.js App Router (UI + API route handlers)
│   │   ├── layout.tsx       # Root layout (global styles, theme bootstrap)
│   │   ├── page.tsx         # The single-page tabbed app
│   │   └── api/             # Route handlers: /api/chat, /api/tools/*, /api/models …
│   ├── views/               # Tab pages: Chat, Tools, Images, Prompts, Settings, UiPicker
│   ├── components/          # ModelPicker, PdfTools
│   ├── utils/               # image.ts (client-side image helpers)
│   ├── providers.ts         # OpenRouter / Gemini / xkiro / OpenCode / Puter adapters (server)
│   ├── api.ts               # API helpers, settings & prompts storage (client)
│   └── types.ts
├── public/                  # Static assets (favicon, pdf.js worker)
└── package.json
```

The app still behaves exactly like the original Vite + Express build: one page with
tabs, `?tab=chat` / `?theme=modern-dark` URL params, and everything saved in your
browser's localStorage.

## 🔒 Privacy

- API keys live only in your browser's `localStorage` and go straight to your chosen provider through the local API — the server never stores or logs them.
- Keys can instead be set via `.env.local` and kept off the browser entirely.
- No accounts, no tracking, no payments.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Server status |
| GET | `/api/providers` | List of supported providers |
| GET | `/api/models?provider=opencode` | Models for a provider |
| POST | `/api/chat` | Chat completion (`{ provider, model, messages }`) |
| POST | `/api/tools/summarize` | Summarize `{ text }` |
| POST | `/api/tools/improve` | Rewrite `{ text, style }` |
| POST | `/api/tools/translate` | Translate `{ text, language }` |
| POST | `/api/tools/proofread` | Proofread `{ text }` |
| POST | `/api/tools/image/analyze` | Analyze an image `{ imageDataUrl, prompt? }` |
| POST | `/api/tools/image/generate` | Generate an image `{ prompt, width?, height?, model? }` (streams PNG/JPEG) |
| POST | `/api/tools/web/fetch` | Link preview `{ url }` — title, image, description |
| POST | `/api/tools/web/article` | Article → AI summary `{ url, provider?, model? }` |
| POST | `/api/tools/audio/transcribe` | Audio → text transcript (Gemini) `{ audioDataUrl }` |

For tools and chat you can optionally pass `openrouterKey`, `geminiKey`, `xkiroKey`, `opencodeKey` in the body.

## ☁️ Deploy: frontend on Vercel

The app is a single Next.js app — chat, providers, images, web tools, PDFs, audio transcription, auth, prompt library. Import the repo on vercel.com; it detects Next automatically. Env vars: `AUTH_SECRET` (required), `AUTH_TRUST_HOST=true`, plus optional `XKIRO_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `OPENCODE_API_KEY`, `PUTER_AUTH_TOKEN`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`.

Notes:

- Generate `AUTH_SECRET` locally: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
- **Serverless can't reach your PC** — use xkiro / OpenRouter / Gemini / OpenCode keys (free tiers) for a public instance; users can also paste keys in Settings.
- **Chat history & accounts** are stored in `.data/` on the server disk — ephemeral on Vercel serverless, so they reset on redeploy. Use a database for durable, public deployment.
- **Tavily web search** stays a per-user key in Settings (no env var).
- **YouTube tools retired** — the YouTube tools (info, transcript, titles, playlist, download, subtitles) were removed from the site. The `backend/` Flask + yt-dlp service (Render) is left in the repo, dormant, with its `/youtube/*` endpoints, PO-token anti-bot-wall setup and `YT_COOKIES_CONTENT` escape hatch intact should the tools ever return. It currently has **no frontend consumer** — safe to stop the service or keep it running idle.