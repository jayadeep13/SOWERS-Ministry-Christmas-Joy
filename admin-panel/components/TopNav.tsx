'use client';
// components/TopNav.tsx
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Bell, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function TopNav() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setEmail(user.email || '');
    });
    return () => unsub();
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Calendar size={14} />
          <span>{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
        </button>

        <div className="flex items-center gap-2.5 bg-gray-100 rounded-xl px-3 py-2">
          <div className="w-7 h-7 rounded-lg bg-[#1E3A8A] flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <span className="text-gray-700 text-sm">{email || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}
