// lib/gender.ts
// Display-only labels. The stored value in Firestore stays 'Male' / 'Female' /
// 'Other' (shared with the mobile app, the stats counters and the gender index),
// so only what the admin sees on screen and in exports changes.
export function genderLabel(gender: string): string {
  return gender === 'Male' ? 'Boy' : gender === 'Female' ? 'Girl' : gender;
}
