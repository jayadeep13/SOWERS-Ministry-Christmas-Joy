'use client';

import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { MapPin, Plus, Trash2, Loader2, X, CheckCircle } from 'lucide-react';

interface Area {
  id: string;
  name: string;
  createdAt: any;
}

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAreas(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Area)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Area name is required'); return; }
    setError('');
    setAddLoading(true);
    try {
      await addDoc(collection(db, 'areas'), { name: name.trim(), createdAt: serverTimestamp() });
      setSuccess(`Area "${name.trim()}" added!`);
      setName('');
      setTimeout(() => { setSuccess(''); setShowAdd(false); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add area');
    }
    setAddLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    try {
      await deleteDoc(doc(db, 'areas', id));
    } catch {}
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Areas / Villages</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the area list that appears in the mobile app village dropdown
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(''); setName(''); }}
          className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Add Area
        </button>
      </div>

      {/* Stats chip */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gold/10 border border-gold/25 rounded-xl px-4 py-2">
          <MapPin size={15} className="text-gold" />
          <span className="text-gold font-semibold text-sm">{areas.length} areas</span>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-serif font-bold text-gray-900">Add New Area</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {success && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">
                  Area / Village Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kurnool, Nandyal, Adoni..."
                  className="input-field w-full"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="gold-btn flex-1 py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  {addLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Areas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold" />
        </div>
      ) : areas.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 gap-3">
          <MapPin size={48} className="text-gray-200" />
          <p className="text-gray-400 text-lg font-medium">No areas yet</p>
          <p className="text-gray-300 text-sm">Add your first area to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {areas.map((area) => (
            <div
              key={area.id}
              className="glass-card flex items-center justify-between px-4 py-3 group hover:border-gold/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-gold" />
                </div>
                <span className="text-gray-800 font-medium text-sm">{area.name}</span>
              </div>
              <button
                onClick={() => handleDelete(area.id)}
                disabled={deleteId === area.id}
                className="text-gray-300 hover:text-red-500 transition-colors ml-2 flex-shrink-0 disabled:opacity-40"
                title="Delete area"
              >
                {deleteId === area.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
