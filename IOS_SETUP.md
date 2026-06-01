# BodyBank iOS — Publishing Guide

This app is a Capacitor wrapper. **Android** builds locally on Windows. **iOS** cannot
be built on Windows (Apple requires macOS + Xcode), so we build it on a **cloud Mac**
via **Codemagic**. You drive everything from Windows + a browser.

## What's already done (locally, on Windows)

- [x] iOS platform added (`@capacitor/ios`, `ios/` Xcode project) — bundle id `com.bodybank.app`
- [x] Camera + Photo Library permission strings added to `ios/App/App/Info.plist`
- [x] iOS app icons + splash screens generated (`Assets.xcassets`)
- [x] iOS config in `capacitor.config.json` (dark background, content inset)
- [x] npm scripts: `sync:ios`, `build:assets:ios`, `cap:open:ios`
- [x] `codemagic.yaml` build/sign/publish pipeline
- [x] `.gitignore` set so `www/` (the web payload) IS committed for CI

## Refreshing the web app before a release

`www/` is a snapshot of `../bodybank/public`. Whenever the website changes, refresh and
commit it:

```powershell
npm run sync:ios      # rebuilds www/ from ../bodybank/public and syncs into ios/
git add -A
git commit -m "chore(ios): sync web payload"
git push
```

A push triggers a Codemagic build automatically (once connected).

---

## Step 1 — Apple Developer Program ($99/year)

1. Go to https://developer.apple.com/programs/enroll/
2. Enrol with your Apple ID (individual or organization — organization needs a D-U-N-S number).
3. Wait for approval (usually hours, sometimes a couple of days).

## Step 2 — Create the app in App Store Connect

1. https://appstoreconnect.apple.com → **My Apps → + → New App**
2. Platform: iOS. Bundle ID: `com.bodybank.app` (create it if not listed — Certificates,
   Identifiers & Profiles → Identifiers → +).
3. Name: **BodyBank - Lifestyle**. Primary language, SKU (any unique string).
4. After creation, note the **Apple ID** (a long number) under
   *App Information → General Information → Apple ID*. You'll paste it into `codemagic.yaml`
   as `APP_STORE_APPLE_ID`.

## Step 3 — App Store Connect API key (for automated signing/upload)

1. App Store Connect → **Users and Access → Integrations → App Store Connect API**
2. Generate an **Team Key** with **App Manager** role. Download the `.p8` file (one-time download).
3. Note the **Issuer ID** and **Key ID**.

## Step 4 — Put this folder in a Git repo and push

`bodybank-app` is not yet a Git repo. CI builds from Git, so:

```powershell
git init
git add -A
git commit -m "feat(ios): add iOS platform + Codemagic pipeline"
# Create a PRIVATE repo on github.com (the committed www/ contains your web app),
# then:
git remote add origin https://github.com/<you>/bodybank-app.git
git branch -M main
git push -u origin main
```

> Make the GitHub repo **private** — `www/` contains a full copy of the BodyBank web app.

## Step 5 — Connect Codemagic

1. https://codemagic.io → sign up (free tier: 500 macOS build-minutes/month).
2. **Add application** → connect your Git provider → pick `bodybank-app`.
3. **Teams → Integrations → App Store Connect**: add the API key from Step 3
   (Issuer ID, Key ID, upload the `.p8`). Give it a **name**.
4. Edit `codemagic.yaml` and fill the three placeholders:
   - `<APP_STORE_CONNECT_KEY_NAME>` → the integration name from step 3 above
   - `APP_STORE_APPLE_ID` → the numeric Apple ID from Step 2
5. Commit + push. Codemagic builds, signs (auto-creates cert + profile), and uploads to
   **TestFlight**.

## Step 5b — Configure Sign in with Apple (required by Apple Guideline 4.8)

The code is **already implemented** (native sheet in the iOS app, web button on the site,
backend token verification). You only need to switch it on in the Apple portal + set env vars.
No private key / client secret is needed — the server verifies Apple's identity token directly.

