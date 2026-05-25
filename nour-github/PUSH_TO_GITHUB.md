# 📤 How to Push to GitHub and Deploy to Vercel

This file contains the exact commands you need to run to deploy your NOBTY project to GitHub and Vercel.

---

## 🎯 Overview

Your project is now:
- ✅ **Fully fixed** — All TypeScript errors resolved
- ✅ **Built successfully** — PWA ready for deployment
- ✅ **Git initialized** — Repository ready to push
- ✅ **Documented** — All deployment guides included

**Current status:** 97 files, 189 MB, 2 commits

---

## 📋 Prerequisites

Before you start, make sure you have:

1. **GitHub Account** — https://github.com/
2. **Vercel Account** — https://vercel.com/ (free tier is fine)
3. **Git Installed** — `git --version` should show version number
4. **Node.js & pnpm** — Already verified in your project

---

## 🚀 Step-by-Step Deployment

### ✅ Step 1: Create Empty Repository on GitHub

1. Go to https://github.com/new
2. Fill in:
   - **Repository name:** `nobty` (or your preferred name)
   - **Description:** "NOBTY — Algerian Public Queue Management PWA"
   - **Visibility:** Public (for Vercel integration)
   - **Initialize:** Leave unchecked (we already have commits)
3. Click **Create repository**

### ✅ Step 2: Push to GitHub

Copy and paste these commands:

```bash
cd /home/free/Desktop/nour

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/nobty.git

# Rename branch to 'main' (GitHub's default)
git branch -m master main

# Push your code to GitHub
git push -u origin main

# Verify it worked
git remote -v
```

**Replace `YOUR_USERNAME` with your GitHub username.**

Example:
```bash
git remote add origin https://github.com/johndoe/nobty.git
```

### ✅ Step 3: Verify on GitHub

Open https://github.com/YOUR_USERNAME/nobty in your browser and verify you see:
- ✅ 97 files
- ✅ 2 commits
- ✅ `.github/workflows/` folder with CI/deploy pipelines
- ✅ All deployment documentation

---

## 🌐 Step 4: Deploy Frontend to Vercel

### 4a) Create Vercel Project

1. Go to https://vercel.com/dashboard
2. Click **"Add New..." → "Project"**
3. Click **"Import Git Repository"**
4. Paste: `https://github.com/YOUR_USERNAME/nobty`
5. Select GitHub account
6. Click **"Import"**

### 4b) Configure Environment

**Build Settings** (should auto-detect):
- Framework: **Vite**
- Build Command: `pnpm build`
- Output Directory: `dist`
- Install Command: `pnpm install --no-frozen-lockfile`

**Environment Variables** (click "Environment Variables"):
- Key: `VITE_PB_URL`
- Value: `https://nobty-prod.fly.dev` (or your Fly.io app name)
- Apply to: **Production**

### 4c) Deploy

Click **"Deploy"** → Wait 2-5 minutes → ✅ Frontend live!

**Your frontend URL:** `https://your-project-name.vercel.app`

---

## 🪰 Step 5: Deploy Backend to Fly.io (Optional but Recommended)

If you want auto-deploying backend on Fly.io:

### 5a) Install Fly CLI

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Add to PATH
export PATH=$PATH:/home/$USER/.fly/bin

# Verify
fly --version
```

### 5b) Authenticate & Create App

```bash
# Login to Fly.io
fly auth login

# Create app & volume (change nobty-prod to your app name)
fly launch \
  --no-deploy \
  --copy-config \
  --name nobty-prod \
  --region cdg

# Create database volume
fly volumes create pb_data \
  --region cdg \
  --size 1
```

### 5c) Get API Token for GitHub Actions

```bash
# Generate token
fly auth token

# Copy the output (starts with "FlyV1")
```

Add this token to GitHub:
1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `FLY_API_TOKEN`
5. Value: (paste your token from previous step)
6. Click **"Add secret"**

### 5d) Set Production Secrets

```bash
# Generate VAPID keys first (if you haven't)
pnpm push:vapid
# Output: Public Key: BL... and Private Key: 9...

# Set all secrets on Fly
fly secrets set \
  --app nobty-prod \
  VAPID_PUBLIC_KEY="BL..." \
  VAPID_PRIVATE_KEY="9..." \
  VAPID_SUBJECT="mailto:admin@example.com" \
  WEBAUTHN_RP_ID="nobty-prod.fly.dev" \
  WEBAUTHN_ORIGIN="https://your-project.vercel.app" \
  WEBAUTHN_RP_NAME="NOBTY"
```

Replace the values with your actual keys and URLs.

### 5e) First Deployment

```bash
# Deploy to Fly
fly deploy --app nobty-prod

