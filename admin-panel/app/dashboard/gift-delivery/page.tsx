'use client';
// app/dashboard/gift-delivery/page.tsx
// Mark gifts as delivered: per child, for selected children, or for a whole
// village / employee at once. Loads every child live, so filters cover all records.
import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '../../../lib/firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import { format } from 'date-fns';
import {
  Gift, CheckCircle, Search, X, Loader2, Users, MapPin, UserCog, Undo2, Filter,
} from 'lucide-react';
import { setGiftStatus } from '../../../lib/gifts';
import { genderLabel } from '../../../lib/gender';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  parentName: string;
  age: number;
  gender: string;
  village: string;
  employeeId: string;
  employeeName: string;
  deleted?: boolean;
  giftReceived?: boolean;
  giftReceivedAt?: any;
}

type View = 'children' | 'village' | 'employee';
type Status = '' | 'pending' | 'delivered';

interface Group { key: string; label: string; ids: string[]; total: number; delivered: number; }

export default function GiftDeliveryPage() {
  const [all, setAll] = useState<Child[] | null>(null);
  const [view, setView] = useState<View>('children');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('');
  const [employee, setEmployee] = useState('');
  const [gender, setGender] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [status, setStatus] = useState<Status>('pending');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'children'), (snap) => {
      setAll(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)).filter((c) => !c.deleted));
    });
    return () => unsub();
  }, []);

  const children = all ?? [];
  const villages = useMemo(() => Array.from(new Set(children.map((c) => c.village).filter(Boolean))).sort(), [children]);
  const employees = useMemo(() => {
    const m = new Map<string, string>();
    children.forEach((c) => c.employeeId && m.set(c.employeeId, c.employeeName || 'Unknown'));
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [children]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return children
      .filter((c) => !village || c.village === village)
      .filter((c) => !employee || c.employeeId === employee)
      .filter((c) => !gender || c.gender === gender)
      .filter((c) => !ageMin || c.age >= parseInt(ageMin))
      .filter((c) => !ageMax || c.age <= parseInt(ageMax))
      .filter((c) => (status === 'delivered' ? c.giftReceived : status === 'pending' ? !c.giftReceived : true))
      .filter((c) => !s || `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) || c.parentName?.toLowerCase().includes(s))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [children, search, village, employee, gender, ageMin, ageMax, status]);

  // Drop selections that are no longer visible after a filter change
  useEffect(() => {
    const visible = new Set(filtered.map((c) => c.id));
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const groups = (by: 'village' | 'employee'): Group[] => {
    const m = new Map<string, Group>();
    children.forEach((c) => {
      const key = by === 'village' ? c.village || 'Unknown' : c.employeeId || 'unknown';
      const label = by === 'village' ? c.village || 'Unknown' : c.employeeName || 'Unknown';
      const g = m.get(key) ?? { key, label, ids: [], total: 0, delivered: 0 };
      g.total += 1;
      if (c.giftReceived) g.delivered += 1;
      else g.ids.push(c.id); // pending ids, for "mark all delivered"
      m.set(key, g);
    });
    return Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  const totalDelivered = children.filter((c) => c.giftReceived).length;
  const percent = children.length ? Math.round((totalDelivered / children.length) * 100) : 0;

  const hasFilters = !!(search || village || employee || gender || ageMin || ageMax || status);
  const clearFilters = () => {
    setSearch(''); setVillage(''); setEmployee(''); setGender(''); setAgeMin(''); setAgeMax(''); setStatus('');
  };

  const run = async (ids: string[], received: boolean, question: string) => {
    if (ids.length === 0 || !confirm(question)) return;
    setBusy(true);
    try {
      await setGiftStatus(db, ids, received, auth.currentUser?.email ?? 'Admin');
      setSelected(new Set());
    } catch (err: any) {
      alert(err.message);
    }
    setBusy(false);
  };

  const plural = (n: number) => `${n} child${n !== 1 ? 'ren' : ''}`;
  const selectedIds = Array.from(selected);
  const selectedPending = filtered.filter((c) => selected.has(c.id) && !c.giftReceived).map((c) => c.id);
  const selectedDelivered = filtered.filter((c) => selected.has(c.id) && c.giftReceived).map((c) => c.id);
  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!all) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + progress */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Gift Delivery</h1>
          <p className="text-gray-400 text-sm mt-1">Mark gifts as delivered child by child, by village, or by employee</p>
        </div>
        <div className="glass-card px-5 py-3 min-w-[280px]">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivered</span>
            <span className="font-semibold text-gray-900">{totalDelivered} / {children.length} · {percent}%</span>
          </div>
          <div className="mt-2 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2.5 rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {([
          { key: 'children', label: 'By Child', icon: Users },
          { key: 'village', label: 'By Village', icon: MapPin },
          { key: 'employee', label: 'By Employee', icon: UserCog },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              view === key ? 'bg-gold text-black border-gold' : 'bg-white text-gray-600 border-gray-200 hover:border-gold/40'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {view !== 'children' ? (
        <GroupList
          groups={groups(view)}
          kind={view}
          busy={busy}
          onMarkAll={(g) => run(g.ids, true, `Mark gift as delivered for all ${plural(g.ids.length)} still pending in "${g.label}"?`)}
          onView={(g) => {
            clearFilters();
            if (view === 'village') setVillage(g.key);
            else setEmployee(g.key);
            setView('children');
          }}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-gold" />
                <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Filters</span>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-gray-400 hover:text-gray-700 text-xs flex items-center gap-1">
                  <X size={12} /> Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input-field w-full pl-9"
                  placeholder="Search child or parent name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select className="input-field pr-8 min-w-[150px]" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                <option value="">All Gift Status</option>
                <option value="pending">Pending only</option>
                <option value="delivered">Delivered only</option>
              </select>
              <select className="input-field pr-8 min-w-[150px]" value={village} onChange={(e) => setVillage(e.target.value)}>
                <option value="">All Villages</option>
                {villages.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select className="input-field pr-8 min-w-[150px]" value={employee} onChange={(e) => setEmployee(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select className="input-field pr-8" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Boys &amp; Girls</option>
                <option value="Male">Boys</option>
                <option value="Female">Girls</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex items-center gap-2">
                <input className="input-field w-20" type="number" min={1} max={14} placeholder="Age min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                <span className="text-gray-300 text-sm">–</span>
                <input className="input-field w-20" type="number" min={1} max={14} placeholder="Age max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-3 sticky top-0 z-10">
            <p className="text-sm text-gray-600 mr-auto">
              <span className="font-semibold text-gray-900">{filtered.length}</span> shown
              {selected.size > 0 && <> · <span className="font-semibold text-gold">{selected.size}</span> selected</>}
            </p>
            {selected.size > 0 ? (
              <>
                <button
                  disabled={busy || selectedPending.length === 0}
                  onClick={() => run(selectedPending, true, `Mark gift as delivered for ${plural(selectedPending.length)}?`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm hover:bg-green-700 transition-all disabled:opacity-40"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  Mark {selectedPending.length} Delivered
                </button>
                {selectedDelivered.length > 0 && (
                  <button
                    disabled={busy}
                    onClick={() => run(selectedDelivered, false, `Undo delivery for ${plural(selectedDelivered.length)}? They will show as pending again.`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 border border-gray-200 transition-all disabled:opacity-40"
                  >
                    <Undo2 size={15} />
                    Undo {selectedDelivered.length}
                  </button>
                )}
                <button onClick={() => setSelected(new Set())} className="text-gray-400 hover:text-gray-700 text-sm">
                  Clear selection
                </button>
              </>
            ) : (
              <p className="text-xs text-gray-400">Tick children to mark them, or use the button on each row</p>
            )}
          </div>

          {/* Children list */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                        checked={allSelected}
                        onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)))}
                        title="Select all shown"
                      />
                    </th>
                    {['Name', 'Parent', 'Age', 'Gender', 'Village', 'Employee', 'Gift Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
                        <p className="text-gray-400">No children match these filters</p>
                        {hasFilters && (
                          <button onClick={clearFilters} className="text-gold text-sm mt-2 hover:underline">Clear all filters</button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className={`table-row cursor-pointer ${selected.has(c.id) ? 'bg-gold/5' : ''}`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                            checked={selected.has(c.id)}
                            onChange={() => toggle(c.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium">{c.firstName} {c.lastName}</td>
                        <td className="px-4 py-3 text-gray-500">{c.parentName}</td>
                        <td className="px-4 py-3 text-gray-800">{c.age}</td>
                        <td className="px-4 py-3 text-gray-600">{genderLabel(c.gender)}</td>
                        <td className="px-4 py-3 text-gray-600">{c.village}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{c.employeeName}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            disabled={busy}
                            onClick={() =>
                              c.giftReceived
                                ? run([c.id], false, `Undo gift delivery for "${c.firstName} ${c.lastName}"? It will show as pending again.`)
                                : run([c.id], true, `Mark gift as delivered to "${c.firstName} ${c.lastName}"?`)
                            }
                            title={c.giftReceived ? 'Click to undo' : 'Click to mark delivered'}
                            className={`badge inline-flex items-center gap-1 whitespace-nowrap transition-colors disabled:opacity-50 ${
                              c.giftReceived
                                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            {c.giftReceived ? <CheckCircle size={12} /> : <Gift size={12} />}
                            {c.giftReceived ? 'Delivered' : 'Pending'}
                          </button>
                          {c.giftReceived && c.giftReceivedAt?.toDate && (
                            <p className="text-gray-400 text-[11px] mt-0.5">{format(c.giftReceivedAt.toDate(), 'dd MMM yy')}</p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GroupList({
  groups, kind, busy, onMarkAll, onView,
}: {
  groups: Group[];
  kind: 'village' | 'employee';
  busy: boolean;
  onMarkAll: (g: Group) => void;
  onView: (g: Group) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map((g) => {
        const pct = g.total ? Math.round((g.delivered / g.total) * 100) : 0;
        const done = g.ids.length === 0;
        return (
          <div key={g.key} className={`glass-card p-4 ${done ? 'border border-green-200' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-gray-900 flex items-center gap-1.5">
                {kind === 'village' ? <MapPin size={14} className="text-gold" /> : <UserCog size={14} className="text-gold" />}
                {g.label}
              </p>
              {done && <span className="badge bg-green-50 text-green-700 border border-green-200 text-xs">All delivered</span>}
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-2 rounded-full ${done ? 'bg-green-500' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              <span className="font-semibold text-gray-900">{g.delivered}</span> of {g.total} delivered · {g.ids.length} pending
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onView(g)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
              >
                View children
              </button>
              {!done && (
                <button
                  disabled={busy}
                  onClick={() => onMarkAll(g)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700 transition-colors disabled:opacity-40"
                >
                  Mark all {g.ids.length} delivered
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
