// app/api/employees/reset-pin/route.ts
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../../../../lib/firebaseAdmin';
import { verifyAdmin } from '../../../../lib/verifyAdmin';

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  try {
    await verifyAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const employeeUid = body?.employeeUid;
  if (!employeeUid || typeof employeeUid !== 'string') {
    return NextResponse.json({ error: 'employeeUid is required' }, { status: 400 });
  }

  const newPin = generatePin();
  try {
    const adminAuth = getAdminAuth();
    await adminAuth.updateUser(employeeUid, { password: newPin });
    await adminAuth.revokeRefreshTokens(employeeUid);
    await getAdminDb().collection('users').doc(employeeUid).update({
      pendingPinReset: newPin,
      pinResetAt: FieldValue.serverTimestamp(),
      pinResetReason: 'manual',
      failedAttempts: 0,
      firstFailedAttemptAt: null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reset PIN' }, { status: 500 });
  }

  return NextResponse.json({ pin: newPin });
}
