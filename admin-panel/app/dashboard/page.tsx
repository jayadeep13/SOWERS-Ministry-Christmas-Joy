'use client';
// app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { db, auth } from '../../lib/firebase';
import { onSnapshot, collection, query } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, Baby, Building2, UserCheck, RefreshCw, Loader2, Gift } from 'lucide-react';
import Link from 'next/link';
import { giftSummary } from '../../lib/gifts';

interface ChildRow {
  id: string;
  age?: number | string;
  gender?: string;
  village?: string;
  employeeId?: string;
  deleted?: boolean;
  giftReceived?: boolean;
}

interface Employee {
  id: string;
  name: string;
  totalEntries: number;
}

// Ages 1–14, one bar per year (the apps only accept ages in this range)
const AGES = Array.from({ length: 14 }, (_, i) => i + 1);

export default function DashboardPage() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recalculating, setRecalculating] = useState(false);

  // Count straight from Children Data (live) rather than the stats/summary
  // counters — those drift whenever an app build doesn't update them. Read-only.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'children'), (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChildRow)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snap) => {
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee)));
    });
    return () => unsub();
  }, []);

  const active = children.filter((c) => !c.deleted);
  const totalChildren = active.length;
  const males = active.filter((c) => c.gender === 'Male').length;
  const females = active.filter((c) => c.gender === 'Female').length;

  const villageCounts: Record<string, number> = {};
  const entriesByEmployee: Record<string, number> = {};
  active.forEach((c) => {
    const village = (c.village || '').trim() || 'Unknown';
    villageCounts[village] = (villageCounts[village] || 0) + 1;
    if (c.employeeId) entriesByEmployee[c.employeeId] = (entriesByEmployee[c.employeeId] || 0) + 1;
  });

  const ageBreakdown = (gender: string) =>
    AGES.map((age) => ({
      label: String(age),
      count: active.filter((c) => c.gender === gender && Number(c.age) === age).length,
    }));
  const boysByAge = ageBreakdown('Male');
  const girlsByAge = ageBreakdown('Female');

  const gifts = giftSummary(children);
  // Highest total first; each bar is split into delivered + pending
  const villageData = gifts.villages;

  const employeeData = employees
    .map((e) => ({ id: e.id, name: e.name || 'Unknown', count: entriesByEmployee[e.id] || 0 }))
    .sort((a, b) => b.count - a.count);

  const handleRecalculate = async () => {
    if (!confirm('Recalculate dashboard stats and employee entry counts from every record in Children Data? This does one full scan and rebuilds the counters.')) return;
    setRecalculating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/stats/recalculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to recalculate');
    } catch (err: any) {
      alert(`Could not recalculate stats: ${err.message || 'unknown error'}`);
    }
    setRecalculating(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Christmas Joy Programme · Live Overview</p>
        </div>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          title="Rebuild these stats from a full scan of Children Data — use if numbers ever look off"
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 hover:text-gray-800 transition-all border border-gray-200 disabled:opacity-50"
        >
          {recalculating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Recalculate Stats
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-gold" />}
          label="Total Children"
          value={totalChildren}
          sub="All registrations"
          accent
        />
        <StatCard
          icon={<Baby className="w-6 h-6 text-blue-500" />}
          label="Boys"
          value={males}
          sub={`${totalChildren ? Math.round((males / totalChildren) * 100) : 0}% of total`}
        />
        <StatCard
          icon={<Baby className="w-6 h-6 text-pink-500" />}
          label="Girls"
          value={females}
          sub={`${totalChildren ? Math.round((females / totalChildren) * 100) : 0}% of total`}
        />
        <StatCard
          icon={<Building2 className="w-6 h-6 text-emerald-500" />}
          label="Villages"
          value={Object.keys(villageCounts).length}
          sub="Unique villages"
        />
      </div>

      {/* Gift delivery progress */}
      <Link
        href="/dashboard/gift-report"
        className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md hover:border-green-200 transition-all"
      >
        <div className="flex items-center gap-3 sm:w-64 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Gifts Delivered</p>
            <p className="font-serif text-2xl font-bold text-gray-900">
              {gifts.delivered} <span className="text-gray-400 text-base font-sans">/ {gifts.total}</span>
            </p>
          </div>
        </div>
        <div className="flex-1">
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${gifts.percent}%` }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-green-700 font-semibold">{gifts.percent}% delivered</span>
            <span className="text-amber-700">{gifts.pending} pending · View report →</span>
          </div>
        </div>
      </Link>

      {/* Age-wise breakdown: Boys | Girls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { title: 'Boys by Age', total: males, data: boysByAge, color: '#3B82F6', noun: 'boys' },
          { title: 'Girls by Age', total: females, data: girlsByAge, color: '#EC4899', noun: 'girls' },
        ].map((chart) => (
          <div key={chart.title} className="glass-card p-6">
            <h2 className="font-serif text-xl text-gray-900 mb-4">
              {chart.title} <span className="text-gray-400 text-sm font-sans">({chart.total})</span>
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chart.data} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  stroke="#9CA3AF"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  label={{ value: 'Age (years)', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#9CA3AF' }}
                  height={36}
                />
                <YAxis allowDecimals={false} stroke="#9CA3AF" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload, label }: any) =>
                    active && payload?.length ? (
                      <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-md">
                        <p className="text-gold font-semibold">Age {label}</p>
                        <p className="text-gray-600">{payload[0].value} {chart.noun}</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="count" fill={chart.color} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Village Chart + Employees (all, highest first) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Village breakdown */}
        <div className="glass-card p-6 col-span-2">
          <h2 className="font-serif text-xl text-gray-900 mb-4">
            All Villages <span className="text-gray-400 text-sm font-sans">({villageData.length})</span>
          </h2>
          <div className="max-h-[480px] overflow-y-auto pr-1">
          <ResponsiveContainer width="100%" height={Math.max(220, villageData.length * 36)}>
            <BarChart data={villageData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis type="category" dataKey="village" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} width={90} />
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload, label }: any) =>
                  active && payload?.length ? (
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-md">
                      <p className="text-gold font-semibold">{label}</p>
                      <p className="text-gray-600">{payload[0].payload.total} children</p>
                      <p className="text-green-700">{payload[0].payload.delivered} gifts delivered</p>
                      <p className="text-amber-700">{payload[0].payload.pending} pending</p>
                    </div>
                  ) : null
                }
              />
              <Legend formatter={(value) => <span className="text-gray-600 text-xs">{value}</span>} />
              <Bar dataKey="delivered" name="Gift delivered" stackId="v" fill="#22C55E" />
              <Bar dataKey="pending" name="Pending" stackId="v" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* All Employees */}
        <div className="glass-card p-6">
          <h2 className="font-serif text-xl text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck size={18} className="text-gold" />
            All Employees <span className="text-gray-400 text-sm font-sans">({employeeData.length})</span>
          </h2>
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {employeeData.map((emp, i) => (
              <div key={emp.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-gold text-black' : 'bg-gray-100 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{emp.name}</p>
                  <div className="mt-1 h-1 bg-gray-100 rounded-full">
                    <div
                      className="h-1 rounded-full"
                      style={{
                        width: `${Math.min((emp.count as number / (employeeData[0]?.count as number || 1)) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #D4AF37, #B8960C)',
                      }}
                    />
                  </div>
                </div>
                <span className="text-gold font-semibold text-sm">{emp.count as number}</span>
              </div>
            ))}
            {employeeData.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No employees yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`glass-card p-5 relative overflow-hidden ${accent ? 'border-gold/30 border' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          accent ? 'bg-gold/10 border border-gold/20' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        {accent && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl pointer-events-none" />
        )}
      </div>
      <p className={`font-serif text-3xl font-bold ${accent ? 'text-gold' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-gray-700 text-sm mt-0.5 font-medium">{label}</p>
      <p className="text-gray-400 text-xs mt-1">{sub}</p>
    </div>
  );
}
