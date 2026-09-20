# Ariadne design notes

Version 2, 2026-09-19. Read this before changing anything visual. `design/moodboard.html` shows all of it; this file is the version for building.

## Decisions so far

- **Mascot and logo: Clew** (direction A). A ball of thread that is the logo, the coach button and the favicon.
- **Day palette approved:** beige paper, walnut sketch lines, one persimmon thread.
- **Night stays the indigo you have today,** with gold for the thread and the light. Only three tokens are added to it.
- **Still open:** the road scene reads a little childish. See "Making it feel grown-up" below; it needs a yes before it is applied.

## Concept

Your story is the labyrinth. Ariadne hands you the thread.

- **The myth.** Ariadne gave Theseus a thread to find his way out of the labyrinth. Her thread was a *clew*, a ball of thread, and the word "clue" comes from it.
- **The night sky.** The myth sets Ariadne's crown among the stars (the constellation Corona Borealis). Night mode shows that arc of seven stars above "Where next", quietly, for people who look up. This also answers the tracker's "night mode as a constellation": at night the stops can appear as small stars joined by a faint dotted line above the road, echoing it. The road stays the main thing.
- **One line grammar.** A solid line is what came from your files. A dashed line is a possibility or something not stated. Use it for the road, the "Where next" fork, confidence labels and empty states.
- **Feel.** A field notebook you walk through with someone who has read the whole thing. Warm, unhurried, hand-made. Guided, not gamified.

## Themes

Same token names as `src/styles/tokens.css`: change values, keep names. Three tokens are new: `--sketch`, `--lantern`, `--on-accent`.

### Day: Paper

Beige paper, walnut sketch lines, one persimmon thread.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#F3ECDD` | Page |
| `--paper-deep` | `#EADFC9` | Hills, wells, hover |
| `--card` | `#F9F4E9` | Cards, dock, road bed |
| `--ink` | `#2B2620` | Text |
| `--ink-2` | `#5E554A` | Secondary text |
| `--sketch` | `#6B4E3A` | Outlines, hatching, contour lines (new) |
| `--line` | `#B3A68F` | Hairline dividers |
| `--thread` | `#D2622A` | The road and thread. Strokes only (was `#C4623F`) |
| `--accent` | `#A64A1C` | Orange text and button fill (was `#A34A27`) |
| `--on-accent` | `#F9F4E9` | Text on `--accent` (new) |
| `--lantern` | `#E8A736` | Sun and glow. Decoration only (new) |
| `--focus` | `#1F5F8A` | Keyboard focus ring |

```css
:root {
  --paper: #F3ECDD; --paper-deep: #EADFC9; --card: #F9F4E9;
  --ink: #2B2620; --ink-2: #5E554A; --line: #B3A68F; --sketch: #6B4E3A;
  --thread: #D2622A; --accent: #A64A1C; --on-accent: #F9F4E9; --lantern: #E8A736; --focus: #1F5F8A;
  --k-work: #D2622A; --k-education: #4E7388; --k-volunteering: #B0546F;
  --k-side-project: #6B8555; --k-certification: #B98A2E; --k-milestone: #7C6A9E;
  --hill-far: #E6DCC4; --hill-far-line: #C9B98F;
  --hill-mid: #DCCFAE; --hill-mid-line: #B7A276;
  --hill-near: #CFBD94; --hill-near-line: #8F7A52;
  --star: #F6E7B4; --shade: rgba(43, 38, 32, 0.12);
}
```

### Night: Indigo (unchanged from today)

The same road after dark: deep indigo paper, cream ink, gold for the thread and the light. **Do not change the existing night values.** Only add the three new tokens (`--sketch`, `--lantern`, `--on-accent`), set to the values below.

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#16141C` | Page (existing) |
| `--paper-deep` | `#1E1B27` | Hills, wells, hover (existing) |
| `--card` | `#252131` | Cards, dock, road bed (existing) |
| `--ink` | `#F1E8D3` | Text (existing) |
| `--ink-2` | `#B9AE9A` | Secondary text (existing) |
| `--sketch` | `#B9AE9A` | Outlines, hatching, contour lines (new; same as `--ink-2`, which `RoughFrame` already uses) |
| `--line` | `#524A5E` | Hairline dividers (existing) |
| `--thread` | `#E8B93A` | The road and thread, gold (existing) |
| `--accent` | `#F2C230` | Gold text and button fill (existing) |
| `--on-accent` | `#16141C` | Text on `--accent` (new) |
| `--lantern` | `#F2C230` | Moon, glow, the coach's light (new; same gold as `--k-certification`) |
| `--focus` | `#7FC0E8` | Keyboard focus ring (existing) |

The kind colours, hill colours, `--star` and `--shade` stay exactly as they are in `tokens.css` today (the `prefers-color-scheme: dark` block and the `[data-theme='dark']` block both).

### Contrast (WCAG 2.x, computed 2026-09-19)

