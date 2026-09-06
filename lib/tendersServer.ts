import "server-only";
import type { DocumentData } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { normalizeDate, Tender } from "@/lib/types";

function serializeDate(value: unknown): string | undefined {
  const date = normalizeDate(value as never);
  return date ? date.toISOString() : undefined;
}

/**
 * Build the exact client-facing tender representation.
 *
 * This is intentionally a whitelist rather than an omit-list. Any future
 * provenance, source, attachment, raw-data, research-note, or internal field
 * added to Firestore will therefore remain server-only unless it is reviewed
 * and explicitly added here.
 */
export function serializeTender(id: string, data: DocumentData): Tender {
  return {
    id,
    title_ar: String(data.title_ar || ""),
    title_en: data.title_en ? String(data.title_en) : undefined,
    organization_ar: String(data.organization_ar || ""),
    organization_en: data.organization_en ? String(data.organization_en) : undefined,
    energy_type: String(data.energy_type || ""),
    tender_type: String(data.tender_type || ""),
    governorate: String(data.governorate || ""),
    location: data.location ? String(data.location) : undefined,
    capacity: data.capacity ? String(data.capacity) : undefined,
    announcement_date: serializeDate(data.announcement_date),
    deadline: serializeDate(data.deadline),
    status: String(data.status || "open"),
    document_fee: data.document_fee ? String(data.document_fee) : undefined,
    currency: data.currency ? String(data.currency) : undefined,
    submission_method: data.submission_method ? String(data.submission_method) : undefined,
    summary_ar: data.summary_ar ? String(data.summary_ar) : undefined,
    summary_en: data.summary_en ? String(data.summary_en) : undefined,
    description_ar: data.description_ar ? String(data.description_ar) : undefined,
    description_en: data.description_en ? String(data.description_en) : undefined,
    requirements: Array.isArray(data.requirements)
      ? data.requirements.filter((item: unknown) => typeof item === "string")
      : typeof data.requirements === "string"
        ? data.requirements
        : undefined,
    data_quality: data.data_quality ? String(data.data_quality) : undefined,
    created_at: serializeDate(data.created_at),
    updated_at: serializeDate(data.updated_at),
  };
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
