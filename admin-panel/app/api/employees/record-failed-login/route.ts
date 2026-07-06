// app/api/employees/record-failed-login/route.ts
//
// Called by the mobile app right after a failed sign-in attempt. Intentionally
// unauthenticated (the user has no valid session yet) — only ever returns
// { locked: boolean } and never reveals whether a phone number is registered.
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from '../../../../lib/firebaseAdmin';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 6;

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `+91${digits}`;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = body?.phone;
  if (!phone || typeof phone !== 'string') {
    return NextResponse.json({ locked: false });
  }

  try {
    const adminDb = getAdminDb();
    const snap = await adminDb
      .collection('users')
      .where('phone', '==', normalizePhone(phone))
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ locked: false });
    }

    const employeeDoc = snap.docs[0];
    const data = employeeDoc.data();
    const now = Date.now();
    const firstFailedAt: number | null = data.firstFailedAttemptAt?.toMillis?.() ?? null;
    const windowExpired = !firstFailedAt || now - firstFailedAt > WINDOW_MS;

    const attempts = windowExpired ? 1 : (data.failedAttempts || 0) + 1;

    if (attempts >= MAX_ATTEMPTS) {
      const newPin = generatePin();
      const adminAuth = getAdminAuth();
      await adminAuth.updateUser(employeeDoc.id, { password: newPin });
      await adminAuth.revokeRefreshTokens(employeeDoc.id);
      await employeeDoc.ref.update({
        pendingPinReset: newPin,
        pinResetAt: FieldValue.serverTimestamp(),
        pinResetReason: 'auto-lockout',
        failedAttempts: 0,
        firstFailedAttemptAt: null,
      });
      return NextResponse.json({ locked: true });
    }

    await employeeDoc.ref.update({
      failedAttempts: attempts,
      firstFailedAttemptAt: windowExpired ? FieldValue.serverTimestamp() : data.firstFailedAttemptAt,
    });
    return NextResponse.json({ locked: false });
  } catch {
    return NextResponse.json({ locked: false });
  }
}
