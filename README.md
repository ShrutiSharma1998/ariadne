# Ariadne

Keep your whole story in one place, then find your way forward.

Ariadne is an open-source AI career coach. You add the things that make up your story (resume, certificates, notes, calendars) and Ariadne lays them out on one hand-drawn thread: what you did, how you did it, what it led to, and what you learned. Then it helps you work out where to go next.

The name comes from the Greek myth. Ariadne gave Theseus a thread to find his way out of the labyrinth.

> **Status: work in progress.** The timeline view and a fictional sample story are working. Uploads, the coach chat and career trajectories are being built.

## What works today

- A hand-drawn, zoomable timeline with a light and a dark theme
- A fictional sample story (Sam Rivera) so you can try it without sharing anything personal
- Years and months zoom levels

## Planned

- Upload PDF, text and Markdown files and turn them into a structured timeline
- A coach that asks questions about your story and points out what you haven't considered
- Three possible career paths with skill gaps and honest confidence labels
- Local-first storage: your data stays in your browser, with export and import

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Privacy

Nothing is uploaded anywhere yet. When the coach arrives, your text will be sent to an AI model to answer you, and that will be stated clearly in the app. The sample data in this repository is invented.

## License

[MIT](LICENSE)