| Pair | Day | Night | Needs |
| --- | --- | --- | --- |
| `--ink` on `--paper` | 12.7 | 15.0 | 4.5 |
| `--ink-2` on `--paper` | 6.2 | 8.3 | 4.5 |
| `--accent` on `--paper` (text) | 4.9 | 10.9 | 4.5 |
| `--on-accent` on `--accent` (button label) | 5.3 | 10.9 | 4.5 |
| `--thread` on `--paper` (stroke) | 3.2 | 9.9 | 3 |
| `--sketch` on `--paper` (outline) | 6.4 | 8.3 | 3 |
| `--focus` on `--paper` | 5.8 | 9.2 | 3 |
| `--lantern` on `--paper` | 1.8 | 10.9 | decoration only in day |

Rules that follow: orange text and button fills use `--accent`, never `--thread` (in day `--thread` is only 3.2:1). In day, lantern gold is never the only carrier of meaning. Outside `tokens.css` there is no raw hex.

## Line and paper

- **Outline:** `--sketch`, 2 px, Rough.js roughness about 1.4, fixed seed per element. The pencil filter (`#pencil` in `App.tsx`) stays for long lines.
- **Hatch:** `--sketch` or the hill line colour, 1 px, angle between -16 and -40 degrees, gap 7 to 11 px. Far layers are looser.
- **Contour:** closed wobbly loops in `--line`, only as texture behind the road.
- **Thread:** `--thread`, 3 px, with a 1 px `--sketch` companion line offset by 1.5 px (as in `ThreadRail`).
- **Future route:** dashed 9 on, 7 off, in `--sketch`.
- **Weights:** 1, 2 and 3 px only. Corners round at 12 px. Nothing is perfectly straight.
- **Redraw rule:** Rough.js shapes are drawn once per size change, never inside an animation frame.
- **Paper grain:** keep the existing `--grain` overlay; lighter and fainter at night.

## Type

- **Gaegu** for map lettering: year marks, stop tags, the coach's speech, the wordmark. 18 px or larger. Never for long text.
- **Atkinson Hyperlegible** for everything people read: 17 to 18 px, line-height 1.55, lines under 70 characters.
- Sentence case. No all-caps labels. No arrows on links. One name per action ("Ask the coach about this" everywhere).

## Making it feel grown-up (needs a yes before it is applied)

The map of the career road was liked, but it reads a little childish. Proposed changes, in order of effect:

1. **Type.** Keep Gaegu only for small map labels. Set the big headings and the wordmark in a calmer face (Atkinson Hyperlegible bold, or a soft serif such as Fraunces). Large hand lettering is the biggest single source of the cartoon feel.
2. **Labels.** Replace the rounded sticker-style tags with map-style labels: small text with a fine leader line to the node, and only the active stop gets a filled tag.
3. **Line work.** Finer, quieter hatching. A narrower road with one fine thread instead of a fat white band. Fewer, smaller trees. Add cartographic touches: contour lines, a small compass mark.
4. **The coach.** Keep the dot eyes, drop the smile, make the feet smaller and the rim thinner, so it reads as a character, not a toy.
5. **Palette is unchanged.**

## The road and camera

- **Layout.** One road climbs from lower left to upper right. Scenery layers, back to front: sky, far ridge, mid ridge, near ridge. Reuse the ridge code in `SceneBanner.tsx`. Depth factors: sky about 0.15, far 0.35, mid 0.6, near 0.85, road and stops 1.0. Three or four layers at most.
- **Stops.** One flag per entry, spaced evenly along the road (not by date, so busy years do not crowd), with year marks. A dashed fork, "Where next", at the end.
- **Three distances.**
  - Horizon, zoom 1: the whole road, one landmark per year. Replaces the Years toggle. On small screens tags show the year only.
  - Chapter, about 1.8: one stretch of road, entries as stops. Replaces Months.
  - Moment, about 2.8: one entry, with what / how / impact / what I learned and "Ask the coach about this" in a details panel that is always in the page flow (not an overlay).
- **Many entries.** Horizon shows one landmark per year (as the Years view does today). Chapter shows that year's entries as stops. A person with 30 entries never sees 30 flags at once.
- **Controls.** Click or tap a flag (goes to Moment). Zoom in and Zoom out buttons, and the keys `+` and `-`. Pinch on touch (pointer events, always with buttons as well). `Esc` or "Back to the map" returns to Horizon. Left and right arrows go to the previous and next stop: the coach walks, the camera follows. Normal scroll never zooms. The "Start to now" / "Now to start" toggle from the tracker reverses the order the coach walks and the List view reads; the road is drawn the same either way.
- **Motion.** 600 to 900 ms, ease-in-out (cap at 1100 ms for long trips). Zoom is interpolated geometrically so it feels even. The travelled thread draws as the coach walks. Only transform, opacity, `stroke-dashoffset` and the SVG `viewBox` change.
- **Never.** Hijack scroll. Pin more than one section. Parallax text. Require dragging.
- **List view.** `Timeline.tsx` stays as the List view with the same entries and actions. It is the default under `prefers-reduced-motion: reduce` and has a visible toggle for everyone.
- **Accessibility.** The road is `aria-hidden` scenery. Each stop is a real `<button>` in chronological DOM order with a visible `--focus` ring. Details sit in an `aria-live="polite"` region.
- **Performance.** Cache the Rough.js output. Set `will-change: transform` only while the camera moves. No animation library is needed: the moodboard demo uses plain `requestAnimationFrame`.
- **Proven in the moodboard.** Click a flag, zoom buttons, previous/next stop, `Esc`, `+`/`-`, Ctrl with the wheel, layered parallax, the coach walking with the thread drawing behind it, at desktop and phone widths (emulated). **Not proven:** touch pinch, real-phone performance, and more than five stops.

