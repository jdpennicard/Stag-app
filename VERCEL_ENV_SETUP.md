# Vercel Environment Variables Setup Guide

## Understanding Vercel Environments

Vercel has **3 separate environments** for environment variables:

1. **Production** - Used when you deploy to your main branch (your custom domain)
2. **Preview** - Used for all other branches/PRs (preview URLs like `stag-app-git-feature.vercel.app`)
3. **Development** - Used for local development (but `.env.local` overrides this)

---

## Setup Instructions

### 1. Local Development (.env.local)

**Keep using `localhost` for local dev:**

```env
# .env.local (for local development only)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Why?** You're running `npm run dev` locally, so you want links to point to `localhost:3000`.

---

### 2. Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

#### For Production (Main Branch)

Add/Update:
```
NEXT_PUBLIC_APP_URL = https://owens-stag.com
```

**When this is used:** When you merge to `main` branch and deploy to production.

#### For Preview (All Other Branches)

Add/Update:
```
NEXT_PUBLIC_APP_URL = https://stag-app.vercel.app
```

**When this is used:** When you push to any branch other than `main` (feature branches, etc.)

#### For Development (Local)

You can skip this - `.env.local` will be used instead.

---

## Development Workflow

### How to Develop Without Affecting Production

**Option 1: Use Feature Branches (Recommended)**

1. Create a new branch:
   ```bash
   git checkout -b feature/new-feature
   ```

2. Make your changes locally (using `.env.local` with `localhost:3000`)

3. Push to GitHub:
   ```bash
   git push origin feature/new-feature
   ```

4. Vercel automatically creates a **Preview Deployment**:
   - URL: `https://stag-app-git-feature-new-feature.vercel.app`
   - Uses **Preview** environment variables
   - **Production is NOT affected**

5. Test on the preview URL

6. When ready, merge to `main`:
   ```bash
   git checkout main
   git merge feature/new-feature
   git push origin main
   ```
   - This triggers a **Production Deployment**
   - Uses **Production** environment variables
   - Goes live on `https://owens-stag.com`

**Option 2: Keep Working on Main (Not Recommended)**

- You can keep working on `main` branch
- But every push will deploy to production
- Not ideal for testing

---

## Environment Variable Priority

When running locally:
1. `.env.local` (highest priority)
2. Vercel Development env vars (if set)
3. System environment variables

When deployed to Vercel:
1. Production env vars (for `main` branch)
2. Preview env vars (for other branches)
3. Development env vars (not used in deployments)

---

## Quick Setup Checklist

### In Vercel Dashboard:

1. ✅ Go to **Settings → Environment Variables**
2. ✅ Add `NEXT_PUBLIC_APP_URL` for **Production** = `https://owens-stag.com`
3. ✅ Add `NEXT_PUBLIC_APP_URL` for **Preview** = `https://stag-app.vercel.app`
4. ✅ Keep **Development** empty (or set to `http://localhost:3000`)

### In Your Local `.env.local`:

```env
# Keep this for local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Your other env vars...
RESEND_API_KEY=re_xxxxx
EMAIL_FROMimage.pngimage.png=noreply@owens-stag.com
# etc...
```

---

## Answering Your Questions

### Q: Do I need to add NEXT_PUBLIC_APP_URL to .env.local?

**A:** Yes, but keep it as `http://localhost:3000` for local development.

### Q: Do I need to switch stag-app.vercel.app to preview instead of prod?

**A:** No! Here's how it works:
- **Production** (`owens-stag.com`) = Your custom domain (main branch)
- **Preview** (`stag-app.vercel.app` or `stag-app-git-xxx.vercel.app`) = Preview deployments (other branches)
- They're separate - you don't "switch" between them

### Q: How do I continue developing without pushing to prod?

**A:** Use feature branches:
1. Create a branch: `git checkout -b my-feature`
2. Make changes locally
3. Push: `git push origin my-feature`
4. Vercel creates a preview deployment (doesn't affect production)
5. Test on preview URL
6. When ready, merge to `main` to deploy to production

---

## Example Workflow

```bash
# 1. Start working on a new feature
git checkout -b add-email-feature

# 2. Make changes locally (using localhost:3000)
# Edit files, test with npm run dev

# 3. Push to GitHub
git add .
git commit -m "Add email feature"
git push origin add-email-feature

# 4. Vercel automatically creates preview:
# https://stag-app-git-add-email-feature.vercel.app
# This uses PREVIEW env vars (stag-app.vercel.app)

# 5. Test on preview URL

# 6. When happy, merge to main
git checkout main
git merge add-email-feature
git push origin main

# 7. Production deploys to:
# https://owens-stag.com
# This uses PRODUCTION env vars (owens-stag.com)
```

---

## Important Notes

- **Production** = Your live site (`owens-stag.com`) - only deploys from `main` branch
- **Preview** = Test deployments (any other branch) - safe to experiment
- **Local** = Your computer (`localhost:3000`) - uses `.env.local`

You can develop safely on feature branches without affecting production! 🚀