**In the Apple Developer portal** (https://developer.apple.com/account → Certificates,
Identifiers & Profiles):

1. **App ID** → open `com.bodybank.app` → enable the **Sign In with Apple** capability → Save.
   (The app already ships the matching entitlement in `ios/App/App/App.entitlements`.)
2. **For the website button** (optional but recommended): create a **Services ID**
   (Identifiers → + → Services IDs), e.g. `com.bodybank.web`. Enable Sign In with Apple on it,
   click **Configure**, set the **Primary App ID** to `com.bodybank.app`, add your domain
   (`bodybank.fit`) and the **Return URL** `https://bodybank.fit/`. Verify the domain
   (Apple gives you a file to host).

**Set these env vars on your server** (Render → Environment, and `.env` locally):

```
APPLE_BUNDLE_ID=com.bodybank.app          # native iOS audience (already the default)
APPLE_SERVICE_ID=com.bodybank.web         # only if you set up the web Services ID above
APPLE_REDIRECT_URI=https://bodybank.fit/  # must match the Return URL on the Services ID
```

Notes:
- The **iOS app** works with just step 1 + `APPLE_BUNDLE_ID` (uses the native sheet).
- The **website** button only appears when `APPLE_SERVICE_ID` is set; it does **not** work on
  `localhost` (Apple requires a verified https domain).
- The button is **hidden inside the Android app**, so Android/Play is unchanged.

## Step 5c — Reviewer demo account (required, auto-seeded)

Apple reviewers cannot wait for the admin to approve their signup, so the server
auto-creates a **pre-approved** demo user from these env vars (already wired in
`server.js`). Set them and redeploy:

```
APPLE_REVIEW_EMAIL=apple-reviewer@bodybank.fit
APPLE_REVIEW_PASS=BodybankReview!2026
```

(Use any values you like — but use the same ones in App Store Connect → App Review
Information, see `bodybank-app/store-assets/APP_REVIEW_INFO.md` for the full template.)

## Step 5d — Store listing, privacy, screenshots

Ready-to-paste templates live in `bodybank-app/store-assets/`:

- **APP_REVIEW_INFO.md** — demo credentials + reviewer notes
- **APP_STORE_LISTING.md** — name, subtitle, description, keywords, age-rating answers
- **APP_PRIVACY.md** — every data type the app collects mapped to Apple's questionnaire
- **SCREENSHOTS.md** — required pixel sizes + how to capture them from Windows

## Step 6 — TestFlight → App Store

1. In App Store Connect → **TestFlight**, the build appears after a few minutes of
   "Processing". Test it on your iPhone via the TestFlight app.
2. Fill the **App Store** listing: screenshots (6.7" + 6.5" required), description,
   keywords, support URL, **privacy policy URL** (you already have `/privacy`), and the
   **App Privacy** questionnaire (declare camera/photo usage + any data collected).
3. Set `submit_to_app_store: true` in `codemagic.yaml` (or submit manually in App Store
   Connect) → **Submit for Review**.

---

## Notes / gotchas

- **App Privacy questionnaire** is mandatory and must match the `Info.plist` permissions
  (camera, photos) and any analytics/account data BodyBank collects.
- **Demo account**: handled (Step 5c). The server auto-seeds a pre-approved reviewer
  user from `APPLE_REVIEW_EMAIL` / `APPLE_REVIEW_PASS`.
- **Sign in with Apple**: implemented (Step 5b). Required because the app offers Google
  sign-in. Turn it on in the Apple portal + set the env vars before submitting.
- **Account deletion (Guideline 5.1.1(v))**: implemented — a "Delete account" button on
  the user dashboard opens a password-confirmed delete that cascades through the user's
  data. No reviewer action needed.
- iOS deployment target is **14.0** (set in the Xcode project).
- Build number auto-increments per Codemagic build; marketing version (`1.0`) is set in
  the Xcode project — bump it for each public release.
