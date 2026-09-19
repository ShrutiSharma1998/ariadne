# Ariadne

Keep your whole story in one place, then find your way forward.

Ariadne is an open-source AI career coach. You add the things that make up your story (a resume, certificates, notes) and Ariadne lays them out on one hand-drawn thread: what you did, how you did it, what it led to, and what you learned. Then a coach helps you work out where to go next.

The name comes from the Greek myth. Ariadne gave Theseus a thread to find his way out of the labyrinth.

> **Status: early.** The timeline, uploads, coach chat and career paths work. Voice, connectors (Obsidian, Strava, calendars), a daily planner and the full map view are planned.

## What it does

- **Builds a timeline from your files.** Upload up to 3 PDF, TXT or Markdown files (2 MB each) or paste text. Every experience becomes an entry with what / how / impact / what I learned, plus skills and the source file. It captures volunteering, side projects and small milestones, not just jobs and degrees.
- **Coaches you in conversation.** The coach has read your timeline. It asks one question at a time and points out patterns and blind spots.
- **Suggests three paths.** Each has why it fits you, things you may not have considered, skill gaps grounded in your timeline, and first steps.
- **Keeps your data in your browser.** Your timeline is saved in local storage. You can export it as a file, import it back, or delete it.
- **Has a sample story.** Try everything with a fictional person, or download the [sample resume](public/sample/sam-rivera-resume.pdf) and upload it.

## How it stays honest

- The timeline builder only uses what your files say. Missing details are marked "Not stated in the files", and it never assumes a role is ongoing.
- The coach and paths never invent links, course names, books, companies or people. They give search phrases instead.
- Every path carries a confidence label, because the model has no live access to job listings or salaries.
- Text inside uploaded files is treated as data, not instructions.

## Privacy

Your files, messages and timeline are sent to an AI model (Anthropic's API) to produce answers. Ariadne's server does not store them or write them to logs. Your timeline lives only in your browser. The sample data in this repository is invented.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no API key, the app runs in **mock mode** with canned answers, so you can explore the interface for free.

To use the real AI, copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. Set a monthly spend limit in the Anthropic Console first. `.env.local` is git-ignored, so the key never enters the repository.

## How it is built

- **Front end:** React, Vite and TypeScript. Hand-drawn look with plain CSS, light and dark themes.
- **Server:** the handlers in `server/` use the Anthropic TypeScript SDK with structured outputs for the timeline and paths, and streaming for the coach. They run as a Vite middleware in development and as a Cloudflare Pages Function in production (`functions/api/`).
- **Cost protection:** per-visitor and site-wide daily limits, request size caps and an origin check. The provider-side spend limit is the final backstop.

## Contributing

Issues and pull requests are welcome. Please run `npm run lint` and `npm run build` before opening a pull request.

## License

[MIT](LICENSE)
