export type TenderStatus = "open" | "closed" | "awarded" | "cancelled";
export type TenderType = "tender" | "auction" | "offer" | "rfp";
export type DataQuality =
  | "Verified"
  | "High Confidence"
  | "Medium Confidence"
  | "Low Confidence"
  | "Estimated"
  | "Unverified";

export type TimestampLike = Date | string | number | { seconds: number; nanoseconds?: number } | { toDate: () => Date } | null | undefined;

export interface Tender {
  id?: string;
  title_ar: string;
  title_en?: string;
  organization_ar: string;
  organization_en?: string;
  energy_type: string;
  tender_type: TenderType | string;
  governorate: string;
  location?: string;
  capacity?: string;
  announcement_date?: TimestampLike;
  deadline?: TimestampLike;
  status: TenderStatus | string;
  document_fee?: string;
  currency?: "SYP" | "USD" | "EUR" | string;
  submission_method?: string;
  summary_ar?: string;
  summary_en?: string;
  description_ar?: string;
  description_en?: string;
  requirements?: string[] | string;
  source_url?: string;
  pdf_url?: string;
  data_quality?: DataQuality | string;
  notes?: string;
  created_at?: TimestampLike;
  updated_at?: TimestampLike;
}

export const STATUS_LABELS_AR: Record<string, string> = {
  open: "مفتوحة",
  closed: "مغلقة",
  awarded: "مُرساة",
  cancelled: "ملغاة",
};

export const STATUS_LABELS_EN: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  awarded: "Awarded",
  cancelled: "Cancelled",
};

export const TENDER_TYPE_LABELS_AR: Record<string, string> = {
  tender: "مناقصة",
  auction: "مزاد",
  offer: "عرض",
  rfp: "طلب عروض",
};

export const TENDER_TYPE_LABELS_EN: Record<string, string> = {
  tender: "Tender",
  auction: "Auction",
  offer: "Offer",
  rfp: "RFP",
};

export const GOVERNORATES_AR = [
  "دمشق",
  "ريف دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "إدلب",
  "درعا",
  "السويداء",
  "القنيطرة",
  "دير الزور",
  "الرقة",
  "الحسكة",
  "كل سورية",
  "غير محدد",
];

export const ENERGY_TYPES_AR = [
  "كهرباء",
  "طاقة شمسية",
  "طاقة رياح",
  "طاقة كهرومائية",
  "بطاريات وتخزين",
  "كفاءة الطاقة",
  "نفط وغاز",
  "هيدروجين",
  "بنية تحتية",
  "أخرى",
];

export const DATA_QUALITY_OPTIONS: DataQuality[] = [
  "Verified",
  "High Confidence",
  "Medium Confidence",
  "Low Confidence",
  "Estimated",
  "Unverified",
];

export function dateToInput(value?: TimestampLike): string {
  if (!value) return "";
  const date = normalizeDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function normalizeDate(value?: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "seconds" in value) {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export function formatDate(value?: TimestampLike, locale = "ar-SY"): string {
  const date = normalizeDate(value);
  if (!date) return "غير محدد";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function asRequirements(value?: string[] | string): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
