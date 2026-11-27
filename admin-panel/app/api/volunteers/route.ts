// app/api/volunteers/route.ts
//
// Volunteers are admin-only data. They're read/written here with the Admin SDK
// (after verifyAdmin) so the Firestore security rules don't need a new entry.
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../lib/firebaseAdmin';
import { verifyAdmin } from '../../../lib/verifyAdmin';
import { validateVolunteer } from '../../../lib/volunteers';

export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const snap = await getAdminDb().collection('volunteers').orderBy('name').get();
    const volunteers = snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        name: v.name,
        gender: v.gender,
        phone: v.phone,
        designations: v.designations ?? [],
        createdAt: v.createdAt?.toDate?.().toISOString() ?? null,
      };
    });
    return NextResponse.json({ volunteers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load volunteers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let adminUid: string;
  try {
    adminUid = await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { value, error } = validateVolunteer(await req.json().catch(() => null));
  if (!value) return NextResponse.json({ error }, { status: 400 });

  try {
    const col = getAdminDb().collection('volunteers');
    const dup = await col.where('phone', '==', value.phone).limit(1).get();
    if (!dup.empty) {
      return NextResponse.json(
        { error: `This mobile number is already registered to ${dup.docs[0].data().name}` },
        { status: 409 }
      );
    }
    const ref = await col.add({ ...value, createdAt: FieldValue.serverTimestamp(), createdBy: adminUid });
    return NextResponse.json({ id: ref.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save volunteer' }, { status: 500 });
  }
}
