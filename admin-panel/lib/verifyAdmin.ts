// lib/verifyAdmin.ts — server-only.
import { getAdminAuth, getAdminDb } from './firebaseAdmin';

export class AdminVerificationError extends Error {}

// Admins authenticate the same Firebase project as employees, but only
// employees get a `users/{uid}` doc (created by the Add Employee flow) —
// same heuristic used in the Firestore security rules.
export async function verifyAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new AdminVerificationError('Missing bearer token');

  const decoded = await getAdminAuth().verifyIdToken(match[1]);
  const employeeDoc = await getAdminDb().collection('users').doc(decoded.uid).get();
  if (employeeDoc.exists) {
    throw new AdminVerificationError('Caller is an employee, not an admin');
  }
  return decoded.uid;
}
