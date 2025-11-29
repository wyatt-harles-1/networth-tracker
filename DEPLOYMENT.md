# NetWorth Tracker - Deployment Guide

This guide will help you deploy your NetWorth Tracker app as a Progressive Web App (PWA) to Vercel.

## 🎯 What You Get

After deployment, your app will be:
- ✅ **Installable** on iPhone, Android, and desktop
- ✅ **Accessible anywhere** with internet
- ✅ **Fast** with offline caching
- ✅ **Portfolio-ready** with a shareable URL
- ✅ **Professional** with automatic HTTPS

## 📋 Prerequisites

1. A [GitHub](https://github.com) account
2. A [Vercel](https://vercel.com) account (free tier is perfect)
3. Your Supabase project credentials

## 🚀 Deployment Steps

### Step 1: Push to GitHub

1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit with PWA support"
   ```

2. Create a new repository on GitHub (https://github.com/new)
   - Name it something like `networth-tracker`
   - Make it **Public** (for portfolio visibility) or Private (if you prefer)

3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/networth-tracker.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in with GitHub

2. Click "New Project"

3. Import your `networth-tracker` repository

4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables (click "Environment Variables"):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   ⚠️ **Important**: Get these from your Supabase project settings

6. Click "Deploy"

### Step 3: Wait for Deployment

Vercel will:
- Install dependencies
- Build your app
- Deploy to a global CDN
- Give you a URL like `https://networth-tracker-xyz.vercel.app`

This takes about 2-3 minutes.

## 📱 Installing on Your Phone

### iPhone (iOS):

1. Open Safari and go to your deployed URL
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"**
5. The app icon will appear on your home screen!

### Android:

1. Open Chrome and go to your deployed URL
2. Tap the **three dots** menu
3. Tap **"Add to Home screen"** or **"Install app"**
4. Tap **"Install"**
5. The app icon will appear on your home screen!

### Desktop (Chrome/Edge):

1. Open your deployed URL in Chrome or Edge
2. Look for the **install icon** in the address bar (⊕ or computer icon)
3. Click it and select **"Install"**
4. The app opens in its own window!

## 🎨 Customizing Your PWA

### Change App Name or Description

Edit `vite.config.ts`:
```typescript
manifest: {
  name: 'Your App Name',
  short_name: 'Short Name',
  description: 'Your app description',
  // ...
}
```

### Update Icons

1. Replace the icon in `public/icon.svg` with your custom design
2. Run: `node scripts/generate-icons.js`
3. Rebuild and redeploy

## 🔄 Updating Your App

After making changes:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update feature X"
   git push
   ```

2. Vercel will **automatically rebuild and deploy**
3. Users will get the update next time they open the app

## 🧪 Testing Before Deployment

Test the PWA locally:

1. Build the production version:
   ```bash
   npm run build
   ```

2. Preview it:
   ```bash
   npm run preview
   ```

3. Open http://localhost:4173 in your browser
4. Check if PWA install prompt appears
5. Test offline functionality (disconnect internet, refresh)

## 📊 Portfolio Tips

### Share Your Project

Add these to your portfolio/resume:
- **Live Demo**: Your Vercel URL
- **GitHub Repo**: Link to your repository
- **Key Features**: PWA, Responsive, Offline-capable, Real-time data with Supabase

### README for GitHub

Make sure your README.md includes:
- Project description
- Tech stack (React, TypeScript, Vite, Supabase, PWA)
- Screenshots
- Installation instructions
- Live demo link

## 🐛 Troubleshooting

### PWA not installing on iPhone
- Make sure you're using **Safari** (not Chrome)
- HTTPS is required (Vercel provides this automatically)
- Check that all icons exist in `public/` folder

### Environment variables not working
- Make sure they start with `VITE_`
- Rebuild after adding them in Vercel
- Check they're added to the correct environment (Production/Preview/Development)

### Service worker not updating
- Clear browser cache
- Uninstall and reinstall the PWA
- Check that `registerType: 'autoUpdate'` is in vite.config.ts

## 📞 Support

If you encounter issues:
1. Check the [Vercel documentation](https://vercel.com/docs)
2. Check the [Vite PWA documentation](https://vite-pwa-org.netlify.app/)
3. Review browser console for errors

## 🎉 Next Steps

After deployment:
- ✅ Install on your phone
- ✅ Share URL with friends/employers
- ✅ Add to your portfolio website
- ✅ Create a demo video
- ✅ Write a blog post about your project
- ✅ Add analytics (optional)

---

**Congratulations!** 🎊 Your NetWorth Tracker is now live and installable as a professional PWA!