# Verify
fly status -a nobty-prod
fly logs -a nobty-prod
```

Your backend URL: `https://nobty-prod.fly.dev`

---

## ✅ Final Verification

After deployment, verify everything works:

### Frontend (Vercel)
```bash
# Visit your frontend
curl https://your-project.vercel.app

# Check Service Worker
curl -I https://your-project.vercel.app/sw.js

# Check environment variable is set
# (Open DevTools → Network → check XHR requests to backend)
```

### Backend (Fly.io) — Optional
```bash
# Check API responding
curl https://nobty-prod.fly.dev/api/collections

# Check Admin UI
# Open https://nobty-prod.fly.dev/_ in browser

# View logs
fly logs -a nobty-prod --follow
```

---

## 📖 Reference Documentation

After pushing to GitHub, these files explain everything:

| File | Purpose |
|---|---|
| [GITHUB.md](./GITHUB.md) | Quick start (3 steps) |
| [DEPLOYMENT_COMPLETE.md](./DEPLOYMENT_COMPLETE.md) | What was fixed + status |
| [.github/GITHUB_DEPLOYMENT_SETUP.md](./.github/GITHUB_DEPLOYMENT_SETUP.md) | Complete reference |
| [.github/DEPLOY.md](./.github/DEPLOY.md) | Original deployment docs |
| [README.md](./README.md) | Project overview |

---

## 🆘 Troubleshooting

### Vercel Build Fails
**Check:** https://vercel.com/dashboard → Your Project → Deployments → Failed build logs

**Common issues:**
- Missing `VITE_PB_URL` env var → Add to Vercel dashboard
- TypeScript errors → Run `pnpm typecheck` locally

### Fly.io Deploy Fails
**Check logs:**
```bash
fly logs -a nobty-prod --follow
```

**Common issues:**
- Missing secrets → `fly secrets list -a nobty-prod`
- Volume not attached → `fly volumes list -a nobty-prod`

### GitHub Actions Fails
**Check:** Your GitHub repo → **Actions** → Click the failed workflow

**Common issues:**
- Missing `FLY_API_TOKEN` secret → Add to GitHub Settings → Secrets
- Wrong token format → Regenerate with `fly auth token`

---

## 🎯 After First Deployment

Once everything is deployed:

1. **Frontend updates:** Just push to `main` → Vercel auto-deploys (30 sec)
2. **Backend updates:** Push backend files to `main` → GitHub Actions auto-deploys to Fly (2 min)
3. **New features:** Same workflow, always just `git push`

---

## 🔐 Important Security Notes

**Never commit:**
- `.env` files with secrets
- `pocketbase/pb_data/` database files
- API keys or tokens

These are already in `.gitignore` ✅

**Store secrets in:**
- **Vercel:** Dashboard Environment Variables
- **Fly.io:** `fly secrets set`
- **GitHub Actions:** Repository Secrets

---

## 📞 Need Help?

| Issue | Solution |
|---|---|
| Forgot GitHub password | https://github.com/password_reset |
| Lost Vercel project | Go to https://vercel.com/dashboard |
| Lost Fly.io app | Run `fly apps list` |
| Build errors locally | Run `pnpm typecheck && pnpm build` |

---

## ✨ Quick Copy-Paste Commands

All commands you need in one place:

```bash
# 1. Push to GitHub
cd /home/free/Desktop/nour
git remote add origin https://github.com/YOUR_USERNAME/nobty.git
git branch -m master main
git push -u origin main

# 2. (Optional) Setup Fly
curl -L https://fly.io/install.sh | sh
export PATH=$PATH:/home/$USER/.fly/bin
fly auth login
fly launch --no-deploy --copy-config --name nobty-prod --region cdg
fly volumes create pb_data --region cdg --size 1
fly auth token  # Copy output to GitHub secret FLY_API_TOKEN

# 3. (Optional) Deploy to Fly
pnpm push:vapid  # Get VAPID keys
fly secrets set --app nobty-prod VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..." VAPID_SUBJECT="mailto:admin@example.com" WEBAUTHN_RP_ID="nobty-prod.fly.dev" WEBAUTHN_ORIGIN="https://your-vercel-domain.vercel.app" WEBAUTHN_RP_NAME="NOBTY"
fly deploy --app nobty-prod
```

---

## 🚀 You're Ready!

Everything is set up. Time to push! 🎉

**Next command to run:**
```bash
cd /home/free/Desktop/nour
git remote add origin https://github.com/YOUR_USERNAME/nobty.git
git branch -m master main
git push -u origin main
```

Then go to https://vercel.com/new to import your repo. Done! ✨
