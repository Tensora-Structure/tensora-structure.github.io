# Tensora Structure

A web-application for Structural Analysis, Design, Detailing & Estimation as per IS-codes (React + Vite + TypeScript).

## Google Login & User Logging

Users sign in with Google; successful logins (name + email) are appended to a
Google Sheet via an Apps Script webhook. Set up these three pieces once:

1. **OAuth Client ID** — [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   create the OAuth consent screen (External, your email as test user), then
   "Create credentials → OAuth client ID → Web application" and add
   `https://tensora-structure.github.io` to **Authorized JavaScript origins**. Copy the client ID.
2. **Sheet webhook** — create a Google Sheet, then Extensions → Apps Script,
   paste `google-apps-script/append_login.gs`, Deploy → New deployment → Web app:
   Execute as *Me*, access *Anyone*. Copy the `/exec` URL.
3. **Credentials** —
   - Locally: copy `.env.example` to `.env.local` and fill both values.
   - Deployed: add `VITE_GOOGLE_CLIENT_ID` and `VITE_SHEETS_WEBHOOK_URL` to the
     GitHub repo under Settings → Secrets and variables → Actions.

Until the client ID is configured, the app shows a setup message instead of the sign-in button.

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   `npm install`
2. Run the dev server:
   `npm run dev`
3. Open http://localhost:3000 (or the port Vite prints)

## Build & Preview Production Bundle

- `npm run build` — outputs static files to `dist/`
- `npm run preview` — serves the built bundle locally to verify it
- `npm run lint` — TypeScript type-check

## Deploy

This is a static client-side app — no server required. `dist/` can be
served by any static host. The Google login config is injected at build time
from the environment variables described above.

### Vercel / Netlify (zero config)

Push the repo to GitHub, then import it. Both auto-detect Vite; `vercel.json`
handles SPA rewrites for Vercel.

- Vercel: `npm i -g vercel && vercel` (or use the dashboard "Import Git Repo")
- Netlify: build command `npm run build`, publish directory `dist`

### GitHub Pages

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app and
deploys it automatically to GitHub Pages on every push to `main`.

1. Push the repo to GitHub (this also triggers the first deploy on `main`)
2. In repo Settings → Pages, set **Source** to **GitHub Actions**
3. Your site is live at `https://<user>.github.io/<repo>/` (the Vite `base`
   path is set automatically from the repo name)

Deploy manually anytime from the Actions tab (workflow_dispatch).

### Any container platform (Render, Railway, Fly.io, GCP Cloud Run, AWS)

The included `Dockerfile` builds the app and serves it with nginx on port 80.
Point your platform at the repo root — no extra config needed.

### Any static file server

```sh
npm run build
cp -r dist /var/www/html/tensora
```
