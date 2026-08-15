# Tensora Structure

A web-application for Structural Analysis, Design, Detailing & Estimation as per IS-codes (React + Vite + TypeScript).

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

This is a static client-side app — no server or API keys required. `dist/` can be
served by any static host. Use the URL of the deployed site wherever the app URL is needed.

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
