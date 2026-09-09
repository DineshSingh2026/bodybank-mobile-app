# App Store screenshots — September 2026 (iOS 1.0.0)

**Recaptured 2026-09-09, after the Elite Feed removal.** The previous set showed the
Elite Feed entry in the iPad sidebar and the Elite Feed floating button on the iPhone home
screen — a feature the app no longer has. Apple requires screenshots to show the app as it
actually is, so every panel here was captured again from the current build.

Upload the six PNGs from the folder matching whichever tab you are on, in filename order.
**Only the first 1-3 appear in App Store search results**, so keep 01, 02 and 03 at the front.

| Folder | Size | App Store Connect tab |
| ------ | ---- | --------------------- |
| `iphone-6.9/` | 1320 x 2868 | iPhone 6.9" Display |
| `iphone-6.5/` | 1284 x 2778 | iPhone 6.5" Display |
| `ipad-13/`    | 2064 x 2752 | iPad 13" Display |

App Store Connect validates these dimensions exactly. Uploading a 6.9" file into the 6.5"
tab fails with "The dimensions of one or more screenshots are wrong" — that is a wrong-tab
error, not a bad file. You only need to fill ONE iPhone tab; Apple downscales for the rest.
The iPad tab is required because the app declares `TARGETED_DEVICE_FAMILY = "1,2"`.

## iPhone set

| # | File | Headline | Screen |
| - | ---- | -------- | ------ |
| 1 | `01-home.png`    | Your whole day, on one screen. | Member home — 27-day streak, Your Day |
| 2 | `02-goals.png`   | Today, measured against your goals. | Steps / water / protein / sleep vs targets |
| 3 | `03-coach.png`   | Your coach, in one thread. | Coach thread with the Lifestyle Manager |
| 4 | `04-checkin.png` | Four numbers. Ten seconds. | Daily check-in |
| 5 | `05-train.png`   | Log the session while it is fresh. | Workout logging |
| 6 | `06-week.png`    | The week, scored. | Weekly score and progress |

## iPad set

| # | File | Screen |
| - | ---- | ------ |
| 1 | `01-home.png`    | Member home on iPad — sidebar nav, streak, goals, weekly score |
| 2 | `02-train.png`   | Workout logging — timer, intensity/energy, notes |
| 3 | `03-coach.png`   | Coach thread |
| 4 | `04-landing.png` | Signed-out landing page |

The iPad files are **straight captures, not composites**: headless Chrome at a 1032 x 1376
viewport with `deviceScaleFactor: 2` lands exactly on 2064 x 2752, so no rescaling or
framing is applied. At that width the member shell switches to its desktop layout with a
left sidebar, which is the real behaviour a reviewer sees.

## How they were made

1. A temporary demo member (`store.shot@bodybank.fit`, "Arjun Mehta") was seeded into the
   LOCAL dev database with 27 days of check-ins, a weight trend and a coach thread — the
   real local data has too little activity, so every screen would capture as an empty state.
2. A server was started on port 3099 running the **current** code, and the capture script
   signed in through the real form. (The dev server mints a random per-process JWT secret,
   so an externally minted token will not verify.)
3. `scripts/build-ios-screenshots.js` composed the iPhone panels from the 1170 x 2532
   captures in `source-captures/`. The display area keeps the capture's native aspect, so
   nothing is stretched or cropped; only the framing is composed.
4. The demo account was deleted and verified: member count back to 9, zero orphaned
   `thread_messages`, and a `tribe_members` row keyed by **email** rather than user_id was
   swept too — that one survived deletion in an earlier session.

**No real member's data appears in any screenshot.**

Rebuild the iPhone panels from the existing captures with:

```powershell
node scripts/build-ios-screenshots.js
```
