import "server-only";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { normalizeDate, Tender } from "@/lib/types";

function serializeDate(value: unknown): string | undefined {
  const date = normalizeDate(value as never);
  return date ? date.toISOString() : undefined;
}

export function serializeTender(id: string, data: DocumentData): Tender {
  return {
    id,
    ...data,
    announcement_date: serializeDate(data.announcement_date),
    deadline: serializeDate(data.deadline),
    created_at: serializeDate(data.created_at),
    updated_at: serializeDate(data.updated_at),
  } as Tender;
}

export async function getTender(id: string): Promise<Tender | null> {
  if (!isFirebaseAdminConfigured()) return null;
  const snapshot = await getAdminDb().collection("tenders").doc(id).get();
  if (!snapshot.exists) return null;
  return serializeTender(snapshot.id, snapshot.data() || {});
}

export async function listTenders(maxItems?: number): Promise<Tender[]> {
  if (!isFirebaseAdminConfigured()) return [];
  let query = getAdminDb().collection("tenders").orderBy("created_at", "desc");
  if (typeof maxItems === "number" && Number.isSafeInteger(maxItems) && maxItems > 0) {
    query = query.limit(maxItems);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((item) => serializeTender(item.id, item.data()));
}

export async function isTenderInPublicSample(id: string, maxItems: number): Promise<boolean> {
  if (!isFirebaseAdminConfigured()) return false;
  const snapshot = await getAdminDb().collection("tenders").orderBy("created_at", "desc").limit(maxItems).get();
  return snapshot.docs.some((item) => item.id === id);
}
