# App Store screenshots — September 2026 (iOS 1.0.0)

Two folders, one per size tab in App Store Connect. Upload the six PNGs from the folder
matching whichever tab you are on, in filename order. **Only the first 1-3 appear in App
Store search results**, so keep 01, 02 and 03 at the front.

| Folder | Size | App Store Connect tab |
| ------ | ---- | --------------------- |
| `iphone-6.9/` | 1320 x 2868 | iPhone 6.9" Display |
| `iphone-6.5/` | 1284 x 2778 | iPhone 6.5" Display |

App Store Connect validates these dimensions exactly. Uploading a 6.9" file into the 6.5"
tab fails with "The dimensions of one or more screenshots are wrong" — that is a wrong-tab
error, not a bad file.

| # | File | Headline | Screen |
| - | ---- | -------- | ------ |
| 1 | `01-home.png` | Your whole day, on one screen. | Member home, 27-day streak, "Today is complete" |
| 2 | `02-food-macros.png` | Snap the plate. Macros in seconds. | Meal photos, macros, meal score |
| 3 | `03-messages.png` | Your coach, in one thread. | Coach thread with the Lifestyle Manager |
| 4 | `04-home-day.png` | Today, measured against your goals. | Steps / water / protein / sleep vs targets |
| 5 | `05-weekly.png` | The week, scored. | Last-week performance |
| 6 | `06-checkin.png` | Four numbers. Ten seconds. | Daily check-in inputs |

Each file is roughly 2-3 MB, well inside Apple's 8 MB cap.

## How they were made

`scripts/build-ios-screenshots.js` composes them from
`store-assets/screenshots-play-2026-08/source-captures/*.png` — 1170 x 2532 captures of the
**real running app**, taken from the live member shell against a seeded demo account
(`store.demo@bodybank.fit`, "Arjun Mehta") that was deleted afterwards. No mockups, and no
real member's data appears.

Both sizes share one proportional layout, so the set looks identical in either tab. The
display area keeps the capture's native 1170:2532 aspect, so nothing is stretched or
cropped; only the framing is composed — gold radial ground, BODYBANK wordmark, eyebrow,
two-line headline, subline, gold-edged bezel — matching the Play listing so both stores
read as one brand.

Rebuild both sets with:

```powershell
node scripts/build-ios-screenshots.js
```

To add another size, append to `SIZES` at the top of that script; the layout scales itself.

## Still outstanding: iPad

The app ships with `TARGETED_DEVICE_FAMILY = "1,2"`, so App Store Connect **also requires an
iPad 13" set at 2064 x 2752** (minimum 3), and will not accept a submission without it.
Those need fresh captures at an iPad viewport — a 1170 x 2532 phone capture cannot honestly
be reframed into a 3:4 canvas. Either capture them, or drop to iPhone-only by setting
`TARGETED_DEVICE_FAMILY = "1"`.

---

## iPad 13" set (added September 2026)

`ipad-13/` holds four **2064 x 2752** captures for the **iPad 13" Display** tab. Upload all
four in filename order.

| # | File | Screen |
| - | ---- | ------ |
| 1 | `01-home.png` | Member home on iPad — sidebar nav, 27-day streak, Your Day, goals vs targets, weekly score |
| 2 | `02-workout.png` | Workout logging — session timer, intensity/energy, notes |
| 3 | `03-coach.png` | Coach thread with the Lifestyle Manager |
| 4 | `04-landing.png` | Signed-out landing page |

These are **straight captures, not composites**. Headless Chrome at a 1032 x 1376 viewport
with `deviceScaleFactor: 2` produces exactly 2064 x 2752, so no rescaling or framing is
applied and what Apple sees is what an iPad renders.

The app is responsive rather than iPad-specific: at this width the member shell switches to
its desktop layout with a left sidebar, which is why these look nothing like the phone
panels. That is the real behaviour a reviewer will see.

### Reproducing them

Capture scripts live in a scratchpad, not the repo, because they need a running local
server and a seeded database:

1. `seed-ipad-demo.js` — creates `ipad.demo@bodybank.fit` ("Arjun Mehta") with 27 days of
   check-ins, a weight trend and a coach thread. Every id column in `daily_checkins`,
   `weight_logs`, `message_threads` and `thread_messages` is `text` with **no default**, so
   ids must be supplied explicitly.
2. `capture-ipad.js` — signs in through the real form (the dev server generates a random
   per-process JWT secret, so an externally minted token will not verify), clears the
   onboarding/guide/photo-prompt gates, then drives `switchUserTab()` between screens.
3. `cleanup-ipad-demo.js` — deletes every seeded row and verifies the counts.

The demo account was removed after capture: member count returned to 9, zero orphaned
`thread_messages`. **No real member's data appears in any screenshot.**

### A note on screen choice

Content-light screens look sparse on a 13" canvas — the check-in chooser is two cards on a
mostly empty page. The four above were picked because they fill the frame. If you add more,
prefer screens with real content over navigation screens.
