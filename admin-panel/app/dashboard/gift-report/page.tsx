'use client';
// app/dashboard/gift-report/page.tsx
// Shareable gift-delivery report: counts only, no children's names (they're minors).
import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import { onSnapshot, collection } from 'firebase/firestore';
import { format } from 'date-fns';
import { Gift, Printer, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { giftSummary, type GiftChild } from '../../../lib/gifts';

export default function GiftReportPage() {
  const [children, setChildren] = useState<GiftChild[] | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'children'), (snap) => {
      setChildren(snap.docs.map((d) => d.data() as GiftChild));
    });
    return () => unsub();
  }, []);

  if (!children) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    );
  }

  const s = giftSummary(children);
  const villagesDone = s.villages.filter((v) => v.pending === 0).length;
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6 gift-report">
      {/* Print: show only the report, on a white page */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body * { visibility: hidden; }
          .gift-report, .gift-report * { visibility: visible; }
          .gift-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .glass-card { box-shadow: none !important; break-inside: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-start justify-between no-print">
        <div>
          <h1 className="font-serif text-3xl text-gray-900">Gift Delivery Report</h1>
          <p className="text-gray-400 text-sm mt-1">
            Live · updates as gifts are marked delivered in Children Data. Shows counts only, no names.
          </p>
        </div>
        <button onClick={() => window.print()} className="gold-btn px-4 py-2.5 flex items-center gap-2 text-sm">
          <Printer size={16} />
          Print / Save as PDF
        </button>
      </div>

      {/* Report header */}
      <div className="glass-card p-8 text-center bg-gradient-to-b from-[#0B1C3D] to-[#1a3070] text-white">
        <img src="/logo.webp" alt="Sowers Ministry" className="w-16 h-16 mx-auto rounded-full bg-white object-contain p-1" />
        <p className="mt-3 font-serif text-2xl tracking-wider">SOWERS MINISTRY</p>
        <p className="text-gold text-sm tracking-widest uppercase mt-1">Christmas Joy Programme {year}</p>
        <p className="text-white/70 text-sm mt-1">Gift Delivery Report · {format(new Date(), 'dd MMM yyyy')}</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Gift className="w-10 h-10 text-gold" />
          <p className="font-serif text-6xl font-bold">{s.delivered}</p>
        </div>
        <p className="text-white/80 mt-1">
          gifts delivered to children, out of <span className="font-semibold text-white">{s.total}</span> registered
        </p>

        <div className="max-w-xl mx-auto mt-5">
          <div className="h-4 bg-white/15 rounded-full overflow-hidden">
            <div className="h-4 rounded-full bg-gold" style={{ width: `${s.percent}%` }} />
          </div>
          <p className="text-gold font-semibold mt-2">{s.percent}% complete</p>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Figure label="Gifts delivered" value={s.delivered} tone="text-green-600" />
        <Figure label="Boys reached" value={s.boysDelivered} tone="text-blue-600" />
        <Figure label="Girls reached" value={s.girlsDelivered} tone="text-pink-600" />
        <Figure label="Villages completed" value={villagesDone} suffix={` / ${s.villages.length}`} tone="text-gold" />
      </div>

      {/* Village-wise */}
      <div className="glass-card p-6">
        <h2 className="font-serif text-xl text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-gold" />
          Village-wise Delivery
        </h2>
        <div className="space-y-3">
          {s.villages.map((v) => {
            const pct = v.total ? Math.round((v.delivered / v.total) * 100) : 0;
            const done = v.pending === 0;
            return (
              <div key={v.village} className="flex items-center gap-4">
                <p className="w-48 sm:w-64 text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
                  {done && <CheckCircle size={14} className="text-green-600 flex-shrink-0" />}
                  {v.village}
                </p>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${done ? 'bg-green-500' : 'bg-gold'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="w-36 text-right text-sm text-gray-600 whitespace-nowrap">
                  <span className="font-semibold text-gray-900">{v.delivered}</span> of {v.total} · {pct}%
                </p>
              </div>
            );
          })}
          {s.villages.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-6">No children registered yet</p>
          )}
        </div>
      </div>

      <p className="text-center text-gray-400 text-xs">
        Thank you to every volunteer and supporter who made this Christmas joyful for these children.
      </p>
    </div>
  );
}

function Figure({ label, value, tone, suffix }: { label: string; value: number; tone: string; suffix?: string }) {
  return (
    <div className="glass-card p-5 text-center">
      <p className={`font-serif text-3xl font-bold ${tone}`}>
        {value}
        {suffix && <span className="text-gray-400 text-lg font-sans">{suffix}</span>}
      </p>
      <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mt-1">{label}</p>
    </div>
  );
}