## The coach mascot: Clew

A ball of thread that is also the logo, the chat button and the favicon.

- **Shape (80 units tall).** Ball of radius 26. Two feet, ellipses 17 by 8.4. Five yarn arcs clipped to the ball. A loose end that leaves the upper right of the ball, curls once, and finishes in a four-point star about 14 units wide. Two dot eyes (radius 2.7) set slightly right of centre so it faces the way it walks. A small mouth arc (see "grown-up" above: may go).
- **Colour.** Ball `--thread`, rim `--ink`, yarn lines a dark brown mixed into `--thread`, star `--lantern` with an `--ink` outline, feet `--sketch`. Eyes and mouth are always near-black (`#2B1A10`) because they sit on the ball, in both themes. **At night the ball is gold, like the thread** (`--thread` is gold in the indigo night).
- **Night light.** The star has a soft radial glow (about 2.2 times its width) that lights the road ahead. Nothing else glows.
- **Where it lives.** On the coach button (56 px) in place of the speech-bubble glyph; on the road (about 7% of the scene height, never under 44 px); in the header lockup (40 px).
- **States, hooked to what exists.**

| State | Trigger | Motion |
| --- | --- | --- |
| Idle | default | slow bob, the loose end sways |
| Walking | camera travels, or "Ask about this" is clicked | short hops, feet alternate, thread unspools behind |
| Thinking | `busy` is true, before the first token | the yarn spins; the face stays still |
| Speaking | text is streaming | the star pulses, the body squashes a little |

- **Rules.** Animate only transform and opacity. Run one mascot animation at a time. Under reduced motion show a still pose. The words are the state ("Thinking", "Checking that you are a person"); the mascot never replaces them. In the UI it stays "the coach"; Clew is the design name.
- **Small sizes.** Below 24 px, drop the feet and mouth and keep the ball, eyes, curl and star. The moodboard's small-size test shows it holds up at 24 px and is a recognisable blob with a star at 16 px.

## Other logo directions (parked)

B, Trail-A (a mountain "A" with a road to a star): an app-icon variant if Clew is too busy at 16 px. C, the lantern fox already in `SceneBanner.tsx`: retire from the banner or keep as a small night cameo, so there is one main character. D, the labyrinth seal: a loading and empty-state pattern.

## Keep and avoid

**Keep:** paper, walnut pencil, one orange thread by day; the deep indigo and gold by night. Hand-drawn frames drawn once per size. Gaegu for map lettering, Atkinson Hyperlegible for reading. A coach that speaks first and asks one question at a time.

**Avoid:** bright purple or neon accents (night stays the deep indigo it is today). Decorative gradients, glass blur, heavy shadows. Stock illustrated people, emoji icons, sparkle icons on buttons or headings. Streaks, scores, confetti. Scroll-jacking. Parallax on text. Fade-up on every section.

## Build kit (skills)

| Skill | Use it for | When |
| --- | --- | --- |
| `frontend-design` | Aesthetic decisions that avoid templated defaults | Before writing any UI |
| `ui-ux-pro-max` | Parallax presets, motion and accessibility rules (`--stack react`) | Steps 3 to 5 |
| `react-best-practices`, `composition-patterns` | Component structure and performance in React 19 | Steps 3 to 5 |
| `writing-plans`, `executing-plans` | Turning the six steps into a checked plan | Start |
| `using-git-worktrees` | Keeping the redesign off `main` | Start |
| `verification-before-completion` | Lint, build, screenshots, both themes, before "done" | End of every step |
| `web-design-guidelines` | Final accessibility and UX audit | After step 6 |
| `code-review` | A review of the branch before merging | Before merge |
| `canvas-design` | An Open Graph image and README banner from the mark | Optional, after step 6 |

## Open questions

1. Apply the "grown-up" changes above? (Recommended: yes, in the moodboard first, then in the app.)
2. Does the coach get a name in the UI, or stay "the coach"?
3. "Show how alive the page is": the brief said "light". This reads it as alive plus lantern light. Correct if it meant something else.
4. GSAP or plain `requestAnimationFrame`? Recommended: plain, so there is no extra dependency and no licence question (GSAP is not MIT).
