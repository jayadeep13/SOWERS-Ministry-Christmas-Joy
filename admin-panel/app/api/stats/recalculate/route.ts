// app/api/stats/recalculate/route.ts
//
// One-time full scan (admin-triggered only) that rebuilds stats/summary from
// scratch. Used to seed real numbers from existing data, and as a drift-repair
// safety net if the incrementally-maintained counters (see lib/stats.ts in
// both apps) ever get out of sync.
import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';
import { verifyAdmin } from '../../../../lib/verifyAdmin';

const AGE_BUCKETS = [
  { label: '0-2', min: 0, max: 2 },
  { label: '3-5', min: 3, max: 5 },
  { label: '6-8', min: 6, max: 8 },
  { label: '9-11', min: 9, max: 11 },
  { label: '12-14', min: 12, max: 14 },
];

function ageBucketLabel(age: number): string {
  const bucket = AGE_BUCKETS.find((b) => age >= b.min && age <= b.max);
  return bucket ? bucket.label : '12-14';
}

function sanitizeKey(key: string): string {
  return (key || 'Unknown').replace(/[.[\]]/g, '_');
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection('children').get();

    let totalChildren = 0;
    let maleCount = 0;
    let femaleCount = 0;
    let otherCount = 0;
    const ageGroups: Record<string, number> = {};
    const villageCounts: Record<string, number> = {};

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.deleted) return;

      totalChildren += 1;
      if (data.gender === 'Male') maleCount += 1;
      else if (data.gender === 'Female') femaleCount += 1;
      else otherCount += 1;

      const bucket = ageBucketLabel(Number(data.age) || 0);
      ageGroups[bucket] = (ageGroups[bucket] || 0) + 1;

      const villageKey = sanitizeKey(data.village);
      villageCounts[villageKey] = (villageCounts[villageKey] || 0) + 1;
    });

    await db.collection('stats').doc('summary').set({
      totalChildren, maleCount, femaleCount, otherCount, ageGroups, villageCounts,
    });

    return NextResponse.json({ totalChildren, maleCount, femaleCount, otherCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to recalculate stats' }, { status: 500 });
  }
}
