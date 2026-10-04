# Deploying Cathedral of Praise NOC to Vercel

This application is fully pre-configured for **zero-config deployment to Vercel**. It uses **Vite** for the high-performance React frontend and **Vercel Serverless Functions** for the Express backend API (`/api/*`).

---

## What Has Been Configured For Vercel

1. **`vercel.json`**:
   - Specifies the `vite` framework preset.
   - Sets `buildCommand: "vite build"` and `outputDirectory: "dist"`.
   - Configures automatic URL rewrites so that `/api/*` requests route directly to the serverless function handler, while frontend routes serve `index.html` (SPA fallback).

2. **`/api/index.ts`**:
   - The serverless entrypoint for Vercel.
   - Seamlessly executes all backend endpoints (State sync, User Auth, Incident Logger, Telco Webhooks, M365 Email Sync, and Campus Configuration) inside Vercel's serverless runtime.

3. **Serverless Filesystem Adaptation**:
   - Adapted to use `/tmp` on Vercel with an in-memory fallback, preventing read-only filesystem errors (`EROFS`).

---

## How to Deploy to Vercel (Choose Option A or Option B)

### Option A: Deploy via GitHub (Recommended)

1. **Push this repository to GitHub**:
   ```bash
   git add .
   git commit -m "Configure Cathedral of Praise NOC for Vercel deployment"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** → **"Project"**.
   - Select your GitHub repository (`cathedral-of-praise-noc`).
   - Vercel will automatically detect **Vite** and read `vercel.json`.
   - Leave all Build and Output settings as default (Framework: `Vite`, Root Directory: `./`).
   - Click **"Deploy"**.

3. **Done!** Your NOC system will be live at `https://your-project.vercel.app`.

---

### Option B: Deploy via Vercel CLI (From your Terminal)

1. Open your terminal in this project's folder.
2. Run:
   ```bash
   npx vercel
   ```
3. Follow the quick terminal prompts:
   - *Set up and deploy?* **`y`**
   - *Which scope?* (Select your Vercel account)
   - *Link to existing project?* **`n`**
   - *Project name?* `cathedral-of-praise-noc`
   - *Directory?* `./`
   - *Want to modify settings?* **`n`**
4. For production deployment, run:
   ```bash
   npx vercel --prod
   ```

---

## Standalone Offline Fallback Option

If you ever need to host the dashboard on GitHub Pages or a static CDN with zero servers:
- You can also deploy the standalone file `cop-noc-standalone.html` or `dist/cop-noc.html`.
- It includes all 17 campuses, 47 circuits, authentic high-res church emblem, user auth, and client-side `localStorage` persistence.
