'use client';
// app/dashboard/employees/page.tsx
import { useEffect, useState, useMemo } from 'react';
import { db, auth, firebaseConfig } from '../../../lib/firebase';
import { phoneToEmployeeEmail } from '../../../lib/employeeAuth';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, query, orderBy, setDoc, doc, serverTimestamp, deleteDoc, updateDoc
} from 'firebase/firestore';
import {
  UserPlus, Phone, Trash2, Loader2, X, CheckCircle, ChevronDown, ChevronUp, MapPin, Baby,
  KeyRound, ShieldAlert,
} from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  phone: string;
  totalEntries: number;
  createdAt: any;
  pendingPinReset?: string;
  pinResetAt?: any;
  pinResetReason?: 'manual' | 'auto-lockout';
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  village: string;
  employeeName: string;
  employeeId: string;
  createdAt: any;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', pin: '' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalEntries', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
    });
    return () => unsub();
  }, []);

  // Group children by employeeId first, fall back to employeeName
  const childrenByEmployee = useMemo(() => {
    const map: Record<string, Child[]> = {};
    children.forEach((c) => {
      const key = c.employeeId || c.employeeName || 'Unknown';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return map;
  }, [children]);

  const getEmployeeChildren = (emp: Employee) =>
    childrenByEmployee[emp.id] ??
    children.filter((c) => c.employeeName === emp.name);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(form.pin)) {
      setError('PIN must be exactly 6 digits.');
      return;
    }
    setAddLoading(true);
    try {
      const phone = form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`;

      // Create the Firebase Auth account on a secondary, isolated app instance
      // so this doesn't sign the admin out of their own session.
      const creatorApp = getApps().find((a) => a.name === 'employee-creator')
        ?? initializeApp(firebaseConfig, 'employee-creator');
      const creatorAuth = getAuth(creatorApp);

      const credential = await createUserWithEmailAndPassword(
        creatorAuth,
        phoneToEmployeeEmail(form.phone),
        form.pin
      );
      const uid = credential.user.uid;
      await signOut(creatorAuth);
      await deleteApp(creatorApp);

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: form.name,
        phone,
        totalEntries: 0,
        createdAt: serverTimestamp(),
        addedByAdmin: true,
      });
      setSuccess(`Employee "${form.name}" added successfully!`);
      setForm({ name: '', phone: '', pin: '' });
      setTimeout(() => { setSuccess(''); setShowAdd(false); }, 2500);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('An employee with this mobile number already exists.');
      } else if (code === 'auth/weak-password') {
        setError('PIN must be exactly 6 digits.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid 10-digit mobile number.');
      } else {
        setError(err.message || 'Failed to add employee.');
      }
    }
    setAddLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove employee "${name}" from the list? This won't delete their recorded entries.`)) return;
    await deleteDoc(doc(db, 'users', id));
  };

  const handleResetPin = async (id: string, name: string) => {
    if (!confirm(`Generate a new PIN for "${name}"? Their current PIN will stop working immediately.`)) return;
    setResettingId(id);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/employees/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ employeeUid: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset PIN');
    } catch (err: any) {
      alert(`Could not reset PIN: ${err.message || 'unknown error'}`);
    }
    setResettingId(null);
  };

  const handleDismissPendingPin = async (id: string) => {
    setDismissingId(id);
    try {
      await updateDoc(doc(db, 'users', id), {
        pendingPinReset: null,
        pinResetAt: null,
        pinResetReason: null,
      });
    } catch {}
    setDismissingId(null);
  };

  const totalEntries = employees.reduce((s, e) => s + (e.totalEntries || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Employees</h1>
          <p className="text-gray-400 text-sm mt-1">{employees.length} registered field workers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm"
        >
          <UserPlus size={16} />
          Add Employee
        </button>
      </div>

      {/* Stats Bar */}
      <div className="glass-card p-5 flex gap-8 flex-wrap">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Total Employees</p>
          <p className="font-serif text-2xl text-gray-900 mt-1">{employees.length}</p>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Total Entries</p>
          <p className="font-serif text-2xl text-gold mt-1">{totalEntries}</p>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Avg. per Employee</p>
          <p className="font-serif text-2xl text-gray-900 mt-1">
            {employees.length ? Math.round(totalEntries / employees.length) : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl text-gray-900">Employee Leaderboard</h2>
          <p className="text-gray-400 text-xs mt-0.5">Click any row to see the children they registered</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No employees yet</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map((emp, i) => {
              const maxEntries = employees[0]?.totalEntries || 1;
              const pct = Math.round(((emp.totalEntries || 0) / maxEntries) * 100);
              const empChildren = getEmployeeChildren(emp);
              const isExpanded = expanded === emp.id;

              return (
                <div key={emp.id}>
                  {/* Employee Row */}
                  <div
                    className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : emp.id)}
                  >
                    {/* Rank */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-gold text-black' :
                      i === 1 ? 'bg-gray-200 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-500' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                      {emp.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-semibold truncate">{emp.name || 'Unknown'}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-gray-400 text-xs flex items-center gap-1">
                          <Phone size={10} />
                          {emp.phone || '—'}
                        </span>
                        {emp.createdAt?.toDate && (
                          <span className="text-gray-400 text-xs">
                            Joined {format(emp.createdAt.toDate(), 'MMM yyyy')}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? '#D4AF37' : '#1E3A8A',
                          }}
                        />
                      </div>
                    </div>

                    {/* Count */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-serif text-xl font-bold ${i === 0 ? 'text-gold' : 'text-gray-900'}`}>
                        {emp.totalEntries || 0}
                      </p>
                      <p className="text-gray-400 text-xs">entries</p>
                    </div>

                    {/* Expand chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {empChildren.length > 0 && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                          {empChildren.length} child{empChildren.length !== 1 ? 'ren' : ''}
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp size={16} className="text-gold" />
                        : <ChevronDown size={16} className="text-gray-400 group-hover:text-gold transition-colors" />
                      }
                    </div>

                    {/* Reset PIN */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleResetPin(emp.id, emp.name); }}
                      disabled={resettingId === emp.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gold/10 text-gray-300 hover:text-gold transition-all disabled:opacity-100"
                      title="Reset PIN"
                    >
                      {resettingId === emp.id ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(emp.id, emp.name); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                      title="Remove employee"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Pending PIN reset banner */}
                  {emp.pendingPinReset && (
                    <div className="bg-gold/5 border-t border-gold/20 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className="text-gold flex-shrink-0" />
                        <p className="text-sm text-gray-700">
                          {emp.pinResetReason === 'auto-lockout'
                            ? <>PIN auto-reset after too many failed attempts.</>
                            : <>PIN was manually reset.</>}
                          {' '}New PIN: <span className="font-mono font-bold text-gray-900 tracking-widest">{emp.pendingPinReset}</span>
                          {' '}— share this with {emp.name}.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDismissPendingPin(emp.id)}
                        disabled={dismissingId === emp.id}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors flex-shrink-0 disabled:opacity-40"
                      >
                        {dismissingId === emp.id ? 'Clearing…' : 'Mark as delivered'}
                      </button>
                    </div>
                  )}

                  {/* Expanded children list */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                      {empChildren.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">
                          No children registered by this employee yet.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
                            {empChildren.length} Children Registered by {emp.name}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {empChildren.map((child) => (
                              <div
                                key={child.id}
                                className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
                              >
                                <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                                  {child.firstName?.[0]}{child.lastName?.[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-900 text-sm font-semibold truncate">
                                    {child.firstName} {child.lastName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                      child.gender === 'Male'
                                        ? 'bg-blue-50 text-blue-600'
                                        : child.gender === 'Female'
                                        ? 'bg-pink-50 text-pink-600'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {child.gender} · {child.age}y
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <MapPin size={10} className="text-gray-400 flex-shrink-0" />
                                    <span className="text-gray-400 text-xs truncate">{child.village}</span>
                                  </div>
                                </div>
                                {child.createdAt?.toDate && (
                                  <p className="text-gray-300 text-xs flex-shrink-0">
                                    {format(child.createdAt.toDate(), 'dd MMM')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl text-gray-900">Add Employee</h2>
              <button
                onClick={() => { setShowAdd(false); setError(''); }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-600 font-medium">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-gold text-xs uppercase tracking-widest font-semibold mb-2">
                    Full Name
                  </label>
                  <input
                    className="input-field w-full"
                    placeholder="Employee's full name"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gold text-xs uppercase tracking-widest font-semibold mb-2">
                    Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <span className="input-field flex items-center text-gold font-semibold">+91</span>
                    <input
                      className="input-field flex-1"
                      placeholder="10-digit mobile number"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gold text-xs uppercase tracking-widest font-semibold mb-2">
                    PIN (6 digits)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input-field flex-1 tracking-widest font-mono"
                      placeholder="e.g. 483920"
                      value={form.pin}
                      onChange={(e) => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      maxLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, pin: Math.floor(100000 + Math.random() * 900000).toString() }))}
                      className="px-3 rounded-xl border border-gray-200 text-gray-500 text-xs hover:bg-gray-100 hover:text-gray-800 transition-colors whitespace-nowrap"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">The employee will log in with their mobile number and this PIN.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={addLoading} className="gold-btn flex-1 py-2.5 flex items-center justify-center gap-2 text-sm">
                    {addLoading ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Add Employee</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
