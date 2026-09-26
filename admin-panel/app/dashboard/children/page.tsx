'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { db, auth } from '../../../lib/firebase';
import { applyStatsDelta, applyEmployeeEntryDelta } from '../../../lib/stats';
import {
  collection, onSnapshot, query, orderBy, where, limit, startAfter,
  getDocs, addDoc, updateDoc, doc, serverTimestamp, QueryDocumentSnapshot, DocumentData,
} from 'firebase/firestore';
import {
  Search, Download, ChevronUp, ChevronDown, X, Calendar, Filter, Plus, Loader2,
  CheckCircle, Trash2, RefreshCw, Layers,
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';

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
  employeePhone: string;
  createdAt: any;
  deleted?: boolean;
}

interface EmployeeOption { id: string; name: string; }

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const DATE_CHIPS: { key: DateFilter; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom Range' },
];

const GENDERS = ['Male', 'Female', 'Other'];
const PAGE_SIZE = 50;

const emptyForm = { firstName: '', lastName: '', parentName: '', age: '', gender: '', village: '' };

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pagesCacheRef = useRef<Record<number, Child[]>>({});
  const pageCursorsRef = useRef<Record<number, QueryDocumentSnapshot<DocumentData> | null>>({});

  const [searchAllResults, setSearchAllResults] = useState<Child[] | null>(null);
  const [searchAllLoading, setSearchAllLoading] = useState(false);

  // Add-child modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);

  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState(''); // stores employee uid
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Only one equality filter can be pushed server-side at a time (matches the
  // composite indexes we have: employeeId+createdAt, village+createdAt, gender+createdAt).
  // Priority: employee > village > gender. Any others still apply, just client-side
  // on whatever page is currently loaded.
  const activeServerFilterField: 'employee' | 'village' | 'gender' | null = employeeFilter
    ? 'employee'
    : villageFilter
    ? 'village'
    : genderFilter
    ? 'gender'
    : null;

  const buildConstraints = () => {
    const constraints: any[] = [];
    if (activeServerFilterField === 'employee') constraints.push(where('employeeId', '==', employeeFilter));
    else if (activeServerFilterField === 'village') constraints.push(where('village', '==', villageFilter));
    else if (activeServerFilterField === 'gender') constraints.push(where('gender', '==', genderFilter));

    const now = new Date();
    if (dateFilter === 'today') {
      constraints.push(where('createdAt', '>=', startOfDay(now)), where('createdAt', '<=', endOfDay(now)));
    } else if (dateFilter === 'week') {
      constraints.push(
        where('createdAt', '>=', startOfWeek(now, { weekStartsOn: 1 })),
        where('createdAt', '<=', endOfWeek(now, { weekStartsOn: 1 }))
      );
    } else if (dateFilter === 'month') {
      constraints.push(where('createdAt', '>=', startOfMonth(now)), where('createdAt', '<=', endOfMonth(now)));
    } else if (dateFilter === 'custom' && customFrom && customTo) {
      constraints.push(
        where('createdAt', '>=', startOfDay(parseISO(customFrom))),
        where('createdAt', '<=', endOfDay(parseISO(customTo)))
      );
    }
    constraints.push(orderBy('createdAt', sortDir));
    return constraints;
  };

  const fetchPage = async (targetIndex: number) => {
    const cached = pagesCacheRef.current[targetIndex];
    if (cached) {
      setChildren(cached);
      setPageIndex(targetIndex);
      setHasMore(cached.length === PAGE_SIZE);
      return;
    }
    setLoading(true);
    setFetchError('');
    try {
      const base = buildConstraints();
      const cursor = targetIndex > 0 ? pageCursorsRef.current[targetIndex - 1] : null;
      const qArgs = cursor ? [...base, startAfter(cursor), limit(PAGE_SIZE)] : [...base, limit(PAGE_SIZE)];
      const snap = await getDocs(query(collection(db, 'children'), ...qArgs));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
      pagesCacheRef.current[targetIndex] = rows;
      pageCursorsRef.current[targetIndex] = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      setChildren(rows);
      setPageIndex(targetIndex);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('children fetch error:', err);
      setFetchError(err.message || 'Failed to load data');
    }
    setLoading(false);
  };

  const resetAndLoad = () => {
    pagesCacheRef.current = {};
    pageCursorsRef.current = {};
    setSearchAllResults(null);
    fetchPage(0);
  };

  // Re-fetch page 1 whenever a server-side filter changes. Search text and age
  // range are applied client-side to whatever's already loaded, so they don't
  // trigger a re-fetch.
  useEffect(() => {
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeFilter, villageFilter, genderFilter, dateFilter, customFrom, customTo, sortDir]);

  useEffect(() => {
    const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setAreas(snap.docs.map((d) => d.data().name as string));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployeeOptions(snap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || 'Unknown' })));
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
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 14) { setAddError('Enter a valid age (up to 14 years)'); return; }
    if (!gender) { setAddError('Please select a gender'); return; }
    if (!village) { setAddError('Please select a village / area'); return; }
    setAddError('');
    setAddLoading(true);
    try {
      const adminUser = auth.currentUser;
      const ageNum = parseInt(age);
      await addDoc(collection(db, 'children'), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        parentName: parentName.trim(),
        age: ageNum,
        gender,
        village,
        employeeId: adminUser?.uid ?? 'admin',
        employeeName: adminUser?.email ?? 'Admin',
        employeePhone: adminUser?.email ?? '',
        createdAt: serverTimestamp(),
      });
      await applyStatsDelta(db, gender, ageNum, village, 1);
      setAddSuccess(`${firstName.trim()} ${lastName.trim()} added!`);
      setAddForm(emptyForm);
      setTimeout(() => { setAddSuccess(''); setShowAdd(false); resetAndLoad(); }, 2000);
    } catch (err: any) {
      setAddError(err.message || 'Failed to save. Check your connection.');
    }
    setAddLoading(false);
  };

  const handleSoftDelete = async (child: Child) => {
    const name = `${child.firstName} ${child.lastName}`;
    if (!confirm(`Move "${name}" to the recycle bin?`)) return;
    setDeletingId(child.id);
    try {
      await updateDoc(doc(db, 'children', child.id), { deleted: true, deletedAt: serverTimestamp() });
      await applyStatsDelta(db, child.gender, child.age, child.village, -1);
      await applyEmployeeEntryDelta(db, child.employeeId, -1);
      setChildren((prev) => prev.filter((c) => c.id !== child.id));
      if (pagesCacheRef.current[pageIndex]) {
        pagesCacheRef.current[pageIndex] = pagesCacheRef.current[pageIndex].filter((c) => c.id !== child.id);
      }
      setSearchAllResults((prev) => (prev ? prev.filter((c) => c.id !== child.id) : prev));
    } catch (err: any) {
      alert(
        `Could not delete "${name}": ${err.message || err.code || 'unknown error'}\n\n` +
        `This usually means Firestore security rules don't allow updating the "children" collection.`
      );
    }
    setDeletingId(null);
  };

  const handleSearchAll = async () => {
    setSearchAllLoading(true);
    try {
      const base = buildConstraints();
      const snap = await getDocs(query(collection(db, 'children'), ...base, limit(20000)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)).filter((c) => !c.deleted);
      setSearchAllResults(rows);
    } catch (err: any) {
      alert(`Could not load all matching records: ${err.message || 'unknown error'}`);
    }
    setSearchAllLoading(false);
  };

  const baseRows = searchAllResults ?? children;

  const rowsFiltered = useMemo(() => {
    let data = baseRows.filter((c) => !c.deleted);
    if (activeServerFilterField !== 'village' && villageFilter) data = data.filter((c) => c.village === villageFilter);
    if (activeServerFilterField !== 'gender' && genderFilter) data = data.filter((c) => c.gender === genderFilter);
    if (ageMin) data = data.filter((c) => c.age >= parseInt(ageMin));
    if (ageMax) data = data.filter((c) => c.age <= parseInt(ageMax));
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
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRows, villageFilter, genderFilter, ageMin, ageMax, search, activeServerFilterField]);

  const clearAllFilters = () => {
    setSearch(''); setGenderFilter(''); setVillageFilter(''); setEmployeeFilter('');
    setAgeMin(''); setAgeMax(''); setDateFilter('all'); setCustomFrom(''); setCustomTo('');
  };

  const hasActiveFilters = !!(search || genderFilter || villageFilter || employeeFilter || ageMin || ageMax || dateFilter !== 'all');

  // Human-readable list of the filters currently applied, for the export header
  const describeFilters = (): [string, string][] => {
    const out: [string, string][] = [];
    if (dateFilter === 'custom' && customFrom && customTo) {
      out.push(['Date', `${format(parseISO(customFrom), 'dd MMM yyyy')} – ${format(parseISO(customTo), 'dd MMM yyyy')}`]);
    } else if (dateFilter !== 'all') {
      out.push(['Date', DATE_CHIPS.find((d) => d.key === dateFilter)?.label || dateFilter]);
    }
    if (employeeFilter) out.push(['Employee', employeeOptions.find((e) => e.id === employeeFilter)?.name || employeeFilter]);
    if (villageFilter) out.push(['Village', villageFilter]);
    if (genderFilter) out.push(['Gender', genderFilter]);
    if (ageMin && ageMax) out.push(['Age', `${ageMin} – ${ageMax} years`]);
    else if (ageMin) out.push(['Age', `${ageMin} years and above`]);
    else if (ageMax) out.push(['Age', `Up to ${ageMax} years`]);
    if (search) out.push(['Search', `"${search}"`]);
    return out;
  };

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Children Data', { views: [{ showGridLines: false }] });

    const columns = [
      { header: 'S.No', width: 7 },
      { header: 'First Name', width: 18 },
      { header: 'Last Name', width: 18 },
      { header: 'Parent Name', width: 22 },
      { header: 'Age', width: 7 },
      { header: 'Gender', width: 10 },
      { header: 'Village', width: 22 },
      { header: 'Added By', width: 22 },
      { header: 'Employee Phone', width: 18 },
      { header: 'Date', width: 14 },
    ];
    ws.columns = columns.map((c) => ({ width: c.width }));
    const lastCol = String.fromCharCode(64 + columns.length);
    const navy = 'FF0B1C3D';
    const gold = 'FFD4AF37';

    // Title block
    ws.mergeCells(`A1:${lastCol}1`);
    const title = ws.getCell('A1');
    title.value = 'SOWERS MINISTRY';
    title.font = { name: 'Georgia', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;

    ws.mergeCells(`A2:${lastCol}2`);
    const subtitle = ws.getCell('A2');
    subtitle.value = `Christmas Joy Programme ${new Date().getFullYear()} — Children Data Report`;
    subtitle.font = { size: 12, bold: true, color: { argb: gold } };
    subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    subtitle.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;

    // Report details: generated time, filters, total
    const filters = describeFilters();
    const details: [string, string][] = [
      ['Generated On', format(new Date(), 'dd MMM yyyy, hh:mm a')],
      ...(filters.length ? filters : [['Filters', 'None — all records'] as [string, string]]),
      ['Total Records', String(rowsFiltered.length)],
    ];
    let r = 4;
    details.forEach(([label, value]) => {
      ws.getCell(`A${r}`).value = label;
      ws.mergeCells(`A${r}:B${r}`);
      ws.getCell(`A${r}`).font = { bold: true, color: { argb: 'FF555555' } };
      ws.mergeCells(`C${r}:${lastCol}${r}`);
      ws.getCell(`C${r}`).value = value;
      ws.getCell(`C${r}`).font = { bold: label !== 'Generated On', color: { argb: navy } };
      r++;
    });

    // Table header
    const headerRowNum = r + 1;
    const headerRow = ws.getRow(headerRowNum);
    headerRow.values = columns.map((c) => c.header);
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: gold } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Data rows
    rowsFiltered.forEach((c, i) => {
      const row = ws.addRow([
        i + 1,
        c.firstName,
        c.lastName,
        c.parentName,
        c.age,
        c.gender,
        c.village,
        c.employeeName,
        c.employeePhone,
        c.createdAt?.toDate ? format(c.createdAt.toDate(), 'dd MMM yyyy') : '',
      ]);
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
        if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F2' } };
        if (col === 1 || col === 5) cell.alignment = { horizontal: 'center' };
      });
    });

    // Keep the header visible while scrolling, and allow Excel filtering on it
    ws.views = [{ state: 'frozen', ySplit: headerRowNum, showGridLines: false }];
    ws.autoFilter = { from: { row: headerRowNum, column: 1 }, to: { row: headerRowNum, column: columns.length } };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sowers-children-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = () =>
    sortDir === 'asc'
      ? <ChevronUp size={14} className="text-gold" />
      : <ChevronDown size={14} className="text-gold" />;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Children Data</h1>
          <p className="text-gray-400 text-sm mt-1">
            {searchAllResults
              ? <>{rowsFiltered.length} matching record{rowsFiltered.length !== 1 ? 's' : ''} loaded</>
              : <>Page {pageIndex + 1} · {rowsFiltered.length} shown</>}
            {' '}{hasActiveFilters && <span className="text-gold font-medium">(filtered)</span>}
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
          <button
            onClick={resetAndLoad}
            title="Refresh"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-all border border-gray-200"
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <Download size={16} />
            Export Excel
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
                  max={14}
                  value={addForm.age}
                  onChange={(e) => setAddForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="e.g. 8"
                  className="input-field w-28"
                />
                <p className="text-xs text-gray-400 mt-1">Up to 14 years</p>
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
              onClick={() => setDateFilter(key)}
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
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
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
              placeholder={searchAllResults ? 'Search loaded records...' : 'Search this page — or load all to search everything'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input-field pr-8 min-w-[160px]"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
          >
            <option value="">All Employees</option>
            {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select
            className="input-field pr-8"
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            className="input-field pr-8 min-w-[140px]"
            value={villageFilter}
            onChange={(e) => setVillageFilter(e.target.value)}
          >
            <option value="">All Villages</option>
            {areas.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>

          <div className="flex items-center gap-2">
            <input
              className="input-field w-20"
              type="number"
              min={0}
              max={14}
              placeholder="Age min"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
            />
            <span className="text-gray-300 text-sm">–</span>
            <input
              className="input-field w-20"
              type="number"
              min={0}
              max={14}
              placeholder="Age max"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {searchAllResults
              ? 'Searching every record matching your Date/Employee/Village/Gender filters.'
              : 'Search and export only cover the currently loaded page — click "Load All Matching" to search or export everything.'}
          </p>
          {searchAllResults ? (
            <button
              onClick={() => setSearchAllResults(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <X size={12} /> Back to Paged View
            </button>
          ) : (
            <button
              onClick={handleSearchAll}
              disabled={searchAllLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/25 text-gold text-xs font-medium hover:bg-gold/20 transition-colors flex-shrink-0 disabled:opacity-50"
            >
              {searchAllLoading ? <Loader2 size={12} className="animate-spin" /> : <Layers size={12} />}
              Load All Matching
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Parent</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Age</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Gender</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Village</th>
                <th className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">Added By</th>
                <th
                  className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider cursor-pointer hover:text-gold transition-colors select-none"
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <SortIcon />
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-gray-500 font-semibold text-xs uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin mx-auto" />
                    <p className="text-gray-400 text-sm mt-3">Loading data...</p>
                  </td>
                </tr>
              ) : fetchError ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-red-500 font-medium text-sm">Failed to load data</p>
                    <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">{fetchError}</p>
                    <p className="text-gray-400 text-xs mt-2">
                      If this mentions a missing index, click the link in the error to create it, or check Firestore security rules.
                    </p>
                  </td>
                </tr>
              ) : rowsFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <p className="text-gray-400 text-base">No records found</p>
                    {hasActiveFilters && (
                      <button onClick={clearAllFilters} className="text-gold text-sm mt-2 hover:underline">
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rowsFiltered.map((child) => (
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSoftDelete(child)}
                        disabled={deletingId === child.id}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Move to recycle bin"
                      >
                        {deletingId === child.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!searchAllResults && !loading && !fetchError && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs">Page {pageIndex + 1}</p>
            <div className="flex gap-2">
              <button
                disabled={pageIndex === 0}
                onClick={() => fetchPage(pageIndex - 1)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm disabled:opacity-30 hover:bg-gray-200 transition-colors"
              >
                ← Prev
              </button>
              <button
                disabled={!hasMore}
                onClick={() => fetchPage(pageIndex + 1)}
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
