'use client';
// app/dashboard/volunteers/page.tsx
import { useEffect, useMemo, useState } from 'react';
import { auth } from '../../../lib/firebase';
import { format } from 'date-fns';
import {
  HeartHandshake, Plus, Pencil, Trash2, Loader2, X, CheckCircle, Search, Download, Phone,
} from 'lucide-react';
import { DESIGNATIONS, VOLUNTEER_GENDERS, type Volunteer } from '../../../lib/volunteers';

const emptyForm = { name: '', gender: '', phone: '', designations: [] as string[] };

async function api(path: string, method = 'GET', body?: unknown) {
  const idToken = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method,
    headers: { Authorization: `Bearer ${idToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Volunteer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const load = async () => {
    setLoadError('');
    try {
      const data = await api('/api/volunteers');
      setVolunteers(data.volunteers);
    } catch (err: any) {
      setLoadError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Wait for Firebase auth to be ready so the request carries the admin's token
    const unsub = auth.onAuthStateChanged((u) => { if (u) load(); });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditing(null); setForm(emptyForm); setFormError(''); setFormSuccess(''); setShowForm(true);
  };
  const openEdit = (v: Volunteer) => {
    setEditing(v);
    setForm({ name: v.name, gender: v.gender, phone: v.phone, designations: [...v.designations] });
    setFormError(''); setFormSuccess(''); setShowForm(true);
  };

  const toggleDesignation = (d: string) =>
    setForm((f) => ({
      ...f,
      designations: f.designations.includes(d) ? f.designations.filter((x) => x !== d) : [...f.designations, d],
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = form.phone.replace(/\D/g, '');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.gender) { setFormError('Please select a gender'); return; }
    if (!/^[6-9]\d{9}$/.test(phone)) { setFormError('Enter a valid 10-digit mobile number'); return; }
    if (form.designations.length === 0) { setFormError('Select at least one designation'); return; }
    setFormError('');
    setSaving(true);
    try {
      const body = { ...form, phone };
      if (editing) await api(`/api/volunteers/${editing.id}`, 'PATCH', body);
      else await api('/api/volunteers', 'POST', body);
      await load();
      if (editing) {
        setShowForm(false);
      } else {
        // Keep the form open for quickly adding the next volunteer
        setFormSuccess(`${form.name.trim()} added as a volunteer`);
        setForm(emptyForm);
      }
    } catch (err: any) {
      setFormError(err.message);
    }
    setSaving(false);
  };

  const handleRemove = async (v: Volunteer) => {
    if (!confirm(`Remove volunteer "${v.name}"? This cannot be undone.`)) return;
    setRemovingId(v.id);
    try {
      await api(`/api/volunteers/${v.id}`, 'DELETE');
      setVolunteers((prev) => prev.filter((x) => x.id !== v.id));
    } catch (err: any) {
      alert(`Could not remove "${v.name}": ${err.message}`);
    }
    setRemovingId(null);
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return volunteers
      .filter((v) => !designationFilter || v.designations.includes(designationFilter))
      .filter((v) => !genderFilter || v.gender === genderFilter)
      .filter((v) => !s || v.name.toLowerCase().includes(s) || v.phone.includes(s.replace(/\D/g, '') || s));
  }, [volunteers, search, designationFilter, genderFilter]);

  const countFor = (d: string) => volunteers.filter((v) => v.designations.includes(d)).length;

  const exportExcel = async () => {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Volunteers', { views: [{ showGridLines: false }] });
    const navy = 'FF0B1C3D';
    const gold = 'FFD4AF37';
    const cols = [
      { header: 'S.No', width: 7 },
      { header: 'Name', width: 28 },
      { header: 'Gender', width: 10 },
      { header: 'Mobile', width: 16 },
      { header: 'Designation', width: 44 },
    ];
    ws.columns = cols.map((c) => ({ width: c.width }));

    ws.mergeCells('A1:E1');
    ws.getCell('A1').value = 'SOWERS MINISTRY';
    ws.getCell('A1').font = { name: 'Georgia', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;
    ws.mergeCells('A2:E2');
    ws.getCell('A2').value = `Christmas Joy Programme ${new Date().getFullYear()} — Volunteers${designationFilter ? ` · ${designationFilter}` : ''}`;
    ws.getCell('A2').font = { size: 12, bold: true, color: { argb: gold } };
    ws.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    ws.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 22;
    ws.getCell('A3').value = `Generated ${format(new Date(), 'dd MMM yyyy, hh:mm a')} · ${filtered.length} volunteers`;
    ws.getCell('A3').font = { italic: true, color: { argb: 'FF555555' } };

    const header = ws.getRow(5);
    header.values = cols.map((c) => c.header);
    header.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: gold } };
      cell.alignment = { horizontal: 'center' };
    });
    filtered.forEach((v, i) => {
      ws.addRow([i + 1, v.name, v.gender, v.phone, v.designations.join(', ')]);
    });
    ws.views = [{ state: 'frozen', ySplit: 5, showGridLines: false }];
    ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: cols.length } };

    const blob = new Blob([await wb.xlsx.writeBuffer()], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sowers-volunteers-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Volunteers</h1>
          <p className="text-gray-400 text-sm mt-1">
            {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportExcel}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-all border border-gray-200 disabled:opacity-40"
          >
            <Download size={16} />
            Export Excel
          </button>
          <button onClick={openAdd} className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm">
            <Plus size={16} />
            Add Volunteer
          </button>
        </div>
      </div>

      {/* Designation counts (click to filter) */}
      <div className="flex flex-wrap gap-2">
        {DESIGNATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDesignationFilter((cur) => (cur === d ? '' : d))}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              designationFilter === d
                ? 'bg-gold text-black border-gold'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gold/40'
            }`}
          >
            {d} <span className={designationFilter === d ? 'font-semibold' : 'text-gold font-semibold'}>{countFor(d)}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field w-full pl-9"
            placeholder="Search name or mobile number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field pr-8 min-w-[170px]" value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)}>
          <option value="">All Designations</option>
          {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-field pr-8" value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
          <option value="">All Genders</option>
          {VOLUNTEER_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {(search || designationFilter || genderFilter) && (
          <button
            onClick={() => { setSearch(''); setDesignationFilter(''); setGenderFilter(''); }}
            className="text-gray-400 hover:text-gray-700 text-sm flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-serif font-bold text-gray-900">{editing ? 'Edit Volunteer' : 'Add Volunteer'}</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {formSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-green-700 text-sm">{formSuccess}</span>
              </div>
            )}
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-600 text-sm">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className="input-field w-full"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-2">Gender</label>
                <div className="flex gap-2">
                  {VOLUNTEER_GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gender: g }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                        form.gender === g
                          ? 'bg-[#1a3070] text-white border-[#1a3070]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#1a3070]/40'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">Mobile Number</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="10-digit mobile number"
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gold text-xs font-semibold uppercase tracking-wider mb-2">
                  Designation <span className="text-gray-400 normal-case tracking-normal font-normal">(select one or more)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DESIGNATIONS.map((d, i) => {
                    const on = form.designations.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDesignation(d)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-left transition-all ${
                          on
                            ? 'bg-gold/15 text-gray-900 border-gold font-medium'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gold/40'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] flex-shrink-0 ${
                          on ? 'bg-gold text-black' : 'bg-white border border-gray-300 text-gray-400'
                        }`}>
                          {on ? '✓' : i + 1}
                        </span>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors text-sm"
                >
                  {formSuccess && !editing ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="gold-btn flex-1 py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : editing ? <Pencil size={16} /> : <Plus size={16} />}
                  {editing ? 'Save Changes' : 'Save Volunteer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['#', 'Name', 'Gender', 'Mobile', 'Designation', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-16"><Loader2 size={28} className="animate-spin text-gold mx-auto" /></td></tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <p className="text-red-500 font-medium text-sm">Could not load volunteers</p>
                    <p className="text-gray-400 text-xs mt-1">{loadError}</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <HeartHandshake size={40} className="text-gray-200 mx-auto" />
                    <p className="text-gray-400 mt-2">{volunteers.length === 0 ? 'No volunteers yet — click "Add Volunteer"' : 'No volunteers match these filters'}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((v, i) => (
                  <tr key={v.id} className="table-row">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{v.name}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${v.gender === 'Male' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-pink-50 text-pink-600 border border-pink-200'}`}>
                        {v.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:+91${v.phone}`} className="text-gray-700 hover:text-gold inline-flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        {v.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.designations.map((d) => (
                          <span key={d} className="badge bg-gold/10 text-gray-800 border border-gold/25 text-xs">{d}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(v)} className="text-gray-300 hover:text-gold transition-colors mr-3" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleRemove(v)}
                        disabled={removingId === v.id}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Remove volunteer"
                      >
                        {removingId === v.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
