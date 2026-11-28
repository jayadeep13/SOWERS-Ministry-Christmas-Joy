// lib/volunteers.ts — shared by the Volunteers page and its API routes.

export const DESIGNATIONS = [
  'Transportation',
  'Supervising',
  'Teaching Team',
  'Child care/Food',
  'Welcome Team',
  'Media',
  'Distribution',
  'Finance',
  'Security',
] as const;

export const VOLUNTEER_GENDERS = ['Male', 'Female'] as const;

export interface Volunteer {
  id: string;
  name: string;
  gender: string;
  phone: string; // 10 digits
  designations: string[];
  createdAt?: string; // ISO
}

export interface VolunteerInput {
  name: string;
  gender: string;
  phone: string;
  designations: string[];
}

// Returns a cleaned copy, or an error message for the admin.
export function validateVolunteer(input: any): { value?: VolunteerInput; error?: string } {
  const name = String(input?.name ?? '').trim().replace(/\s+/g, ' ');
  const gender = String(input?.gender ?? '');
  const phone = String(input?.phone ?? '').replace(/\D/g, '').slice(-10);
  const designations: string[] = Array.isArray(input?.designations)
    ? DESIGNATIONS.filter((d) => input.designations.includes(d))
    : [];

  if (!name) return { error: 'Name is required' };
  if (name.length > 80) return { error: 'Name is too long' };
  if (!(VOLUNTEER_GENDERS as readonly string[]).includes(gender)) return { error: 'Please select a gender' };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: 'Enter a valid 10-digit mobile number' };
  if (designations.length === 0) return { error: 'Select at least one designation' };
  return { value: { name, gender, phone, designations } };
}
