# Cathedral of Praise — Multi-Campus NOC Command Center & Wallboard

Official Network Operations Center (NOC) dashboard for **Cathedral of Praise**, monitoring 17 Campuses and 47 Internet, Metro-Ethernet, and Starlink links.

---

## 🚀 How to Upload the ENTIRE Project to GitHub (Not Just index.html)

You can upload the entire repository (full React + TypeScript + Express backend + Tailwind source code) using any of the three methods below:

### Method 1: Using the Terminal / Git CLI (Fastest & Standard)

1. Open your terminal or Command Prompt in your local project directory.
2. Initialize and push all files to your GitHub repository:
   ```bash
   # Initialize git repository
   git init

   # Stage all project files (source, server, configs, assets)
   git add .

   # Commit all files
   git commit -m "Cathedral of Praise Multi-Campus NOC Full Codebase"

   # Ensure the main branch is selected
   git branch -M main

   # Link to your GitHub repository (replace with your repo URL)
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git

   # Push everything to GitHub
   git push -u origin main
   ```

All directories (`src/`, `components/`, `data/`, `types/`, `server.ts`, `package.json`, `tailwind`, etc.) will be uploaded to your GitHub repository.

---

### Method 2: 1-Click ZIP Download (No Git Commands Needed)

1. In the application header, click **"Export Report"**.
2. Select the **"Download Codebase (.ZIP) & GitHub"** tab.
3. Click **"Download Full Project (.ZIP)"** (or download directly from `/cathedral-of-praise-noc.zip`).
4. Extract the ZIP file on your computer.
5. You can now drag and drop the extracted files into your GitHub repository or use **GitHub Desktop**.

---

### Method 3: Using GitHub Desktop (Graphical User Interface)

1. Download and install [GitHub Desktop](https://desktop.github.com/).
2. Click **File** > **Add Local Repository...** and select your project folder.
3. Click **Publish repository** to push all code, branches, and commits directly to your GitHub account.

---

## 🌐 How to Publish to GitHub Pages

If you want the live web dashboard running on `https://<your-username>.github.io/<your-repo>/`:

1. Upload the repository using **Method 1** or **Method 2**.
2. Make sure `cop-noc-standalone.html` is saved as `index.html` at the repository root (or run `npm run build` to generate the `dist/` directory).
3. On GitHub, go to **Settings** > **Pages** (in the left sidebar).
4. Under **Branch**, select `main` (or `master`) and folder `/ (root)`, then click **Save**.
5. Your live NOC Command Center will be accessible online.

---

## 🔐 Authentication & Session Persistence (No Auto-Login)

- **Default State**: When a user opens the application, they must explicitly sign in or choose guest view.
- **Signed Out**: Clicking **"Sign Out"** clears all credentials from `localStorage`. Refreshing or revisiting the link keeps the user on the **Secure Login Page** — **no automatic re-login**.
- **Guest Access**: Users can click *"Continue as Guest (Read-Only Wallboard View)"* to view the board in read-only mode without credentials.

### Administrator Account Credentials
- **Administrator**: Jeffrey Nadado
- **Email**: `cop.jmnadado@gmail.com` (or `jmnadado@cathedralofpraise.com.ph`)
- **Password**: `Admin@COP2026!`
- **Role**: `ADMIN` (Approves pending user registrations, assigns roles, and suspends accounts)
