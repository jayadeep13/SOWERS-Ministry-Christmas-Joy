import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCHXbQsAxEw92nT5SAPlNlm4heTZVpJeTA",
  authDomain: "sowers-ministry-970cc.firebaseapp.com",
  projectId: "sowers-ministry-970cc",
  storageBucket: "sowers-ministry-970cc.firebasestorage.app",
  messagingSenderId: "1088538841840",
  appId: "1:1088538841840:web:886ee64eb72e20ad756835"
};

// Capture existing apps before initializing so we can tell if this is a
// fresh start or a hot reload (initializeAuth must only be called once).
const existingApps = getApps();
const app = existingApps.length === 0 ? initializeApp(firebaseConfig) : existingApps[0];

export const auth = existingApps.length === 0
  ? initializeAuth(app)
  : getAuth(app);

export const db = getFirestore(app);
export default app;
