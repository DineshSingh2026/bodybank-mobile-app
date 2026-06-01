# App Store Listing — copy-paste into App Store Connect

Field-by-field text and choices for **App Store Connect → My Apps → BodyBank →
App Information** and the **Version's iOS App** page. Character limits enforced.

---

## App Information (set once for the app)

| Field | Value |
|---|---|
| **Name** | `BodyBank - Lifestyle` *(19 / 30)* — already set in Info.plist |
| **Bundle ID** | `com.bodybank.app` |
| **Primary Category** | **Health & Fitness** |
| **Secondary Category** | **Lifestyle** |
| **Content Rights** | "Does NOT contain, show, or access third-party content" — **check** |

---

## Version page (set per release)

### Subtitle *(≤ 30 chars)*
```
Sustainable Lifestyle Coaching
```
*(30 / 30)*

Alternates if you want a different angle:
- `Real Body, Real Habits, For Life` *(32 — too long; trim if you pick this)*
- `Body + Nutrition + Coaching` *(27)*
- `Coaching That Actually Lasts` *(28)*

### Promotional Text *(≤ 170 chars — can update without resubmission)*
```
Track body, blood, and meals. Train with your Lifestyle Manager. Build the habits that actually last — not another diet, a lifestyle.
```
*(140 / 170)*

### Description *(≤ 4000 chars)*
```
Stop chasing quick fixes. BodyBank is your personal Lifestyle Manager — a coaching
platform that helps you build real, sustainable transformation through habits, not
hacks.

WHAT YOU GET INSIDE BODYBANK

• Body audit & progress tracking
  Capture front and side body photos, log measurements, and watch your progress over
  time with clean charts and a private timeline.

• Nutrition tracking with photo logging
  Snap a meal, get AI-powered macros and calories. Build a daily picture of what you
  actually eat — without the calorie-counting spreadsheet.

• Blood-report uploads
  Upload your blood lab PDF or photo. Get a plain-English summary, flagged values,
  and lifestyle recommendations from your Lifestyle Manager.

• Workouts you'll finish
  Programs assigned by your coach, logged in-app with sets, reps, and effort. Built
  for real lives, not influencer training splits.

• Elite Feed — the BodyBank tribe
  Real members. Real results. A private, curated feed of transformation posts —
  motivation that doesn't feel like marketing.

• Your Lifestyle Manager, in your pocket
  Direct chat with a real coach. Sunday check-ins, weekly nudges, and accountability
  you actually want.

WHO IT'S FOR

BodyBank is for adults who are done with crash diets, 30-day challenges, and apps
that count steps but never coach you. If you want a structured, human-led, evidence-
informed path to feeling and looking your best — and you're ready to put in the
reps — BodyBank is for you.

PRIVACY

Your data is yours. Photos, blood reports, and health data stay tied to your account
and are never sold or shared with advertisers. See our privacy policy at
https://bodybank.fit/privacy.

SIGN IN

Sign in with Apple, Google, or email. New members go through a short approval step
so we can match you with the right Lifestyle Manager.

---

Questions? Email us at hello@bodybank.fit or visit https://bodybank.fit.
```
*(≈ 1850 / 4000 — plenty of room if you want to add testimonials/FAQs later)*

### Keywords *(≤ 100 chars total, comma-separated, no spaces after commas)*
```
fitness,nutrition,coach,workout,health,blood,body,composition,meal,lifestyle,trainer,habit
```
*(92 / 100)*

Don't repeat words already in the name/subtitle (Apple already indexes those — wastes characters).

### Support URL *(required)*
```
https://bodybank.fit/
```

### Marketing URL *(optional)*
```
https://bodybank.fit/
```

### Privacy Policy URL *(required)*
```
https://bodybank.fit/privacy
```

### Copyright
```
© 2026 BodyBank
```

---

## Age Rating Questionnaire (Apple's UI walks you through it)

Suggested answers based on app content:

| Category | Answer |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None *(body progress photos in private user content are not "Nudity" in Apple's rating sense — they're user-generated and not displayed publicly. Confirm in the questionnaire wording.)* |
| Profanity / Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Info | **Infrequent/Mild** *(blood-report summaries, nutrition advice)* |
| Alcohol/Tobacco/Drugs | None |
| Gambling/Contests | None |
| Unrestricted Web Access | None *(the app loads its own web content, not arbitrary browsing)* |
| User-Generated Content | **Yes** *(Elite Feed posts) → enable moderation/reporting confirmation* |

Expected resulting rating: **12+**.

---

## App Privacy

See **APP_PRIVACY.md** in this folder for the full questionnaire answers.

---

## Pricing & Availability

| Field | Value |
|---|---|
| Price | **Free** *(the app itself is free; coaching is sold separately)* |
| Availability | All territories *(or restrict to launch markets — India, US, UAE, UK as a sensible first set)* |
