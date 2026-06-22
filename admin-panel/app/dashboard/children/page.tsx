'use client';

import { useEffect, useState, useMemo } from 'react';
import { db, auth } from '../../../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Download, ChevronUp, ChevronDown, X, Calendar, Filter, Plus, Loader2, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { format, isToday, isThisWeek, isThisMonth, parseISO, startOfDay, endOfDay } from 'date-fns';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  parentName: string;
  age: number;
  gender: string;
  village: string;
  employeeName: string;
  employeePhone: string;
  createdAt: any;
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_CHIPS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const GENDERS = ['Male', 'Female', 'Other'];

const emptyForm = { firstName: '', lastName: '', parentName: '', age: '', gender: '', village: '' };

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Add-child modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [areas, setAreas] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [sortKey, setSortKey] = useState<keyof Child>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
        setLoading(false);
        setFetchError('');
      },
      (err) => {
        console.error('children fetch error:', err);
        setFetchError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAreas(snap.docs.map((d) => d.data().name as string));
    });
    return () => unsub();
  }, []);

  const openAddModal = () => {
    setAddForm(emptyForm);
    setAddError('');
    setAddSuccess('');
    setShowAdd(true);
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstName, lastName, parentName, age, gender, village } = addForm;
    if (!firstName.trim()) { setAddError('First name is required'); return; }
    if (!lastName.trim()) { setAddError('Last name is required'); return; }
    if (!parentName.trim()) { setAddError('Parent / guardian name is required'); return; }
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 1) { setAddError('Enter a valid age'); return; }
    if (!gender) { setAddError('Please select a gender'); return; }
    if (!village) { setAddError('Please select a village / area'); return; }
    setAddError('');
    setAddLoading(true);
    try {
      const adminUser = auth.currentUser;
      await addDoc(collection(db, 'children'), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        parentName: parentName.trim(),
        age: parseInt(age),
        gender,
        village,
        employeeId: adminUser?.uid ?? 'admin',
        employeeName: 'Admin',
        employeePhone: adminUser?.email ?? '',
        createdAt: serverTimestamp(),
      });
      setAddSuccess(`${firstName.trim()} ${lastName.trim()} added!`);
      setAddForm(emptyForm);
      setTimeout(() => { setAddSuccess(''); setShowAdd(false); }, 2000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to save. Check your connection.');
    }
    setAddLoading(false);
  };

  const villages = useMemo(() => Array.from(new Set(children.map((c) => c.village).filter(Boolean) as string[])).sort(), [children]);
  const employees = useMemo(() => Array.from(new Set(children.map((c) => c.employeeName).filter(Boolean) as string[])).sort(), [children]);

  const filtered = useMemo(() => {
    let data = [...children];

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(s) ||
          c.lastName?.toLowerCase().includes(s) ||
          c.parentName?.toLowerCase().includes(s) ||
          c.village?.toLowerCase().includes(s) ||
          c.employeeName?.toLowerCase().includes(s)
      );
    }

    if (genderFilter) data = data.filter((c) => c.gender === genderFilter);
    if (villageFilter) data = data.filter((c) => c.village === villageFilter);
    if (employeeFilter) data = data.filter((c) => c.employeeName === employeeFilter);
    if (ageMin) data = data.filter((c) => c.age >= parseInt(ageMin));
    if (ageMax) data = data.filter((c) => c.age <= parseInt(ageMax));

    if (dateFilter !== 'all') {
      data = data.filter((c) => {
        const d: Date = c.createdAt?.toDate?.() ?? null;
        if (!d) return false;
        if (dateFilter === 'today') return isToday(d);
        if (dateFilter === 'week') return isThisWeek(d, { weekStartsOn: 1 });
        if (dateFilter === 'month') return isThisMonth(d);
        if (dateFilter === 'custom') {
          const from = customFrom ? startOfDay(parseISO(customFrom)) : null;
          const to = customTo ? endOfDay(parseISO(customTo)) : null;
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        }
        return true;
      });
    }

    data.sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];
      if (sortKey === 'createdAt') {
        aVal = aVal?.toDate?.()?.getTime() ?? 0;
        bVal = bVal?.toDate?.()?.getTime() ?? 0;
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [children, search, genderFilter, villageFilter, employeeFilter, ageMin, ageMax, dateFilter, customFrom, customTo, sortKey, sortDir]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSort = (key: keyof Child) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };

  const clearAllFilters = () => {
    setSearch(''); setGenderFilter(''); setVillageFilter(''); setEmployeeFilter('');
    setAgeMin(''); setAgeMax(''); setDateFilter('all'); setCustomFrom(''); setCustomTo('');
    setPage(0);
  };

  const hasActiveFilters = search || genderFilter || villageFilter || employeeFilter || ageMin || ageMax || dateFilter !== 'all';

  const exportCSV = () => {
    const data = filtered.map((c) => ({
      'First Name': c.firstName,
      'Last Name': c.lastName,
      'Parent Name': c.parentName,
      Age: c.age,
      Gender: c.gender,
      Village: c.village,
      'Added By': c.employeeName,
      'Employee Phone': c.employeePhone,
      Date: c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : '',
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sowers-children-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const SortIcon = ({ col }: { col: keyof Child }) =>
    sortKey === col
      ? sortDir === 'asc'
        ? <ChevronUp size={14} className="text-gold" />
        : <ChevronDown size={14} className="text-gold" />
      : <ChevronUp size={14} className="text-gray-300" />;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Children Data</h1>
          <p className="text-gray-400 text-sm mt-1">
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}{' '}
            {hasActiveFilters && <span className="text-gold font-medium">(filtered)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm hover:bg-gray-200 hover:text-gray-800 transition-all border border-gray-200"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={openAddModal} className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add Child
          </button>
        </div>
      </div>

      {/* Add Child Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-serif font-bold text-gray-900">Add Child Record</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {addSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-green-700 text-sm">{addSuccess}</span>
              </div>
            )}
            {addError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm">{addError}</p>
              </div>
            )}

            <form onSubmit={handleAddChild} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="First name"
                    className="input-field w-full"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Parent */}
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={addForm.parentName}
                  onChange={(e) => setAddForm((f) => ({ ...f, parentName: e.target.value }))}
                  placeholder="Enter parent or guardian name"
                  className="input-field w-full"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Age</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={addForm.age}
                  onChange={(e) => setAddForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="e.g. 8"
                  className="input-field w-28"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-2">Gender</label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setAddForm((f) => ({ ...f, gender: g }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                        addForm.gender === g
                          ? 'bg-[#1a3070] text-white border-[#1a3070]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1a3070]/40'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Village */}
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Village / Area</label>
                <select
                  value={addForm.village}
                  onChange={(e) => setAddForm((f) => ({ ...f, village: e.target.value }))}
                  className="input-field w-full pr-8"
                >
                  <option value="">Select village / area</option>
                  {areas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {areas.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No areas found — add areas in the Areas section first.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
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
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Filter */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} className="text-gold" />
          <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Date Filter</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {DATE_CHIPS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setDateFilter(key); setPage(0); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                dateFilter === key
                  ? 'bg-gold text-black border-gold'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gold/40 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setPage(0); }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                className="text-gray-400 hover:text-gray-700 text-xs flex items-center gap-1"
              >
                <X size={12} /> Clear dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search + Column Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={15} className="text-gold" />
          <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Search &amp; Column Filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field w-full pl-9"
              placeholder="Search name, village, parent, employee..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>

          <select
            className="input-field pr-8 min-w-[160px]"
            value={employeeFilter}
            onChange={(e) => { setEmployeeFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Employees</option>
            {employees.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <select
            className="input-field pr-8"
            value={genderFilter}
            onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            className="input-field pr-8 min-w-[140px]"
            value={villageFilter}
            onChange={(e) => { setVillageFilter(e.target.value); setPage(0); }}
          >
            <option value="">All Villages</option>
            {villages.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input
              className="input-field w-20"
              type="number"
              placeholder="Age min"
              value={ageMin}
              onChange={(e) => { setAgeMin(e.target.value); setPage(0); }}
            />
            <span className="text-gray-300 text-sm">–</span>
            <input
              className="input-field w-20"
              type="number"
              placeholder="Age max"
              value={ageMax}
              onChange={(e) => { setAgeMax(e.target.value); setPage(0); }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {[
                  { key: 'firstName', label: 'Name' },
                  { key: 'parentName', label: 'Parent' },
                  { key: 'age', label: 'Age' },
                  { key: 'gender', label: 'Gender' },
                  { key: 'village', label: 'Village' },
                  { key: 'employeeName', label: 'Added By' },
                  { key: 'createdAt', label: 'Date' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-gold transition-colors select-none"
                    onClick={() => handleSort(col.key as keyof Child)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key as keyof Child} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin mx-auto" />
                    <p className="text-gray-400 text-sm mt-3">Loading data...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p className="text-red-500 font-medium text-sm">Failed to load data</p>
                    <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">{fetchError}</p>
                    <p className="text-gray-400 text-xs mt-2">Check Firestore security rules — the admin account may not have read permission on the <code className="bg-gray-100 px-1 rounded">children</code> collection.</p>
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <p className="text-gray-400 text-base">No records found</p>
                    {hasActiveFilters && (
                      <button onClick={clearAllFilters} className="text-gold text-sm mt-2 hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((child) => (
                  <tr key={child.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                          {child.firstName?.[0]}{child.lastName?.[0]}
                        </div>
                        <p className="text-gray-900 font-medium">{child.firstName} {child.lastName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{child.parentName}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{child.age}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        child.gender === 'Male'
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : child.gender === 'Female'
                          ? 'bg-pink-50 text-pink-600 border border-pink-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }`}>
                        {child.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{child.village}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700 text-xs font-medium">{child.employeeName}</span>
                      {child.employeePhone && (
                        <p className="text-gray-400 text-xs mt-0.5">{child.employeePhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {child.createdAt?.toDate ? format(child.createdAt.toDate(), 'dd MMM yy') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                    page === i ? 'bg-gold text-black font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
