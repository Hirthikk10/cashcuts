# CashCuts - Deployment Guide

This project is split into a frontend static site and a Python FastAPI backend. Here is how to deploy it for free.

## Step 1: Push to GitHub
1. Create a new repository on GitHub.
2. Commit and push the entire `cashcuts` folder to the repository.

## Step 2: Deploy Backend to Render (Free)
1. Go to [Render](https://render.com) and sign in with GitHub.
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically read the `render.yaml` file and deploy the `cashcuts-backend` web service.
5. Once deployed, copy your Render URL (it will look like `https://cashcuts-backend-xxxxx.onrender.com`).

## Step 3: Update Frontend API URL
1. Open `frontend/script.js` in your code (or directly on GitHub).
2. Look for the `API_BASE` variable at the very top.
3. Change `"https://cashcuts-backend.onrender.com/api"` to the exact URL you got from Render in Step 2.
4. Commit and push this change to GitHub.

## Step 4: Deploy Frontend to Netlify (Free)
1. Go to [Netlify](https://netlify.com) and sign in with GitHub.
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub repository.
4. Netlify will read the `netlify.toml` file automatically.
5. Click **Deploy Site**.

You're done! Your CashCuts app is now live for your friends to use!

## Sharing it as an App (PWA)
CashCuts is configured as a **Progressive Web App (PWA)**! This means it behaves exactly like an APK, but is completely safe and bypasses app stores.

**How to share it:**
1. Send your friends the Netlify link you created in Step 4.
2. Ask them to open it in Chrome (Android) or Safari (iOS).
3. Tap the browser menu (3 dots or share sheet) and tap **"Add to Home Screen"**.
4. CashCuts will appear as an app icon on their phone and open in standalone mode (no browser URL bar), feeling 100% native!
