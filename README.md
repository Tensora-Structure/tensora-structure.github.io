# Tensora Structure

Structural analysis & detailing web app (React + Vite + TypeScript).

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

```sh
npm run build
npx gh-pages -d dist
```
(Enable Pages from the `gh-pages` branch in repo settings.)

### Any container platform (Render, Railway, Fly.io, GCP Cloud Run, AWS)

The included `Dockerfile` builds the app and serves it with nginx on port 80.
Point your platform at the repo root — no extra config needed.

### Any static file server

```sh
npm run build
cp -r dist /var/www/html/tensora
```

## Scripts / Tooling

The root contains one-off Node patcher scripts (`fix_*.cjs`, `patch_*.cjs`,
`generate_detailing*.cjs`) used to programmatically modify the codebase. They are
not part of the app runtime and can be ignored (or removed) when deploying.
