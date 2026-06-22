'use client';
// app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Users, Baby, Building2, UserCheck } from 'lucide-react';

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  village: string;
  employeeId: string;
  employeeName: string;
  createdAt: any;
}

const AGE_GROUPS = [
  { label: '0–4', min: 0, max: 4 },
  { label: '5–8', min: 5, max: 8 },
  { label: '9–12', min: 9, max: 12 },
  { label: '13–15', min: 13, max: 15 },
  { label: '16–18', min: 16, max: 18 },
];

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'children'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setChildren(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Child)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const males = children.filter((c) => c.gender === 'Male').length;
  const females = children.filter((c) => c.gender === 'Female').length;

  const ageData = AGE_GROUPS.map((g) => ({
    label: g.label,
    count: children.filter((c) => c.age >= g.min && c.age <= g.max).length,
  }));

  const genderData = [
    { name: 'Male', value: males },
    { name: 'Female', value: females },
  ];

  const villageData = Object.entries(
    children.reduce((acc: any, c) => {
      acc[c.village] = (acc[c.village] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 7)
    .map(([village, count]) => ({ village, count }));

  const employeeData = Object.entries(
    children.reduce((acc: any, c) => {
      acc[c.employeeName] = (acc[c.employeeName] || 0) + 1;
      return acc;
    }, {})
  )
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-md">
          <p className="text-gold font-semibold">{label}</p>
          <p className="text-gray-600">{payload[0].value} children</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-serif text-3xl text-gray-900">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Christmas Joy Programme · Live Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-gold" />}
          label="Total Children"
          value={children.length}
          sub="All registrations"
          accent
        />
        <StatCard
          icon={<Baby className="w-6 h-6 text-blue-500" />}
          label="Male"
          value={males}
          sub={`${children.length ? Math.round((males / children.length) * 100) : 0}% of total`}
        />
        <StatCard
          icon={<Baby className="w-6 h-6 text-pink-500" />}
          label="Female"
          value={females}
          sub={`${children.length ? Math.round((females / children.length) * 100) : 0}% of total`}
        />
        <StatCard
          icon={<Building2 className="w-6 h-6 text-emerald-500" />}
          label="Villages"
          value={new Set(children.map((c) => c.village)).size}
          sub="Unique villages"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Distribution */}
        <div className="glass-card p-6">
          <h2 className="font-serif text-xl text-gray-900 mb-4">Age Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" stroke="#9CA3AF" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender Split */}
        <div className="glass-card p-6">
          <h2 className="font-serif text-xl text-gray-900 mb-4">Gender Split</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? '#60A5FA' : '#F9A8D4'} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span className="text-gray-600 text-sm">{value}</span>}
                />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-2">
            <div className="text-center">
              <p className="font-serif text-2xl text-blue-500 font-bold">{males}</p>
              <p className="text-gray-400 text-xs">Male</p>
            </div>
            <div className="text-center">
              <p className="font-serif text-2xl text-pink-500 font-bold">{females}</p>
              <p className="text-gray-400 text-xs">Female</p>
            </div>
          </div>
        </div>
      </div>

      {/* Village Chart + Top Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Village breakdown */}
        <div className="glass-card p-6 col-span-2">
          <h2 className="font-serif text-xl text-gray-900 mb-4">Top Villages</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={villageData} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
              <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis type="category" dataKey="village" stroke="#9CA3AF" tick={{ fontSize: 11, fill: '#6B7280' }} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {villageData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#D4AF37' : '#1E3A8A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Employees */}
        <div className="glass-card p-6">
          <h2 className="font-serif text-xl text-gray-900 mb-4 flex items-center gap-2">
            <UserCheck size={18} className="text-gold" />
            Top Employees
          </h2>
          <div className="space-y-3">
            {employeeData.map((emp, i) => (
              <div key={emp.name} className="flex items-center gap-3">
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
              <p className="text-gray-400 text-sm text-center py-6">No data yet</p>
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
