'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '../../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Search, Download, ChevronUp, ChevronDown, X, Calendar, Filter } from 'lucide-react';
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

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

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
    const unsub = onSnapshot(q, (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

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
          <button onClick={exportCSV} className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

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
