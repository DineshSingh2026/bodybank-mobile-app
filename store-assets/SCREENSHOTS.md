# App Store Screenshots — plan and how to capture them on Windows

> **Android/Play is already done.** The current Play set was recaptured from the v1.7.3 build
> and lives in `screenshots-play-2026-08/` (six 1080×1920 captioned panels + a README with the
> upload order and the scripts that rebuild them). The older `screenshots-store/` and
> `screenshots-final/` folders are the superseded May 2026 set. This document is about the
> **iOS** sizes, which still need capturing.


App Store Connect requires screenshots in specific pixel dimensions. Your existing
`store-assets/screenshots*` folders contain Play Store (Android) sizes — Apple's are
different and need to be re-captured.

---

## Required sizes (as of 2026)

Apple consolidated phone sizes — you now need **one** iPhone size, and **one** iPad
size since your app targets both (`TARGETED_DEVICE_FAMILY = 1,2`).

| Device class | Pixel size | Required? | Minimum / Max |
|---|---|---|---|
| **iPhone 6.9" / 6.7"** (16 Pro Max, 15 Pro Max, 14 Plus) | **1320 × 2868** *(or 1290 × 2796)* | **Yes** | 3 min, 10 max |
| **iPad 13"** (M4) | **2064 × 2752** *(or 2048 × 2732 for 12.9")* | **Yes** *(because app supports iPad)* | 3 min, 10 max |
| iPhone 6.5" / 5.5" | — | Not required *(Apple downscales the 6.9")* | — |

**Aspect ratio:** portrait (taller than wide). Don't submit landscape unless your app
is landscape-only — yours isn't.

**Format:** PNG or JPG. Keep PNG for crispness; under 8 MB each.

---

## Suggested screens to capture (in this order — first 3 matter most)

App Store search results show only the **first 1-3 screenshots**, so put the
strongest ones first.

1. **Hero / value prop** — the signed-out landing with "Build Real, Sustainable
   Transformation" headline. First impression of the brand.
2. **User dashboard / Home** — what the app looks like once you're in (body
   progress, welcome). Proves the app is real.
3. **Sign in screen** — showing the **Sign in with Apple** button alongside Google
   and email. Apple reviewers like seeing 4.8 compliance up front.
4. **Nutrition tracker** — meal-photo logging with macros. Visually distinctive,
   demonstrates AI value.
5. **Blood-report upload + summary** — unique differentiator vs other fitness apps.
6. **Workouts** — sets/reps/effort logging.
7. **Elite Feed** — community / transformation posts.
8. *(Optional)* Coach chat / Sunday check-in — shows the human-coaching angle.

Add a 1-line caption overlay on each screenshot (Apple-style). Examples:
- "Your Lifestyle Manager, in your pocket"
- "Snap a meal — get instant macros"
- "Real members. Real results."

---

## How to capture from Windows (no Mac needed)

You can produce App-Store-quality screenshots entirely on Windows. Best path:

### Option A — Chrome DevTools device emulation (free, 15 min)

1. Open Chrome → DevTools (F12) → toggle device toolbar (`Ctrl+Shift+M`).
2. Click the device dropdown → **Edit** → **Add custom device**:
   - Name: `iPhone 6.9 (App Store)` · Width `1320` · Height `2868` · DPR `1` ·
     User-agent: Mobile.
   - Name: `iPad 13 (App Store)` · Width `2064` · Height `2752` · DPR `1`.
3. Switch to that device. Navigate `https://bodybank.fit/`.
4. Use the DevTools 3-dot menu → **Capture full size screenshot** for each screen.
5. Crop/scale to the exact pixel size in any image editor (the existing
   `process-screenshots.js` script could be adapted).

The captures are raw screen content — no iPhone bezel needed (Apple no longer
requires device frames, and many apps submit frameless screenshots).

### Option B — Device-frame mockup tools (nicer, 30 min)

If you want a stylized look with a phone frame, captions, and a colored
background:

- **https://appmockup.com** — free, includes iPhone/iPad templates at the right
  resolutions.
- **https://www.applaunchpad.com** — paid but very polished.
- **Figma + iOS device kit** — full control; export at 1320 × 2868.

Upload your Chrome captures into one of these, add captions, export at the App
Store sizes.

### Option C — Borrow a Mac for an afternoon

If you have any access to a Mac, the cleanest path is the iOS Simulator
(Xcode → Simulator → iPhone 15 Pro Max / iPad Pro 13" → run the app → Cmd+S for a
screenshot at the exact correct size). 10 minutes for all 10.

---

## Uploading

App Store Connect → My Apps → BodyBank → iOS App → [version] → drag the PNGs into
the two device-size dropzones. Order them by dragging — the first 3 are the ones
that show in search.

---

## Quick checklist before you upload

- [ ] Status bar in each screenshot looks clean *(full battery, full signal, sensible
      time like 9:41 — the "Apple time"; the simulator does this automatically)*
- [ ] No real personal data visible (use the demo account for captures)
- [ ] No system overlays / notifications visible
- [ ] No competitors' names, no third-party brand logos
- [ ] All screenshots are at the exact pixel size *(Apple silently rejects close-but-
      not-exact sizes)*
- [ ] Captions are spelled correctly and don't make medical claims you can't back up
