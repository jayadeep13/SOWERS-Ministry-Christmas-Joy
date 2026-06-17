import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  doc, getDoc, setDoc, getDocs, deleteDoc,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  employeeData: any;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // 1. Try looking up by Firebase Auth UID (standard path)
        const uidRef = doc(db, 'users', firebaseUser.uid);
        const uidSnap = await getDoc(uidRef);

        if (uidSnap.exists()) {
          setEmployeeData(uidSnap.data());
        } else {
          // 2. Admin pre-created the employee by phone number with a random doc ID.
          //    Find that record and migrate it to use the Firebase Auth UID.
          const phone = firebaseUser.phoneNumber ?? '';
          const q = query(collection(db, 'users'), where('phone', '==', phone));
          const phoneSnap = await getDocs(q);

          if (!phoneSnap.empty) {
            // Found the admin-created record — move it to the UID-keyed doc
            const oldDoc = phoneSnap.docs[0];
            const existing = oldDoc.data();
            const merged = {
              ...existing,
              uid: firebaseUser.uid,
              phone,
              lastLoginAt: serverTimestamp(),
            };
            await setDoc(uidRef, merged);
            // Remove the stale random-ID doc so there are no duplicates
            if (oldDoc.id !== firebaseUser.uid) {
              await deleteDoc(oldDoc.ref);
            }
            setEmployeeData(merged);
          } else {
            // No admin record found — first-time login with no pre-setup
            const newEmployee = {
              uid: firebaseUser.uid,
              phone,
              name: 'Employee',
              totalEntries: 0,
              createdAt: serverTimestamp(),
            };
            await setDoc(uidRef, newEmployee);
            setEmployeeData(newEmployee);
          }
        }
      } else {
        setEmployeeData(null);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = async () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, employeeData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
