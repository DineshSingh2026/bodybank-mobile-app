# Play Store screenshots — August 2026 (v1.7.3)

The listing was still showing captures from **May 2026**, taken before the member home,
nutrition pane, coach thread and weekly review were rebuilt. These replace them.

Upload the six PNGs in this folder to **Play Console → Grow → Store presence → Main store
listing → Phone screenshots**, in filename order. Drag to reorder if needed — **only the
first 2–3 appear in search results**, so keep `01`, `02` and `03` at the front.

| # | File | Headline | Screen |
| - | ---- | -------- | ------ |
| 1 | `01-home.png` | Your whole day, on one screen. | Member home — 27-day streak, "Today is complete" |
| 2 | `02-food-macros.png` | Snap the plate. Macros in seconds. | Nutrition — meal photos, macros, meal score |
| 3 | `03-messages.png` | Your coach, in one thread. | Coach thread with the Lifestyle Manager |
| 4 | `04-home-day.png` | Today, measured against your goals. | Steps / water / protein / sleep against targets |
| 5 | `05-weekly.png` | The week, scored. | Last-week performance, every target on track |
| 6 | `06-checkin.png` | Four numbers. Ten seconds. | Daily check-in inputs + weekly insights |

All six are **1080 × 1920 PNG** (9:16, ~1.1–1.5 MB each) — inside Play's limits (2–8 images,
320–3840 px, aspect between 16:9 and 9:16, 8 MB max).

## What is in the pictures

Every screenshot is the **real app**, captured from the current build against a local server
— not a mockup. What is staged is only the *data*:

- A demo member (`store.demo@bodybank.fit`, "Arjun Mehta") seeded locally with 27 days of
  check-ins, three logged meals, a coach thread and two weeks of readiness. The account and
  all of its rows were deleted after the capture. **No real member's data appears.**
- The meal photos are BodyBank × Fitchef's own plates, cropped out of the marketing cards in
  `bodybank/public/img/fitchef meals/` so that the members' names on those cards do not ship
  in a store image.
- The `LOGOUT` chip is hidden during capture. It is page chrome, not a feature; a red button
  in the corner of all six images reads as clutter. Nothing else about the UI is altered.

## Reproducing these

The three scripts live in the session scratchpad, not in the repo, because they depend on a
running local server and a seeded database. To rebuild after a UI change:

1. `node seed-store-demo.js` (from the web repo root) — creates the demo member and data.
2. `node server.js` in the web repo.
3. `node capture-store.js` — mints a JWT, drives headless Chrome at 390×844 @3×, writes
   `raw/`. Scene scroll offsets are tuned per screen; the scroll container is found at
   runtime because the member shell locks body scroll.
4. `node build-panels.js` — composes `raw/` into these 1080×1920 panels.
5. `node seed-store-demo.js --clean` — removes the demo member and every row it created.

`source-captures/` holds the untouched 1170 × 2532 frames the panels were built from. They
are **1:2.16, taller than Play's 9:16 limit**, so they cannot be uploaded as-is — crop or
re-frame them first if you ever want frameless images.

## Not changed

`../feature-1024x500.png` and `../icon-512.png` are brand assets with no app UI in them, so
they did not go stale with the redesign. Leave them as they are.
