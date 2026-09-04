# Guideline 2.1 reply — BodyBank 1.0.0

Apple's "Information Needed" letter for a new developer account. Paste sections 2-6 into
**Resolution Center** AND into **App Store Connect → App Review Information → Notes**, so
future submissions inherit the answers. Section 1 is a screen recording you capture yourself.

Replace `<APPLE_REVIEW_PASS>` with the password set in the Render environment variable of
the same name.

---

## 1. Screen recording — what to capture

Record on a **physical iPhone** running the latest iOS, using the TestFlight build. Do not
use a simulator. Start the recording, then launch the app from the home screen.

iPhone: **Settings → Control Centre → add Screen Recording**, then swipe down and tap the
record button. Stop via the red pill at the top. The file lands in Photos.

Aim for 3-5 minutes. Do not narrate; Apple only needs to see the flows.

Capture, in this order:

1. **Launch** from the home screen — show the splash and the signed-out landing.
2. **Account registration** — tap Join, complete the signup form, and show the approval
   screen a new member sees.
3. **Login** — sign in with the reviewer account below.
4. **Home** — streak, Your Day, goals against targets, weekly score.
5. **Nutrition** — photograph or attach a meal, run the analysis, show the macros returned.
6. **Body progress** — upload a progress photo, add a measurement.
7. **Blood report** — upload a sample PDF, show the generated summary.
8. **Workout** — open an assigned programme, log a session.
9. **Coach messaging** — send a message to the Lifestyle Manager.
10. **Elite Feed** — show a post, **and the report and block controls on it**.
11. **Account deletion** — Profile tab, Danger zone, "Delete account", through the
    password confirmation to completion.

Items 2, 10 and 11 are the ones Apple named explicitly. Do not skip them.

---

## 2. Purpose and target audience

BodyBank is a lifestyle coaching platform. Each member is paired with a human coach — their
"Lifestyle Manager" — and the app is where the coaching relationship lives day to day.

**The problem it solves.** Most fitness apps count things and stop there. They tell a person
they walked 6,000 steps and leave them to work out what to do about it. People who have
already tried crash diets and 30-day challenges do not need another tracker; they need
structure, a professional reading their data, and someone to answer to.

**What BodyBank does.** Members log daily habits (steps, water, protein, sleep), photograph
meals to get calorie and macro estimates, upload body progress photos and measurements,
upload blood laboratory reports for a plain-English summary, follow workout programmes
assigned by their coach, and message that coach directly. Coaches see all of it and adjust
the plan.

**Target audience.** Adults, 25-45, who want sustainable change rather than a short
challenge, and who are willing to pay for professional guidance. The service originates in
India, and members are predominantly Indian, though nothing in the app is region-locked.

**Value.** Continuity. The app is a shared record between a member and a real coach, so
advice is based on what actually happened rather than on what the member remembers.

---

## 3. Setup and access instructions

### Demo account (already approved, ready to use)

```
Email:    apple-reviewer@bodybank.fit
Password: <APPLE_REVIEW_PASS>
```

There is only one account type reachable in the app: **member**. Administrator and coach
tools are on the same platform but behind separate roles and are not part of this review.

**Important:** normal signups are held for manual approval so a coach can be assigned. The
account above is **pre-approved** and bypasses that wait, so sign in directly rather than
registering. Registration can still be demonstrated with any address — it will show the
"pending approval" screen, which is the correct behaviour for a coaching service.

### Reaching each feature after signing in

| Feature | Path |
|---|---|
| Home / daily targets | opens on sign-in |
| Daily check-in | bottom nav → Check-in → Daily check-in |
| Meal photo analysis | bottom nav → Check-in → Daily check-in → meal photo slots |
| Body progress photos | side menu → My Body |
| Blood report upload | side menu → My Body → blood report section |
| Workout logging | bottom nav → Train |
| Coach messaging | bottom nav → Coach |
| Elite Feed | side menu → Elite Feed |
| Account deletion | bottom nav → Profile → Danger zone → Delete account |

### Sample files

Any photograph of a meal works for nutrition analysis. For the blood report, any laboratory
PDF or a clear photo of one is accepted; the app extracts values and summarises them.

---

## 4. External services used

| Service | Used for |
|---|---|
| **Anthropic (Claude API)** | meal photograph analysis, blood report extraction and summaries, coaching report drafts |
| **Sign in with Apple** | authentication; identity tokens verified server-side against Apple's public keys |
| **Google Sign-In** | authentication |
| **Twilio** | WhatsApp notifications to members and coaches |
| **SMTP email** | transactional email — approvals, password resets, reports |
| **Render** | application hosting and the PostgreSQL database |
| **Firebase Cloud Messaging** | push notifications on **Android only**; the plugin is excluded from the iOS build and iOS sends no push |

No payment processor is integrated: the app contains no in-app purchases and no payment
flow. Subscriptions are arranged outside the app by the coaching business.

No advertising networks, no analytics SDKs, and no third-party trackers are present in the
iOS app. This is why the App Privacy declaration reports no tracking.

All AI processing is server-side. No member data is used to train any model.

---

## 5. Regional differences

**The app functions identically in every region.** There is no geo-gating, no
region-specific content, and no feature that varies by country. The interface is English
only. Members choose their country and timezone in their profile, which affects only the
display of dates and the timing of daily reminders.

---

## 6. Regulated industry and third-party material

**BodyBank does not provide medical services and makes no medical claims.** It is a
lifestyle and fitness coaching product.

Blood report summaries restate laboratory values in plain language alongside general
lifestyle guidance — nutrition, sleep, activity. They do not diagnose conditions, do not
prescribe or recommend medication, and do not replace a physician. The app tells members to
consult a qualified doctor about their results, and coaches are trained to refer members to
medical professionals rather than advise on treatment.

The app is not a medical device, and it is not marketed as one.

All imagery in the app and on the App Store listing is either owned by BodyBank or used
with the written consent of the members shown. Transformation photographs and testimonials
come from real clients who have consented to their use. No third-party copyrighted or
licensed material is included.
