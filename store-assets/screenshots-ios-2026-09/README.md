# App Store screenshots — September 2026 (iOS 1.0.0)

Upload these six PNGs to **App Store Connect → BodyBank - Lifestyle → 1.0.0 → iPhone 6.9"
Display**, in filename order. **Only the first 1–3 appear in App Store search results**, so
keep `01`, `02` and `03` at the front.

| # | File | Headline | Screen |
| - | ---- | -------- | ------ |
| 1 | `01-home.png` | Your whole day, on one screen. | Member home — 27-day streak, "Today is complete" |
| 2 | `02-food-macros.png` | Snap the plate. Macros in seconds. | Nutrition — meal photos, macros, meal score |
| 3 | `03-messages.png` | Your coach, in one thread. | Coach thread with the Lifestyle Manager |
| 4 | `04-home-day.png` | Today, measured against your goals. | Steps / water / protein / sleep against targets |
| 5 | `05-weekly.png` | The week, scored. | Last-week performance |
| 6 | `06-checkin.png` | Four numbers. Ten seconds. | Daily check-in inputs |

All six are **1320 × 2868 PNG** — the iPhone 6.9" size, which Apple downscales for every
smaller iPhone. Each is ~2–3 MB, well inside the 8 MB cap.

## How they were made

`scripts/build-ios-screenshots.js` composes them from
`store-assets/screenshots-play-2026-08/source-captures/*.png` — 1170 × 2532 captures of the
**real running app**, taken from the live member shell against a seeded demo account
(`store.demo@bodybank.fit`, "Arjun Mehta") that was deleted afterwards. No mockups, and no
real member's data appears.

The display area keeps the capture's native 1170:2532 aspect, so nothing is stretched or
cropped. Only the framing is composed: gold radial ground, BODYBANK wordmark, eyebrow,
two-line headline, subline, gold-edged bezel — matching the Play listing so the two stores
read as one brand.

Rebuild with:

```powershell
node scripts/build-ios-screenshots.js
```

## Still outstanding: iPad

The app ships with `TARGETED_DEVICE_FAMILY = "1,2"`, so App Store Connect **also requires an
iPad 13" set at 2064 × 2752** (minimum 3). Those need fresh captures at an iPad viewport —
the phone captures cannot be reframed into a 3:4 canvas honestly. Either capture them, or
drop to iPhone-only by setting `TARGETED_DEVICE_FAMILY = "1"`.
