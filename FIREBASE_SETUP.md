# 🔥 Firebase Setup Guide — Sowers Ministry

## Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `sowers-ministry`
3. Disable Google Analytics (optional) → **Create Project**

---

## Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Enable **Phone** (for employee OTP login)
3. Enable **Email/Password** (for admin login)

---

## Step 3: Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Production mode**
3. Select closest region (e.g., `asia-south1` for India)

### Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Employees can read/write children they added
    match /children/{childId} {
      allow read, write: if request.auth != null;
    }

    // Users collection — only admins can read all
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth.token.admin == true;
    }

    // Admin-only collections
    match /admins/{adminId} {
      allow read, write: if request.auth.token.admin == true;
    }
  }
}
```

---

## Step 4: Register Apps

### Android App (Mobile):
1. Firebase Console → **Project Settings** → **Add app** → Android
2. Package name: `com.sowersministry.app`
3. Download `google-services.json` → place in `mobile-app/`

### Web App (Admin Panel):
1. Firebase Console → **Project Settings** → **Add app** → Web
2. App nickname: `Sowers Admin Panel`
3. Copy the config object (used in `admin-panel/lib/firebase.ts`)

---

## Step 5: Create Admin User

Run this once in Firebase Console → **Authentication** → **Add user**:
- Email: `admin@sowersministry.org`
- Password: (set a strong password)

Then in Firestore, create document `admins/YOUR_ADMIN_UID`:
```json
{
  "email": "admin@sowersministry.org",
  "name": "Admin",
  "role": "superadmin"
}
```

---

## Step 6: Firestore Collections Structure

### `users` collection:
```json
{
  "uid": "firebase_uid",
  "phone": "+919876543210",
  "name": "Employee Name",
  "createdAt": "timestamp",
  "totalEntries": 0
}
```

### `children` collection:
```json
{
  "id": "auto_generated",
  "firstName": "Ravi",
  "lastName": "Kumar",
  "parentName": "Suresh Kumar",
  "age": 8,
  "gender": "Male",
  "village": "Narsapur",
  "employeeId": "firebase_uid",
  "employeeName": "Employee Name",
  "employeePhone": "+919876543210",
  "createdAt": "timestamp"
}
```

---

## Step 7: Enable Firebase for Expo (Mobile App)

```bash
cd mobile-app
npx expo install firebase
```

Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```
