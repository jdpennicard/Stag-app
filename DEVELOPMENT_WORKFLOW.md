# Development Workflow Guide

## Branch Strategy

### Main Branch (`main`)
- **Purpose**: Production-ready code
- **Status**: ✅ Currently stable and live
- **Deployment**: Auto-deploys to `https://owens-stag.com`
- **Rule**: Only merge tested, working code

### Feature Branches
- **Purpose**: Development of new features
- **Example**: `feature/deadline-reminder-cron`
- **Deployment**: Auto-creates preview deployments on Vercel
- **Rule**: Work on features here, test on preview, then merge to main

---

## Current Setup

### Active Branches:
- **`main`**: Production (stable, live) ✅
- **No active feature branches** - All features have been merged to production

---

## Workflow for Adding Deadline Reminder Cron Job

### Step 1: Work on Feature Branch (Current)

You're now on `feature/deadline-reminder-cron`:

```bash
# You're here now - safe to develop
git status  # Should show you're on feature/deadline-reminder-cron
```

### Step 2: Develop the Feature

1. Create the cron job route: `/api/cron/deadline-reminders/route.ts`
2. Add to `vercel.json` cron schedule
3. Test locally
4. Commit changes:
   ```bash
   git add .
   git commit -m "Add deadline reminder cron job"
   ```

### Step 3: Test on Preview

1. Push to GitHub:
   ```bash
   git push origin feature/deadline-reminder-cron
   ```

2. Vercel automatically creates a preview deployment:
   - URL: `https://stag-app-git-feature-deadline-reminder-cron.vercel.app`
   - Uses Preview environment variables
   - **Production is NOT affected**

3. Test the preview deployment

### Step 4: Merge to Production (When Ready)

Once tested and working:

```bash
# Switch back to main
git checkout main

# Pull latest changes (if any)
git pull origin main

# Merge your feature branch
git merge feature/deadline-reminder-cron

# Push to production
git push origin main
```

This triggers a production deployment to `https://owens-stag.com`

---

## Quick Commands Reference

### Check Current Branch
```bash
git branch
# * indicates current branch
```

### Switch Branches
```bash
git checkout main                    # Switch to production
git checkout feature/deadline-reminder-cron  # Switch to feature branch
```

### Create New Feature Branch
```bash
git checkout main                    # Start from main
git pull origin main                 # Get latest
git checkout -b feature/new-feature # Create and switch
```

### See What's Changed
```bash
git status                           # See uncommitted changes
git diff                             # See actual changes
```

### Commit and Push
```bash
git add .                            # Stage all changes
git commit -m "Description"          # Commit
git push origin feature/deadline-reminder-cron  # Push feature branch
```

---

## Important Notes

### ✅ Safe to Develop
- Working on `feature/deadline-reminder-cron` does NOT affect production
- Preview deployments are separate from production
- You can test freely without breaking the live app

### ⚠️ Production Protection
- Only `main` branch deploys to production
- Preview deployments use preview environment variables
- Production uses production environment variables

### 🔄 Merging to Production
- Only merge when feature is tested and working
- Test on preview deployment first
- Merge to main when ready to go live

---

## Current Status

- **Production**: `main` branch → `https://owens-stag.com` ✅ Stable & Live
- **Development**: No active feature branches - create new branch when starting new features

---

## Creating New Features

When starting a new feature:

1. **Create feature branch from main**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test locally**

3. **Push to create preview deployment**:
   ```bash
   git push origin feature/your-feature-name
   ```
   - Vercel automatically creates a preview URL
   - Production is NOT affected

4. **Test on preview deployment**

5. **Merge to main when ready**:
   ```bash
   git checkout main
   git merge feature/your-feature-name
   git push origin main
   ```

6. **Clean up after merge**:
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

You're all set! 🚀

