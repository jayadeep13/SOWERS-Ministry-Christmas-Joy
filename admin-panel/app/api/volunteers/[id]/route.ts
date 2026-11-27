// app/api/volunteers/[id]/route.ts — edit or remove one volunteer (admin only).
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../../../lib/firebaseAdmin';
import { verifyAdmin } from '../../../../lib/verifyAdmin';
import { validateVolunteer } from '../../../../lib/volunteers';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { value, error } = validateVolunteer(await req.json().catch(() => null));
  if (!value) return NextResponse.json({ error }, { status: 400 });

  try {
    const col = getAdminDb().collection('volunteers');
    const ref = col.doc(params.id);
    if (!(await ref.get()).exists) return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });

    const dup = await col.where('phone', '==', value.phone).limit(2).get();
    const other = dup.docs.find((d) => d.id !== params.id);
    if (other) {
      return NextResponse.json(
        { error: `This mobile number is already registered to ${other.data().name}` },
        { status: 409 }
      );
    }
    await ref.update({ ...value, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update volunteer' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await getAdminDb().collection('volunteers').doc(params.id).delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove volunteer' }, { status: 500 });
  }
}
