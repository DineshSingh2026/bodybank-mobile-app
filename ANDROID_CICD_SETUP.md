# Android CI/CD — auto-ship to closed testing (Codemagic)

The `android-closed-testing` workflow in [`codemagic.yaml`](codemagic.yaml) builds a
**signed AAB** and uploads it to your Google Play **closed-testing** track on every
push to `main`. Runs on Linux — no Mac needed.

After the one-time setup below, the only manual step for a future web change is:

```bash
# in this repo (bodybank-app)
npm run sync          # mirror ../bodybank/public -> www/  (+ cap sync android)
git add www android
git commit -m "chore: sync web vX.Y"
git push origin main  # <-- Codemagic auto-builds + ships to closed testing
```

You do **not** bump `versionCode` by hand anymore — CI sets a unique, increasing
one automatically (`PROJECT_BUILD_NUMBER + 100`).

---

## One-time setup in the Codemagic UI

### 1. Connect the repo
Codemagic → **Add application** → connect `DineshSingh2026/bodybank-mobile-app`
(GitHub). Pick "I have a `codemagic.yaml`".

### 2. Upload the release keystore
Codemagic → **Teams → Code signing identities → Android keystores → Add key**:
- **Upload** `C:\Users\Admin\Documents\BodyBank-Keys\bodybank-release.keystore`
- **Keystore password**, **Key alias**, **Key password** — the same values that are
  in your local `android/keystore.properties`.
- **Reference name:** `bodybank_keystore`  ← must match `android_signing` in the yaml.

### 3. Create a Google Play service account (for auto-upload)
This is **separate** from the Firebase service account.

1. [Play Console](https://play.google.com/console) → **Setup → API access**
   (or **Users and permissions**).
2. Create / link a **Google Cloud service account**, grant it access to this app
   with at least **Release to testing tracks** permission.
3. In Google Cloud Console, create a **JSON key** for that service account and
   download it.
4. Codemagic → app → **Environment variables**:
   - Variable name: `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
   - Value: paste the entire JSON file contents
   - Group: `google_play`  ← must match `groups` in the yaml
   - Mark as **Secure**.

### 4. Set the track name
In [`codemagic.yaml`](codemagic.yaml), set `GOOGLE_PLAY_TRACK` to your closed-testing
track's name as it appears in Play Console → **Testing**:
- Internal testing track → `internal`
- A custom closed track → use that track's name.

> First upload caveat: Google Play won't accept an automated upload to a track
> until the app has had **at least one manual release** on that track and the app
> listing basics are complete. You've already uploaded manually, so you're set.

---

## How versioning works now
- Local builds: `versionCode 10`, `versionName 1.3.1` (the literals in `build.gradle`).
- CI builds: `versionCode = PROJECT_BUILD_NUMBER + 100` (always > any prior upload),
  injected via the `ANDROID_VERSION_CODE` env var. `versionName` stays the literal
  unless you also set `ANDROID_VERSION_NAME`.

## Trigger
Pushes to `main` trigger a build (see `triggering` in the yaml). You can also hit
**Start new build** in the Codemagic UI anytime.
