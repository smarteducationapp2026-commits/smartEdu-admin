# SmartEdu Admin

Separate React/Vite admin application for the Firebase project
`smarteducation-705f1`.

## Local setup

1. Create a Web app in Firebase Console for `smarteducation-705f1`.
2. Copy [.env.example](./.env.example) to `.env`.
3. Replace `your_web_api_key` and `your_web_app_id` with the values from
   that Web app's Firebase configuration. The API key must belong to the same
   `smarteducation-705f1` project; do not use the configuration for the
   separate `smartedu-f34f6` project. The admin app can read and write the
   same Firestore collections (`users`, `courses`, etc.) because it uses the
   same Firebase project.
4. Restart Vite after changing `.env`, because Vite loads environment variables
   when the dev server starts.
5. Install dependencies and start Vite:

```bash
npm install
npm run dev
```

## Admin security

Admin access is controlled by the signed-in user's Firestore profile. The
document ID must match the Firebase Auth UID and its `role` must be `admin` or
`superAdmin`. The browser must never contain a Firebase service-account key.

The dashboard supports:

- Firebase Email/Password admin login.
- Listing user profiles from `users`.
- Creating a Firebase Auth user through a secondary client app and generating a
  referral code.
- Editing offers on documents in `courses`.

The Create admin action stores `role: "admin"` in the new user's Firestore
profile. The generated password is not stored; Firebase sends a password setup
email.

## Firebase Hosting deployment

The admin app is configured as a Firebase Hosting SPA for the
`smarteducation-705f1` project. The `main` branch workflow in
`.github/workflows/ci.yml` runs lint and build checks on pull requests and
deploys Hosting after a successful push to `main`. It also supports manually
choosing any branch from the GitHub Actions **Run workflow** branch selector
and deploying that branch.

Configure these GitHub repository secrets before enabling deployment:

- `FIREBASE_SERVICE_ACCOUNT`: complete JSON content of a Firebase service-account key
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

The Firebase Web configuration values are public runtime configuration, but
keeping them in repository secrets avoids hard-coding environment-specific
values in the workflow. Keep the service-account JSON only in the GitHub
Secret; never add it to the repository.
