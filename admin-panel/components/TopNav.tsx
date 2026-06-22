'use client';
// components/TopNav.tsx
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Bell, User, Calendar, X, Baby } from 'lucide-react';
import { format, isToday } from 'date-fns';

interface RecentChild {
  id: string;
  firstName: string;
  lastName: string;
  village: string;
  employeeName: string;
  createdAt: any;
}

export default function TopNav() {
  const [email, setEmail] = useState('');
  const [todayChildren, setTodayChildren] = useState<RecentChild[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setEmail(user.email || '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const todays = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RecentChild))
        .filter((c) => c.createdAt?.toDate && isToday(c.createdAt.toDate()));
      setTodayChildren(todays);
    });
    return () => unsub();
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = todayChildren.length - lastSeenCount;

  const handleBellClick = () => {
    setShowNotifs((v) => {
      if (!v) setLastSeenCount(todayChildren.length);
      return !v;
    });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Calendar size={14} />
          <span>{format(new Date(), 'EEEE, d MMMM yyyy')}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Bell with live notification panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors relative"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-gold rounded-full text-black text-[10px] font-bold flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div>
                  <p className="text-gray-900 font-semibold text-sm">Today's Registrations</p>
                  <p className="text-gray-400 text-xs">{todayChildren.length} child{todayChildren.length !== 1 ? 'ren' : ''} added today</p>
                </div>
                <button
                  onClick={() => setShowNotifs(false)}
                  className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700"
                >
                  <X size={13} />
                </button>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {todayChildren.length === 0 ? (
                  <div className="text-center py-8">
                    <Baby size={28} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No registrations today yet</p>
                  </div>
                ) : (
                  todayChildren.map((child) => (
                    <div key={child.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                        {child.firstName?.[0]}{child.lastName?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">
                          {child.firstName} {child.lastName}
                        </p>
                        <p className="text-gray-400 text-xs truncate">
                          {child.village} · by {child.employeeName}
                        </p>
                      </div>
                      {child.createdAt?.toDate && (
                        <p className="text-gray-300 text-xs flex-shrink-0">
                          {format(child.createdAt.toDate(), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
