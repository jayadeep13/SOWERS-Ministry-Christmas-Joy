'use client';
// app/login/page.tsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError('Invalid credentials. Please check your email and password.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-brand/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white border-2 border-gold/60 mb-4 overflow-hidden shadow-lg">
            <img src="/logo.webp" alt="Sowers Ministry" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-serif text-3xl text-white font-bold tracking-wide">SOWERS MINISTRY</h1>
          <p className="text-gold text-sm mt-1 tracking-widest uppercase">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="font-serif text-2xl text-white mb-1">Welcome back</h2>
          <p className="text-white/60 text-sm mb-6">Sign in to your admin account</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gold text-xs uppercase tracking-widest font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="input-field w-full"
                placeholder="admin@sowersministry.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-gold text-xs uppercase tracking-widest font-semibold mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gold-btn w-full py-3.5 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-white/30 text-xs">
            Sowers Ministry · Christmas Joy Programme {new Date().getFullYear()}
            &nbsp;·&nbsp;
            <a href="/privacy" className="text-white/40 hover:text-gold transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-white/25 text-xs">Designed &amp; Developed by</p>
            <img src="/pjlogo.png" alt="P&J Technologies" className="w-4 h-4 object-contain" />
            <p className="text-white/25 text-xs">P&amp;J Technologies</p>
          </div>
        </div>
      </div>
    </div>
  );
}
