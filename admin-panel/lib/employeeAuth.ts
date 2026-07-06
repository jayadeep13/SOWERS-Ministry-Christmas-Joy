// lib/employeeAuth.ts
// Employees log in with a phone number + password, but Firebase Auth needs an
// email — we derive a synthetic one from the phone number so both this admin
// panel (which creates the account) and the mobile app (which signs in) agree on it.
export function phoneToEmployeeEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `${digits}@sowers-employee.internal`;
}
