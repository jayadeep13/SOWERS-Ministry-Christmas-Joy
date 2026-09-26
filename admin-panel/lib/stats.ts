// lib/stats.ts
// Keeps the dashboard's aggregate counters (stats/summary) in sync at write time,
// so the Dashboard never has to scan the whole `children` collection to show
// age/gender/village breakdowns. Bucket labels here MUST match the Dashboard's
// AGE_GROUPS exactly.
import { doc, increment, setDoc, updateDoc } from 'firebase/firestore';

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

function statsDelta(gender: string, age: number, village: string, delta: 1 | -1) {
  const genderField = gender === 'Male' ? 'maleCount' : gender === 'Female' ? 'femaleCount' : 'otherCount';
  return {
    totalChildren: increment(delta),
    [genderField]: increment(delta),
    [`ageGroups.${ageBucketLabel(age)}`]: increment(delta),
    [`villageCounts.${sanitizeKey(village)}`]: increment(delta),
  };
}

export async function applyStatsDelta(
  db: any,
  gender: string,
  age: number,
  village: string,
  delta: 1 | -1
) {
  await setDoc(doc(db, 'stats', 'summary'), statsDelta(gender, age, village, delta), { merge: true });
}

// Keeps an employee's users/{uid}.totalEntries in step with soft-delete/restore.
// Children added from the admin panel carry the admin's uid, which has no users
// doc — updateDoc fails there and we skip it rather than create a stray employee.
export async function applyEmployeeEntryDelta(db: any, employeeId: string | undefined, delta: 1 | -1) {
  if (!employeeId) return;
  try {
    await updateDoc(doc(db, 'users', employeeId), { totalEntries: increment(delta) });
  } catch {}
}
