# Voice input — everything the two stores need (v1.7.9 / versionCode 107)

The long check-in questions gained an optional **"Speak your answer"** button. That adds
one runtime permission on each platform, which means both consoles need updating. This
file is the complete list — work top to bottom.

## The one fact both stores turn on

> The **device's own speech service** (Android `SpeechRecognizer`, iOS `SFSpeechRecognizer`)
> captures and transcribes. It returns **text**. BodyBank never receives, writes or uploads
> audio — no recording file is created and **no server endpoint accepts audio**. Only the
> text the member reads, edits and confirms is saved, into the same check-in field they
> could always have typed into.

Everything below follows from that. If voice is ever changed to upload audio to our own
server or a third-party transcription API, **every answer here changes** — come back and
redo this file.

---

## 1. Google Play Console

### Data safety → Data types

**Do NOT tick "Audio files → Voice or sound recordings."**

That category means the app collects or shares audio. We don't: the OS transcribes and we
receive text. Ticking it would be over-declaring, and it drags in the *Sensitive data*
handling questions for no reason.

The dictated text lands in the same place typed text always did, which is already declared.
If check-in answers are not yet covered, declare them under:

| Field | Answer |
|---|---|
| Data type | **Personal info → Other info** (free-text check-in answers) |
| Collected | Yes |
| Shared | No |
| Processed ephemerally | No — stored |
| Required or optional | Required (it's the check-in) |
| Purpose | **App functionality** (and *Personalisation* if already ticked for coaching) |

### Data safety → the "does your app collect audio" prompt

Answer **No**, with this rationale kept on file if anyone asks:

> The microphone is used only for on-request dictation. Audio is captured and transcribed
> by the Android system speech service and never reaches BodyBank's servers or storage.
> The app has no audio upload endpoint and creates no recording file.

### App content → Permissions

`RECORD_AUDIO` is a normal runtime permission, **not** one of the restricted permissions
that needs a declaration form. There is no "Prominent Disclosure" form to fill for it — that
requirement applies to location, SMS/Call Log, All Files Access, and the Photo/Video
permissions that got versionCode 100 rejected. **Nothing to submit here.** Do not confuse it
with that earlier rejection.

Still true and worth re-checking on this release: the merged manifest contains **no**
`READ_MEDIA_*` and **no** `*_EXTERNAL_STORAGE`. Verified on this build — the permissions
that ship are exactly:

```
ACCESS_NETWORK_STATE  CAMERA  INTERNET  POST_NOTIFICATIONS
RECORD_AUDIO  VIBRATE  WAKE_LOCK
```

### Store listing

No change required. If you want to mention it, add to "What's new":

> Prefer talking to typing? Long check-in questions now have a "Speak your answer" button —
> dictate it, check the text, edit anything, save. Typing works exactly as before.

---

## 2. App Store Connect

### App Privacy

**Leave "Audio Data" unticked.** Apple defines collection as data sent off the device *to you
or your third-party partners*. The system speech service is neither. See the expanded note in
[APP_PRIVACY.md](APP_PRIVACY.md) — it now carries the reviewer-facing wording verbatim.

The dictated text is already covered by **User Content → Other User Content** (Sunday
check-in answers). No new data type to declare.

### Info.plist strings — already in the build

Apple rejects a mic permission with a vague or missing purpose string. Both are set, and both
name the feature and say audio is not kept:

- `NSMicrophoneUsageDescription`
- `NSSpeechRecognitionUsageDescription`

`NSSpeechRecognitionUsageDescription` is the one people forget — without it the app
**crashes** the first time speech recognition starts. It is present.

### Review notes

[APP_REVIEW_INFO.md](APP_REVIEW_INFO.md) has been corrected — it previously said
*"no microphone"*, which would have flatly contradicted the Info.plist and invited a
rejection. It now explains the feature and gives the reviewer a path to it:

> Check-in → Sunday check-in → any question marked "detailed answer please"

### Guideline 5.1.1 — purpose strings and permission timing

We are compliant by construction: the permission is requested **only** on the first tap of
"Speak your answer", never at launch, and declining it leaves the form fully usable by typing.
That is exactly what 5.1.1(ii) asks for.

---

## 3. Privacy policy — done, but must be deployed

`https://bodybank.fit/privacy` is checked by both stores. It has been updated in the web repo
(`public/privacy.html`): microphone added to the app-permissions list, a new *About voice
input* paragraph, and the check-in-answers line in section 2. "Last updated" moved to
10 September 2026.

**This is a web deploy, not an app release** — push the `bodybank` repo to Render and confirm
the live URL shows the new text **before** submitting either build. A reviewer hitting the old
policy that says the app has no microphone is a rejection.

---

## 4. Pre-submission checklist

- [ ] Web repo deployed; `https://bodybank.fit/privacy` shows *About voice input*
- [ ] `Permissions-Policy: microphone=(self)` live (the web voice option is dead without it)
- [ ] Android build tested on a real device — mic prompt appears on first tap only
- [ ] iOS build tested on a real device — **two** prompts (microphone, then speech recognition)
- [ ] Play Data safety saved with Audio files **unticked**
- [ ] App Privacy saved with Audio Data **unticked**
- [ ] Review notes pasted from `APP_REVIEW_INFO.md` (the corrected version)
- [ ] Declining the mic still leaves the form typable — check this, it is the 5.1.1 answer

---

## 5. Release mechanics — read before pushing

Per the standing rule in this project, **pushing `bodybank-app` main auto-publishes to Play**.
Both CI workflows are manual-start only, and Android and iOS are released separately with
their exact commands. Nothing here changes that: this file prepares the submission, it does
not authorise a push.
