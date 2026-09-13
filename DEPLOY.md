# Deploying the Guru Maharaj Visit 2026 app

The `dist/public/` folder is a **ready-to-deploy static site** — it already contains the production build with all 30 Tug of War questions baked in. You don't need Node.js to deploy it, only to rebuild it after future edits.

## Option A — Deploy the static build as-is (fastest)
Drag-and-drop the `dist/public/` folder onto any static host:
- **Netlify**: drag `dist/public` into the Netlify "Deploys" dashboard, or `netlify deploy --dir=dist/public --prod`
- **Vercel**: `vercel --prod dist/public` (or import the repo and set the output directory to `dist/public`)
- **GitHub Pages / Cloudflare Pages / Surge**: point them at `dist/public` as the publish directory
- **Any web server (nginx, Apache, S3, etc.)**: upload the contents of `dist/public` to the web root

Because it's a single-page app, configure the host to rewrite all routes to `/index.html` (already noted in `.replit-artifact` style config — most hosts call this a "SPA fallback" or "rewrite rule").

## Option B — Rebuild from source (after editing questions, colors, etc.)
```bash
npm install
PORT=24255 BASE_PATH=/ NODE_ENV=production npx vite build --config vite.config.ts
```
Then deploy the newly generated `dist/public/` folder using Option A.

## Local preview before deploying
```bash
npm install
PORT=24255 npm run dev
```
