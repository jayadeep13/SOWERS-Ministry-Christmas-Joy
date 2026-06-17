'use client';
// components/Sidebar.tsx
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  LayoutDashboard,
  Users,
  UserCog,
  MapPin,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/children', label: 'Children Data', icon: Users },
  { href: '/dashboard/employees', label: 'Employees', icon: UserCog },
  { href: '/dashboard/areas', label: 'Areas', icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen bg-dark border-r border-white/5 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-gold/40 flex items-center justify-center overflow-hidden">
            <img src="/logo.webp" alt="Sowers Ministry" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm font-serif tracking-wider">SOWERS</p>
            <p className="text-gold text-xs tracking-widest">MINISTRY</p>
          </div>
        </div>
        <div className="mt-3 px-2 py-1.5 bg-gold/10 border border-gold/20 rounded-lg">
          <p className="text-gold text-xs text-center font-medium">Christmas Joy {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-white/30 text-xs uppercase tracking-widest font-semibold px-3 mb-3">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
                active
                  ? 'bg-gold/15 text-gold border border-gold/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon size={18} className={active ? 'text-gold' : 'text-white/40 group-hover:text-white/70'} />
              <span className="font-medium">{item.label}</span>
              {active && <ChevronRight size={14} className="ml-auto text-gold/60" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
        >
          <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
          <span>Sign Out</span>
        </button>
        <p className="text-white/20 text-xs text-center px-3">
          Admin Panel v1.0
        </p>
      </div>
    </aside>
  );
}
