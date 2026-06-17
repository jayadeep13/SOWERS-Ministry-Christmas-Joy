'use client';
// app/dashboard/employees/page.tsx
import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, setDoc, doc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import {
  UserPlus, Phone, Trash2, Loader2, X, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  phone: string;
  totalEntries: number;
  createdAt: any;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalEntries', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAddLoading(true);
    try {
      const phone = form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`;
      const docRef = doc(collection(db, 'users'));
      await setDoc(docRef, {
        uid: docRef.id,
        name: form.name,
        phone,
        totalEntries: 0,
        createdAt: serverTimestamp(),
        addedByAdmin: true,
      });
      setSuccess(`Employee "${form.name}" added successfully!`);
      setForm({ name: '', phone: '' });
      setTimeout(() => { setSuccess(''); setShowAdd(false); }, 2500);
    } catch (err: any) {
      setError(err.message || 'Failed to add employee.');
    }
    setAddLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove employee "${name}" from the list? This won't delete their recorded entries.`)) return;
    await deleteDoc(doc(db, 'users', id));
  };

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
          <p className="font-serif text-2xl text-gold mt-1">
            {employees.reduce((s, e) => s + (e.totalEntries || 0), 0)}
          </p>
        </div>
        <div className="w-px bg-gray-100" />
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Avg. per Employee</p>
          <p className="font-serif text-2xl text-gray-900 mt-1">
            {employees.length
              ? Math.round(employees.reduce((s, e) => s + (e.totalEntries || 0), 0) / employees.length)
              : 0}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-serif text-xl text-gray-900">Employee Leaderboard</h2>
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
              return (
                <div key={emp.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
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

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(emp.id, emp.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
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
