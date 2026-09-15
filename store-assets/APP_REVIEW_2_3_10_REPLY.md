# Reply to App Review — Guideline 2.3.10 (submission 1bf2c22b, build 1.0 (9))

Paste the text below into the Resolution Center reply after attaching the new build.

---

Hello,

Thank you for the review. We have addressed Guideline 2.3.10.

The new build removes every Google Play reference from the app binary:

- The signed-out landing page no longer shows the "Now live on Google Play" banner or any store badge.
- The "Get it on Google Play" badges have been removed from the sign-in, sign-up, privacy, blog and story pages, and the Google Play icon file is no longer bundled.
- The in-app privacy policy no longer names Google Play or Android.

The iOS build now runs an automated check that fails the build if any Google Play reference is present, so this cannot come back in a future version.

We also reviewed our screenshots. All of them are captures of the iOS app in use (member home, workout logging, coach messaging, daily check-in and weekly score) and contain no third-party store references.

Thank you,
The BodyBank team
