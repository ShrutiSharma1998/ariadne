# Ariadne

Keep your whole story in one place, then find your way forward.

Ariadne is an open-source AI career coach. You add the things that make up your story (a resume, certificates, notes) and Ariadne lays them out on one hand-drawn thread: what you did, how you did it, what it led to, and what you learned. Then a coach helps you work out where to go next.

The name comes from the Greek myth. Ariadne gave Theseus a thread to find his way out of the labyrinth.

> **Status: early.** Uploads, the timeline, the coach chat and career paths work. A travelling-camera road view, voice, connectors (Obsidian, Strava, calendars) and a daily planner are planned.

## What it does

- **Builds a timeline from your files.** Upload up to 3 PDF, TXT or Markdown files (2 MB each) or paste text. Every experience becomes an entry with what / how / impact / what I learned, plus skills and the source file. It captures volunteering, side projects and small milestones, not just jobs and degrees.
- **A coach you can reach from anywhere.** A round chat button opens the coach over any page. It speaks first, with one specific thing it notices in your story and one question. Each timeline card has "Ask the coach about this".
- **Three career paths, then you steer.** Each path has why it fits you, things you may not have considered, skill gaps grounded in your timeline, and first steps. Tell each path how it feels ("I'm drawn to this", "Maybe", "Not for me", with an optional reason) and refine. The AI replaces what you reject with something different, not the same idea renamed.
- **Something to see before you ask.** The paths page shows what your story already reveals (recurring skills, your mix of experiences) instantly and for free.
- **Day and night.** A hand-drawn paper world by day, the same world by night with a lantern.
- **Keeps your data in your browser.** Your timeline is saved in local storage. "Your data" lets you save a backup file, restore it on another device, or delete it.
- **Has a sample story.** Try everything with a fictional person, or download the [sample resume](public/sample/sam-rivera-resume.pdf) and upload it.

## How it stays honest

- The timeline builder only uses what your files say. Missing details are marked "Not stated in the files", years without months are shown as years, and nothing is assumed to be ongoing.
- The coach and paths never invent links, course names, books, companies or people. They give search phrases instead.
- Every path carries a confidence label, because the model has no live access to job listings or salaries.
- Text inside uploaded files is treated as data, not instructions.

## Privacy

Your files, messages and timeline are sent to an AI model (Anthropic's API) to produce answers. Ariadne's server does not store them or write them to logs. Your timeline lives only in your browser. For rate limiting, the server keeps a counter keyed by a one-way hash of your address that changes every day, never the address itself. The sample data in this repository is invented.

## Protecting a free public demo

A public site that spends real money on AI needs guard rails. This one has several layers:

- **A hard ceiling.** The API account is prepaid with auto-reload off, so total spend can never pass the balance.
- **An exact shared budget.** One Cloudflare Durable Object counts every request, so a daily budget and per-visitor caps hold even under simultaneous traffic. When the budget is spent, the AI pauses until the next day.
- **A bot check.** Cloudflare Turnstile, invisible for most people.
- **A same-origin lock**, request size limits and input validation.
- **A kill switch.** Setting the secret `AI_DISABLED=1` pauses every AI feature within seconds while the site stays up.

`npm run smoke` runs 18 checks against these protections without spending anything.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no API key, the app runs in **mock mode** with canned answers, so you can explore the interface for free.

To use the real AI, copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Set a spend limit with your provider first. `.env.local` is git-ignored, so the key never enters the repository.

## How it is built

- **Front end:** React, Vite and TypeScript. The hand-drawn look uses [Rough.js](https://roughjs.com/) and plain CSS, with light and dark themes.
- **Server:** the handlers in `server/` use the Anthropic TypeScript SDK with structured outputs for the timeline and paths, and streaming for the coach. They run inside a Vite middleware in development and inside a Cloudflare Worker in production (`worker/`), which also serves the built site as static files.
- **Deploy:** connect the repository to a Cloudflare Worker (Workers Builds) with build command `npm run build` and deploy command `npx wrangler deploy`. Secrets (`ANTHROPIC_API_KEY`, `TURNSTILE_SECRET_KEY`) live in the Worker's settings, never in the repository. Public settings are in `wrangler.jsonc`.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm run smoke` and `npm run build` before opening a pull request.

## License

[MIT](LICENSE)
