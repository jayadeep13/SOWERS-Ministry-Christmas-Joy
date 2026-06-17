# 🌟 Sowers Ministry — Christmas Joy Programme
## Complete Setup Guide

---

## 📁 Project Structure

```
sowers-ministry/
├── mobile-app/              ← React Native (Expo)
│   ├── app/
│   │   ├── _layout.tsx      ← Root layout + fonts
│   │   ├── (auth)/
│   │   │   └── login.tsx    ← OTP Login screen
│   │   └── (app)/
│   │       ├── home.tsx     ← Employee home
│   │       ├── add-child.tsx ← Child form
│   │       └── success.tsx  ← Success screen
│   ├── context/
│   │   └── AuthContext.tsx  ← Firebase auth state
│   ├── lib/
│   │   └── firebase.ts      ← Firebase config
│   ├── constants/
│   │   └── theme.ts         ← Colors, fonts, spacing
│   ├── app.json             ← Expo config
│   └── eas.json             ← EAS build config
│
├── admin-panel/             ← Next.js 14
│   ├── app/
│   │   ├── layout.tsx       ← Root layout
│   │   ├── page.tsx         ← Redirect → /login
│   │   ├── globals.css      ← Theme + Tailwind
│   │   ├── login/
│   │   │   └── page.tsx     ← Admin login
│   │   └── dashboard/
│   │       ├── layout.tsx   ← Auth guard + sidebar
│   │       ├── page.tsx     ← Dashboard + charts
│   │       ├── children/
│   │       │   └── page.tsx ← Data table + filters
│   │       └── employees/
│   │           └── page.tsx ← Employee management
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── TopNav.tsx
│   ├── lib/
│   │   └── firebase.ts
│   └── .env.example         ← Environment variables
│
└── FIREBASE_SETUP.md        ← Firebase setup guide
```

---

## 🚀 STEP-BY-STEP SETUP

---

### ✅ STEP 1: Firebase Setup (Do This First!)

Follow the detailed guide in `FIREBASE_SETUP.md`.

Quick summary:
1. Create Firebase project at https://console.firebase.google.com
2. Enable **Phone Auth** + **Email/Password Auth**
3. Create Firestore database
4. Register both Android app and Web app
5. Create admin user in Firebase Auth

---

### ✅ STEP 2: Admin Panel Setup (Next.js)

```bash
# Navigate to admin panel
cd sowers-ministry/admin-panel

# Install dependencies
npm install

# Create your environment file
cp .env.example .env.local
# Edit .env.local with your Firebase config values

# Run development server
npm run dev
# Open: http://localhost:3000
```

**Login at:** http://localhost:3000/login
- Email: `admin@sowersministry.org`
- Password: (what you set in Firebase)

---

### ✅ STEP 3: Mobile App Setup (Expo)

```bash
# Install Expo CLI globally (if not installed)
npm install -g expo-cli eas-cli

# Navigate to mobile app
cd sowers-ministry/mobile-app

# Install dependencies
npm install

# Add your Firebase config
# Edit lib/firebase.ts with your config values
```

**Important:** Also update `lib/firebase.ts` with your Firebase config.

---

### ✅ STEP 4: Run Mobile App

```bash
# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your phone
# OR press 'a' for Android emulator
```

**Test OTP Login:**
- For testing, Firebase allows test phone numbers
- Go to Firebase Console → Authentication → Phone → Test phone numbers
- Add: `+91 9999999999` with OTP: `123456`

---

### ✅ STEP 5: Build Android APK for Testing

```bash
cd mobile-app

# Login to Expo account
eas login

# Build APK (for internal testing)
eas build --platform android --profile preview

# Download the APK from the link provided
# Share via WhatsApp/Drive for testing
```

---

### ✅ STEP 6: Build AAB for Play Store

```bash
# Production build (AAB format for Play Store)
eas build --platform android --profile production

# After build completes, download .aab file
# Upload to Google Play Console → Internal Testing
```

---

### ✅ STEP 7: Deploy Admin Panel to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd admin-panel
vercel

# Follow prompts, then go to Vercel dashboard
# Add Environment Variables:
# NEXT_PUBLIC_FIREBASE_API_KEY = your_value
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = your_value
# ... (all values from .env.example)
```

Or deploy via GitHub:
1. Push code to GitHub
2. Go to https://vercel.com → New Project
3. Import your repo
4. Add all environment variables
5. Deploy!

---

## 🔧 Common Issues & Fixes

### Issue: "Firebase App already initialized"
**Fix:** Already handled in `lib/firebase.ts` with `getApps()` check.

### Issue: OTP not received
**Fix:** 
- Make sure Phone Auth is enabled in Firebase
- For testing, use test phone numbers in Firebase Console
- Real OTP requires verified domain (use production build)

### Issue: Firestore permission denied
**Fix:** Check Firestore Security Rules in `FIREBASE_SETUP.md`

### Issue: Fonts not loading (mobile)
**Fix:** Run `npx expo install @expo-google-fonts/playfair-display @expo-google-fonts/inter`

### Issue: RecaptchaVerifier error on mobile
**Fix:** Phone OTP on Expo Go requires extra setup. Use development build:
```bash
eas build --profile development --platform android
```

---

## 📱 App Features Summary

### Employee Mobile App
- ✅ OTP Phone Login
- ✅ Add Child Form (6 fields)
- ✅ Real-time entry count
- ✅ View recent entries
- ✅ Success confirmation screen
- ✅ Dark blue + gold design theme

### Admin Web Panel
- ✅ Email/Password Admin Login
- ✅ Dashboard with live analytics charts
- ✅ Children data table with search + filters
- ✅ Sort by any column
- ✅ Pagination (15 per page)
- ✅ Export to CSV
- ✅ Employee leaderboard
- ✅ Add/remove employees
- ✅ Real-time Firestore updates

---

## 🎨 Design Token Reference

| Token | Value | Usage |
|-------|-------|-------|
| Dark Blue | `#0B1C3D` | Background |
| Gradient Blue | `#1E3A8A → #0B1C3D` | Hero sections |
| Gold | `#D4AF37` | Buttons, accents |
| White | `#FFFFFF` | Text |
| Card BG | `rgba(255,255,255,0.05)` | Glass cards |
| Card Border | `rgba(255,255,255,0.10)` | Glass borders |

---

## 📞 Need Help?

For any issues with setup, check:
1. Firebase Console → Project Settings → Config
2. Ensure all `.env.local` values are correct
3. Check Firebase Auth → Users to confirm accounts exist
4. Firebase Console → Firestore → Data to confirm data is saving
