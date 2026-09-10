# App Review Information — copy-paste into App Store Connect

Paste these values into **App Store Connect → My Apps → BodyBank → iOS App → [version] →
App Review Information**. Apple uses these to test the app.

> Anything in **<ANGLE BRACKETS>** is a placeholder — fill in your real values.

---

## Sign-in Information (Demo Account) — **REQUIRED**

The signup flow gates new users in `pending_approval` until an admin approves them.
Reviewers will **not** wait for manual approval — they will reject the build. The server
auto-seeds the account below as **approved** on startup, so the reviewer can sign in
immediately.

> Before submitting, set `APPLE_REVIEW_EMAIL` and `APPLE_REVIEW_PASS` in Render env
> vars and redeploy. Use the same values here.

```
Username:  <APPLE_REVIEW_EMAIL — e.g. apple-reviewer@bodybank.fit>
Password:  <APPLE_REVIEW_PASS  — e.g. BodybankReview!2026>
```

**Sign-in required for full review:** Yes (checked).

---

## Contact Information

```
First name:  <YOUR FIRST NAME>
Last name:   <YOUR LAST NAME>
Phone:       <YOUR PHONE WITH COUNTRY CODE>
Email:       <YOUR EMAIL — typically admin@bodybank.fit>
```

This is who Apple emails if they have questions during review.

---

## Notes for the Reviewer (paste into the "Notes" field)

```
Thank you for reviewing BodyBank.

BodyBank is a personal lifestyle-coaching app. The demo account above is pre-approved
and gives you full access to the user features (Home dashboard, Body Audit form,
Nutrition tracker, Blood-report upload, Workouts, Elite Feed).

Why we ask for permissions:
• Camera + Photo Library — to capture body progress photos, meal photos for nutrition
  analysis, and to upload a blood-report image/PDF. All photos stay tied to the user's
  own account and are used only inside the app.
• Microphone + Speech Recognition — optional dictation on the long written check-in
  questions. A "Speak your answer" button sits under each long answer field; tapping it
  records only until you tap stop, iOS transcribes it, and the text is shown for you to
  edit and confirm before it enters the field. Typing is unchanged and always available.
  No audio is stored or uploaded — BodyBank receives text only, and no server endpoint
  accepts audio. To see it: Check-in > Sunday check-in > any question marked "detailed
  answer please".
• No location services, no Bluetooth.

Sign in:
• Email + password (use the demo account above).
• "Sign in with Apple" is also offered (Apple Guideline 4.8 compliant) — feel free to
  use either; both reach the same dashboard.

Note about new sign-ups:
• In the real product, brand-new sign-ups land in a "pending admin approval" state. The
  demo account is already approved so you can bypass this. If you create a new test
  account through the signup form, it will show "pending approval" — this is expected
  product behavior, not a bug.

If anything is unclear, please email <YOUR CONTACT EMAIL> and we will respond within a
few hours.
```

---

## Attachments

- (Optional) A 30-60 second screen-recording walkthrough demonstrating sign-in →
  dashboard → key features. Helps the reviewer understand the app quickly and
  significantly reduces "we couldn't find X" rejections.
