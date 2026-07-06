'use client';

import { useEffect, useMemo, useState } from 'react';
import { db } from '../../../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, doc, writeBatch,
} from 'firebase/firestore';
import { Trash2, RotateCcw, Loader2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface DeletedChild {
  id: string;
  firstName: string;
  lastName: string;
  village: string;
  employeeName: string;
  deletedAt: any;
}

export default function RecycleBinPage() {
  const [items, setItems] = useState<DeletedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const deleted = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as DeletedChild & { deleted?: boolean }))
        .filter((c) => c.deleted);
      deleted.sort((a, b) => (b.deletedAt?.toMillis?.() ?? 0) - (a.deletedAt?.toMillis?.() ?? 0));
      setItems(deleted);
      setLoading(false);
      setSelected((prev) => new Set([...prev].filter((id) => deleted.some((c) => c.id === id))));
    });
    return () => unsub();
  }, []);

  const allSelected = items.length > 0 && selected.size === items.length;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(items.map((c) => c.id)));
  };

  const restoreIds = async (ids: string[]) => {
    setBusy(true);
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.update(doc(db, 'children', id), { deleted: false, deletedAt: null }));
      await batch.commit();
      setSelected(new Set());
    } catch (err: any) {
      alert(`Could not restore: ${err.message || err.code || 'unknown error'}`);
    }
    setBusy(false);
  };

  const deleteIds = async (ids: string[]) => {
    setBusy(true);
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(db, 'children', id)));
      await batch.commit();
      setSelected(new Set());
    } catch (err: any) {
      alert(`Could not permanently delete: ${err.message || err.code || 'unknown error'}`);
    }
    setBusy(false);
  };

  const handleRestoreSelected = () => restoreIds([...selected]);

  const handleDeleteSelected = () => {
    if (!confirm(`Permanently delete ${selected.size} record${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    deleteIds([...selected]);
  };

  const handleClearBin = () => {
    if (items.length === 0) return;
    if (!confirm(`Permanently delete all ${items.length} record${items.length !== 1 ? 's' : ''} in the recycle bin? This cannot be undone.`)) return;
    deleteIds(items.map((c) => c.id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Recycle Bin</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} deleted record{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={handleClearBin}
          disabled={busy || items.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all border border-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          Clear Recycle Bin
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="glass-card p-4 flex items-center justify-between bg-gold/5 border-gold/20">
          <span className="text-gray-700 text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestoreSelected}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm font-medium hover:bg-emerald-100 transition-all border border-emerald-200 disabled:opacity-40"
            >
              <RotateCcw size={14} />
              Restore Selected
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all border border-red-200 disabled:opacity-40"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left w-10">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gold transition-colors" disabled={items.length === 0}>
                    {allSelected ? <CheckSquare size={16} className="text-gold" /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Village</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Added By</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Deleted</th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin mx-auto" />
                    <p className="text-gray-400 text-sm mt-3">Loading data...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Trash2 size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-base">Recycle bin is empty</p>
                  </td>
                </tr>
              ) : (
                items.map((child) => (
                  <tr key={child.id} className="table-row">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleOne(child.id)} className="text-gray-400 hover:text-gold transition-colors">
                        {selected.has(child.id) ? <CheckSquare size={16} className="text-gold" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
                          {child.firstName?.[0]}{child.lastName?.[0]}
                        </div>
                        <p className="text-gray-900 font-medium">{child.firstName} {child.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{child.village}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">{child.employeeName}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {child.deletedAt?.toDate ? format(child.deletedAt.toDate(), 'dd MMM yy, h:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => restoreIds([child.id])}
                          disabled={busy}
                          className="text-gray-400 hover:text-emerald-500 transition-colors disabled:opacity-40"
                          title="Restore"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm(`Permanently delete "${child.firstName} ${child.lastName}"? This cannot be undone.`)) return;
                            deleteIds([child.id]);
                          }}
                          disabled={busy}
                          className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete permanently"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex items-start gap-2 text-gray-400 text-xs px-1">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>Deleted records stay here until restored or permanently removed — they don&apos;t count toward dashboard stats or Children Data.</p>
        </div>
      )}
    </div>
  );
}
