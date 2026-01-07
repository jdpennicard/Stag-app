# Domain Setup Guide

This guide walks you through setting up a custom domain for your Stag App, including both the website and email.

## Overview

You'll need:
1. **A domain name** (e.g., `owensstag.com` or `stag2026.com`)
2. **Website hosting** (already using Vercel - free tier is great)
3. **Email domain** (for sending emails via Resend)

**Good news:** You can use the same domain for both website and email!

---

## Step 1: Register a Domain

### Recommended Domain Registrars

**Best Options:**
- **Namecheap** (~$10-15/year) - Simple, good support
- **Cloudflare Registrar** (~$8-10/year) - Cheapest, excellent DNS
- **Google Domains** (~$12/year) - Simple interface
- **GoDaddy** (~$12-15/year) - Popular but more expensive

**Recommendation:** Start with **Namecheap** or **Cloudflare** - both are reliable and affordable.

### Choosing a Domain Name

Examples:
- `owensstag.com`
- `stag2026.com`
- `owensstag2026.com`
- `stag-bournemouth.com`

**Tips:**
- Keep it short and memorable
- Avoid hyphens if possible
- Check availability before deciding

---

## Step 2: Set Up Website Domain (Vercel)

### Option A: Buy Domain Through Vercel (Easiest)

1. Go to your Vercel dashboard
2. Click on your project → **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `owensstag.com`)
5. Vercel will offer to buy it for you (~$15/year) or you can connect an existing domain

**Pros:** Everything in one place, automatic DNS setup
**Cons:** Slightly more expensive than buying separately

### Option B: Connect Existing Domain to Vercel

1. In Vercel dashboard → **Settings** → **Domains** → **Add Domain**
2. Enter your domain
3. Vercel will show you DNS records to add:
   - **A Record**: `@` → `76.76.21.21` (or similar)
   - **CNAME Record**: `www` → `cname.vercel-dns.com` (or similar)

4. Go to your domain registrar's DNS settings
5. Add the records Vercel provides
6. Wait 5-60 minutes for DNS to propagate

**Then update your environment variable:**
```env
NEXT_PUBLIC_APP_URL=https://owensstag.com
```

---

## Step 3: Set Up Email Domain (Resend)

### Why Use a Custom Email Domain?

- **Better deliverability** - Emails less likely to go to spam
- **Professional branding** - `noreply@owensstag.com` looks better than `noreply@resend.dev`
- **Higher sending limits** - Custom domains have better reputation

### Steps to Verify Domain in Resend

1. **Log into Resend Dashboard**
   - Go to https://resend.com
   - Navigate to **Domains** → **Add Domain**

2. **Add Your Domain**
   - Enter your domain (e.g., `owensstag.com`)
   - Resend will generate DNS records you need to add

3. **Add DNS Records to Your Domain**
   
   Resend will provide records like:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:resend.com ~all
   
   Type: CNAME
   Name: resend._domainkey
   Value: [resend-provided-value]
   
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none;
   ```

4. **Add Records in Your Domain Registrar**
   - Go to your domain registrar (Namecheap, Cloudflare, etc.)
   - Find **DNS Settings** or **DNS Management**
   - Add each record Resend provides
   - Wait 5-60 minutes for verification

5. **Verify Domain in Resend**
   - Go back to Resend dashboard
   - Click **Verify** on your domain
   - Once verified (green checkmark), you're ready!

6. **Update Environment Variable**
   ```env
   EMAIL_FROM=noreply@owensstag.com
   ```
   
   Or for different email addresses:
   ```env
   EMAIL_FROM=payments@owensstag.com
   # or
   EMAIL_FROM=hello@owensstag.com
   ```

---

## Step 4: DNS Configuration Summary

### If Using Same Domain for Website + Email

Your DNS records will look something like this:

```
Type    Name    Value
─────────────────────────────────────────────
A       @       76.76.21.21          (Vercel)
CNAME   www     cname.vercel-dns.com  (Vercel)
TXT     @       v=spf1 include:...   (Resend)
CNAME   resend._domainkey  [value]    (Resend)
TXT     _dmarc  v=DMARC1; p=none;    (Resend)
```

### If Using Subdomain for Email

You can use a subdomain for email (e.g., `mail.owensstag.com`):
- Website: `owensstag.com` (Vercel)
- Email: `mail.owensstag.com` (Resend)

This keeps DNS records separate and cleaner.

---

## Step 5: Update Your App

### Environment Variables

Update your `.env.local` (and Vercel environment variables):

```env
# Website URL
NEXT_PUBLIC_APP_URL=https://owensstag.com

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@owensstag.com
```

### Vercel Environment Variables

1. Go to Vercel dashboard → Your project → **Settings** → **Environment Variables**
2. Add/update:
   - `NEXT_PUBLIC_APP_URL` = `https://owensstag.com`
   - `EMAIL_FROM` = `noreply@owensstag.com`
3. Redeploy your app (or it will auto-deploy on next push)

---

## Cost Breakdown

### Minimum Setup (Same Domain for Everything)

- **Domain**: ~$10-15/year (Namecheap/Cloudflare)
- **Vercel**: Free (hobby plan is fine)
- **Resend**: Free (3,000 emails/month)
- **Total**: ~$10-15/year

### Optional Upgrades

- **Vercel Pro**: $20/month (if you need more bandwidth/features)
- **Resend Pro**: $20/month (if you need >3,000 emails/month)

**For your use case, the free tiers should be plenty!**

---

## Quick Start Checklist

- [ ] Register domain (Namecheap/Cloudflare)
- [ ] Add domain to Vercel project
- [ ] Add DNS records for Vercel (A + CNAME)
- [ ] Add domain to Resend
- [ ] Add DNS records for Resend (TXT + CNAME)
- [ ] Verify domain in Resend (wait for green checkmark)
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
- [ ] Update `EMAIL_FROM` in Vercel env vars
- [ ] Test sending an email
- [ ] Test website loads on custom domain

---

## Troubleshooting

### DNS Not Working?

- **Wait longer**: DNS can take up to 48 hours (usually 5-60 minutes)
- **Check records**: Make sure you copied DNS values exactly
- **Use DNS checker**: https://dnschecker.org to see if records propagated

### Emails Going to Spam?

- Make sure all Resend DNS records are verified (green checkmarks)
- Wait 24-48 hours after verification for reputation to build
- Consider adding a "From Name" in your email templates

### Website Not Loading?

- Check Vercel deployment status
- Verify DNS records are correct
- Try accessing `www.yourdomain.com` and `yourdomain.com` separately

---

## Recommended Setup (My Suggestion)

1. **Buy domain**: `owensstag.com` or `stag2026.com` from Namecheap (~$12/year)
2. **Connect to Vercel**: Add domain in Vercel dashboard, follow their DNS instructions
3. **Connect to Resend**: Add same domain in Resend, add their DNS records
4. **Use email**: `noreply@owensstag.com` or `hello@owensstag.com`
5. **Total cost**: ~$12/year + free hosting/email

**This gives you:**
- Professional domain
- Free hosting (Vercel)
- Free email sending (Resend, 3k/month)
- Better email deliverability
- Professional branding

---

## Need Help?

If you get stuck:
1. Check Vercel docs: https://vercel.com/docs/concepts/projects/domains
2. Check Resend docs: https://resend.com/docs/dashboard/domains/introduction
3. DNS propagation checker: https://dnschecker.org

Good luck! 🚀

