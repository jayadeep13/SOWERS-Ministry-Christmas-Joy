// lib/gifts.ts
// Gift delivery: counts shared by the Dashboard and Gift Report, plus the one
// place that writes gift status (the admin panel's Gift Delivery page).
import { doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';

// Writes only the three gift fields on each child — nothing else on the record
// is touched, and nothing is deleted. Batched (Firestore allows 500 per batch).
// Returns how many were saved; throws with that count on failure part-way.
export async function setGiftStatus(db: Firestore, ids: string[], received: boolean, adminEmail: string) {
  const fields = received
    ? { giftReceived: true, giftReceivedAt: serverTimestamp(), giftReceivedBy: adminEmail }
    : { giftReceived: false, giftReceivedAt: null, giftReceivedBy: null };
  let done = 0;
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    ids.slice(i, i + 400).forEach((id) => batch.update(doc(db, 'children', id), fields));
    try {
      await batch.commit();
    } catch (err: any) {
      throw new Error(`Saved ${done} of ${ids.length}, then failed: ${err.message || err.code || 'unknown error'}`);
    }
    done += Math.min(400, ids.length - i);
  }
  return done;
}

export interface GiftChild {
  gender?: string;
  village?: string;
  deleted?: boolean;
  giftReceived?: boolean;
}

export interface VillageGiftStats {
  village: string;
  total: number;
  delivered: number;
  pending: number;
}

export function giftSummary(children: GiftChild[]) {
  const active = children.filter((c) => !c.deleted);
  const delivered = active.filter((c) => c.giftReceived);

  const byVillage: Record<string, VillageGiftStats> = {};
  active.forEach((c) => {
    const village = (c.village || '').trim() || 'Unknown';
    const v = (byVillage[village] ??= { village, total: 0, delivered: 0, pending: 0 });
    v.total += 1;
    if (c.giftReceived) v.delivered += 1;
    else v.pending += 1;
  });

  return {
    total: active.length,
    delivered: delivered.length,
    pending: active.length - delivered.length,
    percent: active.length ? Math.round((delivered.length / active.length) * 100) : 0,
    boysDelivered: delivered.filter((c) => c.gender === 'Male').length,
    girlsDelivered: delivered.filter((c) => c.gender === 'Female').length,
    villages: Object.values(byVillage).sort((a, b) => b.total - a.total),
  };
}
