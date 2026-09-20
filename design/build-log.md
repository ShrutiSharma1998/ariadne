# Build log: the road redesign, finished on 2026-09-20

Branch `redesign/road`, nine commits on top of the step 1 to 4 work that is already live. Built in one session with the owner present, from the brief in `overnight-prompt.md`. Everything was tested in mock mode (no real AI was called).

## What was built

| Task | Commit | What |
| --- | --- | --- |
| 1 | `689f24a` | The List view is gone; the road is the only timeline. |
| 2 | `12041ae` | Paths save (paths, reactions, reasons, note, chosen path) under `ariadne-paths-v1`. Every button shows a result. New: "I'm going with this one". |
| 3 | `b6e71a4` | The road ends at the chosen path: a flag, and up to six dashed step markers you can zoom into. Smarter label placement. |
| 4 | `182a6c2` | The Paths page uses the road panel's card style. |
| 5 | `d9152ee` | The coach button thinks while waiting and speaks while text streams. |
| 6 | `bfaf9e6` | The coach knows the chosen path (small additive server change, 12 new smoke checks). |
| 7 | `82617f4` | Phone and accessibility pass, 30-entry stress test, guideline fixes. |
| 8 | `0c66ea2` | "Add this to my timeline" under a message you typed (single commit; revert it alone if unwanted). |
| 9 | `d7dccb5` | Pinch to zoom, and the "Start to now" / "Now to start" switch. |

## Decisions taken alone

- Restoring a backup clears the saved paths (they were about the timeline it replaces). Adding files keeps them. Deleting the timeline clears them.
- After "Refine my paths", a reaction is kept only if its path still exists; the chosen path is kept only if a path with that title still exists, and a message says so.
- Pressing the same reaction twice takes it back. Reasons save as you type.
- With a chosen path, the experiences use the first 62% of the road and the steps the last part. Without one, the layout is exactly as before.
- A label with no clear spot is hidden until its marker is hovered or focused, rather than overlapping another label or the coach.
- The switch "Start to now / Now to start": the arrow keys stay left and right on the road; switching returns to the whole road; **Zoom in from the whole road now starts at the first year** (it used to start at the latest).
- The road panel style now applies to every card and panel (no offset shadow), including the upload panel.
- Web-interface guideline items that conflict with the owner's rules were skipped: Title Case headings, placeholders ending in an ellipsis, loading text ending in an ellipsis.
- Chat to timeline is refused at 40 experiences (the server's limit), and hidden in the sample story.

## Not verified

- A real phone: touch, real pinch, real speed. Pinch was checked with synthetic two-finger events only.
- A real screen reader. Reduced motion: the jump-instead-of-animate code ran (the media query was forced on), but the CSS rule and a real user setting were not tested.
- The real AI: mock mode only. The chosen-path prompt is checked as text, not by asking the model.
- The 30-entry test used made-up data in the test browser and was removed afterwards.

## Known issues

- **Uploading more files can push a timeline past 40 experiences.** The saved copy then fails to load after a reload, so the timeline would vanish. This existed before this work; chat-to-timeline refuses at 40, but `handleLoaded` in `App.tsx` does not. It needs a product decision (drop the oldest? a way to delete entries?).
- At phone width with many years, some year labels wait behind their markers until tapped. The details panel and zoom still show everything.
- The sister/tester message says Paths choices are not saved and the coach cannot add to the timeline. Both are true only for the live site until this branch is merged.

## How to review

```
git log --oneline main..HEAD
git diff main..HEAD --stat
npm run dev            # uses the real AI key in .env.local; set MOCK_AI=1 to stay free
```
