# 🚀 GitHub & Vercel Deployment

This document is your **main guide** for deploying NOBTY to GitHub and connecting it to Vercel for automated deployments.

> **Quick Start:** 
> 1. Push your code to GitHub
> 2. Connect repo to Vercel (https://vercel.com/new)
> 3. Add env var `VITE_PB_URL`
> 4. Backend auto-deploys via GitHub Actions to Fly.io
> 5. Done! 🎉

---

## 📂 Files in This Repo for GitHub Deployment

### GitHub Configuration (`.github/`)

```
.github/
├── workflows/
│   ├── ci.yml                        # ✅ CI pipeline (runs on every push + PR)
│   └── deploy-fly.yml                # ✅ Auto-deploys backend to Fly.io
└── DEPLOY.md                         # 📖 Detailed deployment reference
└── GITHUB_DEPLOYMENT_SETUP.md        # 📋 Complete setup checklist (THIS FILE)
```

### Root Configuration Files

```
.
├── vercel.json                       # ✅ Vercel config (auto-detected)
├── Dockerfile                        # ✅ Container for Fly.io backend
├── fly.toml                          # ✅ Fly.io app config
├── package.json                      # ✅ Dependencies & scripts
├── pnpm-lock.yaml                    # ✅ Locked versions
├── tsconfig.json                     # ✅ TypeScript config
├── vite.config.ts                    # ✅ Vite bundler config
├── tailwind.config.ts                # ✅ Tailwind CSS config
├── postcss.config.js                 # ✅ PostCSS config
├── eslint.config.js                  # ✅ ESLint rules
└── .gitignore                        # ✅ Excludes sensitive files
```

All required files are **already in this repo** and ready to deploy! ✅

---

## 🎯 3-Step Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

**GitHub Actions automatically:**
- ✅ Runs CI checks (typecheck, build, lint)
- ✅ Syntax-checks all PocketBase migrations & hooks
- ✅ Creates artifact of `dist/` folder

### Step 2: Connect Frontend to Vercel

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Paste your GitHub repo URL
4. Framework: **Vite** (auto-detected)
5. Environment Variables → Add:
   ```
   VITE_PB_URL = https://YOUR-FLY-APP.fly.dev
   ```
6. Click **Deploy**

**Result:** Frontend lives at `https://your-project.vercel.app`

**Auto-deploy:** Every push to `main` → Vercel rebuilds & deploys

### Step 3: Connect Backend to Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Authenticate: `fly auth login`
3. Create app:
   ```bash
   fly launch --no-deploy --copy-config --name YOUR-APP-NAME
   fly volumes create pb_data --region cdg --size 1
   ```
4. Generate GitHub secret:
   ```bash
   fly auth token
   # → Copy token to GitHub Secrets (Settings → Secrets and variables → Actions)
   # → New secret: FLY_API_TOKEN
   ```
5. Add production secrets:
   ```bash
   fly secrets set \
     VAPID_PUBLIC_KEY="..." \
     VAPID_PRIVATE_KEY="..." \
     VAPID_SUBJECT="mailto:admin@your-domain.com" \
     WEBAUTHN_RP_ID="YOUR-APP-NAME.fly.dev" \
     WEBAUTHN_ORIGIN="https://your-project.vercel.app"
   ```
6. First deploy: `fly deploy`

**Result:** Backend lives at `https://YOUR-APP-NAME.fly.dev`

**Auto-deploy:** GitHub Actions triggers on backend code changes

---

## 🔄 After Initial Setup

**Frontend Updates:**
- Push to `main` → Vercel auto-deploys in ~30 sec

**Backend Updates:**
- Push to `main` (backend files) → GitHub Actions → Fly.io auto-deploys in ~2 min

**Manual Backend Deploy:**
```bash
fly deploy --app YOUR-APP-NAME
```

---

## ✅ Files Already Committed to GitHub

The repo is **ready to go**. Here's what GitHub Actions will do:

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push & PR:
1. ✅ Type checking: `pnpm typecheck`
2. ✅ Linting: `pnpm lint` (non-blocking)
3. ✅ Frontend build: `pnpm build`
4. ✅ PocketBase syntax check: `node --check`

**No deployment yet** — just validation.

### Deploy Workflow (`.github/workflows/deploy-fly.yml`)

Auto-triggered when you push changes to:
- `Dockerfile`
- `fly.toml`
- `pocketbase/pb_hooks/**`
- `pocketbase/pb_migrations/**`
- `scripts/start-prod.sh`

**Action:** Runs `flyctl deploy --remote-only` → Backend deployed to Fly.io

---

## 🔐 GitHub Secrets Required

**Repository → Settings → Secrets and variables → Actions**

Add ONE secret:

| Secret Name | Value | How to Get |
|---|---|---|
| `FLY_API_TOKEN` | Fly.io authentication token | `fly auth token` (after `fly auth login`) |

That's it! Everything else is in the repo or in environment variables.

---

## 🔧 Customization

### Change Fly.io App Name

Update in these files:
- `fly.toml` → `app = "your-app-name"`
- Vercel dashboard → `VITE_PB_URL` env var
- Fly secrets → `WEBAUTHN_RP_ID`

### Add Custom Domain

**For Frontend (Vercel):**
- Vercel dashboard → Settings → Domains → Add custom domain

**For Backend (Fly.io):**
- Dashboard → App → Certificates → Add certificate
- Point DNS to Fly.io

### Disable Auto-Deploy

Edit `.github/workflows/deploy-fly.yml`:
- Comment out the `on: push:` section
- Keep only `workflow_dispatch:` for manual triggers

---

## 📞 Quick Reference

| Task | Command/Link |
|---|---|
| Check CI status | https://github.com/YOUR_USERNAME/nour/actions |
| Redeploy frontend | Vercel dashboard → Deployments → Redeploy |
| Redeploy backend | `fly deploy --app YOUR-APP` or GitHub → Actions → Run workflow |
| View backend logs | `fly logs -a YOUR-APP --follow` |
| SSH into Fly app | `fly ssh console -a YOUR-APP` |
| View Vercel logs | Vercel dashboard → Deployments → Select → Logs |

---

## 🐛 Troubleshooting

**Vercel build fails?**
- Check CI passes: https://github.com/YOUR_USERNAME/nour/actions
- Missing `VITE_PB_URL` env? Add to Vercel dashboard
- Run locally: `pnpm typecheck && pnpm build`

**Fly deploy fails?**
- Check logs: `fly logs -a YOUR-APP --follow`
- Missing secrets? `fly secrets list -a YOUR-APP`
- Volume not attached? `fly volumes list -a YOUR-APP`

**GitHub Actions fails?**
- Missing `FLY_API_TOKEN` secret in GitHub?
- Wrong Node version? Check workflow uses Node 20

---

## 📚 Full Documentation

For deeper setup details, environment variables, and advanced configuration:

👉 **[.github/GITHUB_DEPLOYMENT_SETUP.md](./.github/GITHUB_DEPLOYMENT_SETUP.md)** ← Complete checklist & reference

👉 **[.github/DEPLOY.md](./.github/DEPLOY.md)** ← Original deployment guide

---

## ✨ You're Ready!

All files needed for GitHub + Vercel deployment are **already in this repo**. 

**Next steps:**
1. Commit changes: `git push origin main`
2. Go to https://vercel.com/new
3. Connect this GitHub repo
4. Add `VITE_PB_URL` env var
5. Click Deploy! 🚀

Your app will be live in minutes, with automatic deployments on every push! 🎉
