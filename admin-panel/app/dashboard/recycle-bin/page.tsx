'use client';

import { useEffect, useRef, useState } from 'react';
import { db } from '../../../lib/firebase';
import { applyStatsDelta, applyEmployeeEntryDelta } from '../../../lib/stats';
import {
  collection, query, where, orderBy, limit, startAfter, getDocs,
  doc, writeBatch, QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import { Trash2, RotateCcw, Loader2, CheckSquare, Square, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface DeletedChild {
  id: string;
  firstName: string;
  lastName: string;
  village: string;
  gender: string;
  age: number;
  employeeId?: string;
  employeeName: string;
  deletedAt: any;
}

const PAGE_SIZE = 50;
// Firestore batch writes cap at 500 operations.
const CHUNK_SIZE = 450;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function RecycleBinPage() {
  const [items, setItems] = useState<DeletedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const pageCursorsRef = useRef<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({});

  const baseQuery = () => [where('deleted', '==', true), orderBy('deletedAt', 'desc')];

  const fetchPage = async (targetIndex: number) => {
    setLoading(true);
    setFetchError('');
    try {
      const cursor = targetIndex > 0 ? pageCursorsRef.current[targetIndex - 1] : null;
      const qArgs = cursor
        ? [...baseQuery(), startAfter(cursor), limit(PAGE_SIZE)]
        : [...baseQuery(), limit(PAGE_SIZE)];
      const snap = await getDocs(query(collection(db, 'children'), ...qArgs));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeletedChild));
      pageCursorsRef.current[targetIndex] = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      setItems(rows);
      setPageIndex(targetIndex);
      setHasMore(rows.length === PAGE_SIZE);
      setSelected(new Set());
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load data');
    }
    setLoading(false);
  };

  const resetAndLoad = () => {
    pageCursorsRef.current = {};
    fetchPage(0);
  };

  useEffect(() => { resetAndLoad(); }, []);

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

  const restoreRecords = async (records: DeletedChild[]) => {
    setBusy(true);
    try {
      for (const group of chunk(records, CHUNK_SIZE)) {
        const batch = writeBatch(db);
        group.forEach((c) => batch.update(doc(db, 'children', c.id), { deleted: false, deletedAt: null }));
        await batch.commit();
      }
      for (const c of records) {
        await applyStatsDelta(db, c.gender, c.age, c.village, 1);
        await applyEmployeeEntryDelta(db, c.employeeId, 1);
      }
      resetAndLoad();
    } catch (err: any) {
      alert(`Could not restore: ${err.message || err.code || 'unknown error'}`);
    }
    setBusy(false);
  };

  const deleteIds = async (ids: string[]) => {
    setBusy(true);
    try {
      for (const group of chunk(ids, CHUNK_SIZE)) {
        const batch = writeBatch(db);
        group.forEach((id) => batch.delete(doc(db, 'children', id)));
        await batch.commit();
      }
      resetAndLoad();
    } catch (err: any) {
      alert(`Could not permanently delete: ${err.message || err.code || 'unknown error'}`);
    }
    setBusy(false);
  };

  const handleRestoreSelected = () => restoreRecords(items.filter((c) => selected.has(c.id)));

  const handleDeleteSelected = () => {
    if (!confirm(`Permanently delete ${selected.size} record${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    deleteIds([...selected]);
  };

  const handleClearBin = async () => {
    if (!confirm('Permanently delete every record in the recycle bin? This cannot be undone.')) return;
    setBusy(true);
    try {
      const snap = await getDocs(query(collection(db, 'children'), ...baseQuery(), limit(20000)));
      const ids = snap.docs.map((d) => d.id);
      if (ids.length === 0) { setBusy(false); return; }
      for (const group of chunk(ids, CHUNK_SIZE)) {
        const batch = writeBatch(db);
        group.forEach((id) => batch.delete(doc(db, 'children', id)));
        await batch.commit();
      }
      resetAndLoad();
    } catch (err: any) {
      alert(`Could not clear the recycle bin: ${err.message || err.code || 'unknown error'}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Recycle Bin</h1>
          <p className="text-gray-400 text-sm mt-1">Page {pageIndex + 1} · {items.length} shown</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetAndLoad}
            title="Refresh"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-all border border-gray-200"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleClearBin}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-all border border-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            Clear Recycle Bin
          </button>
        </div>
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
              ) : fetchError ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <p className="text-red-500 font-medium text-sm">Failed to load data</p>
                    <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">{fetchError}</p>
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
                          onClick={() => restoreRecords([child])}
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

        {!loading && !fetchError && items.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs">Page {pageIndex + 1}</p>
            <div className="flex gap-2">
              <button
                disabled={pageIndex === 0 || busy}
                onClick={() => fetchPage(pageIndex - 1)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={!hasMore || busy}
                onClick={() => fetchPage(pageIndex + 1)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-gray-400 text-xs px-1">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <p>Deleted records stay here until restored or permanently removed — they don&apos;t count toward dashboard stats or Children Data.</p>
      </div>
    </div>
  );
}
