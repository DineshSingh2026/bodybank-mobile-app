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
