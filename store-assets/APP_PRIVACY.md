# App Privacy Questionnaire — answers to copy into App Store Connect

In App Store Connect → **App Privacy → Edit**, Apple asks you, for each data type,
whether you collect it, whether it's linked to identity, whether it's used for
tracking, and the purposes. These answers reflect what the BodyBank codebase
actually does — keep them accurate (under-declaring or over-declaring both cause
rejection).

> If you add Firebase Analytics, Sentry, Mixpanel, etc. later, **re-check this**.

---

## Global toggles

| Question | Answer |
|---|---|
| Does this app collect data from this app? | **Yes** |
| Used to track users (cross-app/site, for advertising)? | **No — we do not track** |
| Linked to user identity? | **Yes for all collected data** (everything ties to the user account) |

---

## Data collected — declare each one

For every row below: **Collected = Yes**, **Linked to user = Yes**, **Used for
tracking = No**. Purpose codes:
- `AF` = App Functionality
- `PP` = Product Personalization
- `AA` = Analytics

### Contact Info
| Data Type | Purposes |
|---|---|
| Email Address | AF |
| Name | AF, PP |
| Phone Number | AF *(used for WhatsApp coaching contact)* |
| Physical Address | AF *(country, state, city stored for timezone + coaching context — not street address)* |

### Health & Fitness
| Data Type | Purposes |
|---|---|
| Health *(blood-report values, body measurements, weight, body composition, dob/gender for RMR)* | AF, PP |
| Fitness *(workout sets/reps/duration, activity logs)* | AF, PP |

### Sensitive Info — do NOT declare

**Corrected 2026-09-03.** This file previously told you to tick **Sensitive Info** for blood
reports. That is over-declaring. Apple defines that category narrowly: racial or ethnic
data, sexual orientation, pregnancy, disability, religious beliefs, trade union membership,
political opinion, genetic data, biometric data. General health data is **not** in it —
that is exactly what the **Health** type above is for, and blood-report values are already
covered there.

Over-declaring invites reviewer questions just as under-declaring does, so leave
**Sensitive Info** unticked.

### User Content
| Data Type | Purposes |
|---|---|
| Photos or Videos *(body progress photos, meal photos, blood-report photos, profile picture)* | AF, PP |
| Other User Content *(Elite Feed posts, Sunday check-in answers, chat messages with coach)* | AF, PP |

### Identifiers
| Data Type | Purposes |
|---|---|
| User ID *(internal user id + push-notification token)* | AF |

### Usage Data
| Data Type | Purposes |
|---|---|
| Product Interaction *(in-app activity used for coaching — e.g. when you logged a meal, did a workout)* | AF, PP |

### **NOT collected** (be explicit in the questionnaire — don't accidentally check these)

- Financial Info — no payments processed in the app
- Purchases — no in-app purchases
- Location *(precise or coarse GPS)* — we **do not** request location services. The "Country" in the profile is **user-entered**, not GPS.
- Audio Data — `audio: false` everywhere we use getUserMedia
- Browsing History
- Search History
- Contacts *(your phone's address book)*
- Other Diagnostic Data — no crash reporting SDK
- Advertising Data
- Device ID *(advertising IDFA)*

---

## Privacy Policy URL

```
https://bodybank.fit/privacy
```

This URL is required and **must work** — Apple checks it. Verify before submitting.

---

## Data Retention / Deletion

Apple may ask whether users can request account deletion. Currently the app has admin
deletion via the superadmin panel; if there is no in-app "Delete Account" button,
Apple has begun requiring one (Guideline 5.1.1(v) since 2022). 

**Recommended quick fix before submission:** add a "Delete my account" button in the
user dashboard that calls an existing endpoint, or document a clear support-email
path in the privacy policy. Without one, expect a rejection citing 5.1.1(v).
