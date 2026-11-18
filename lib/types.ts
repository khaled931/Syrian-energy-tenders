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
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  capacity?: string;
  announcement_date?: TimestampLike;
  deadline?: TimestampLike;
  deadline_precision?: "date" | "datetime";
  status: TenderStatus | string;
  status_origin?: "manual" | "import";
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
  /** Private Storage reference; never included in the public API. */
  pdf_storage_path?: string;
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
  unknown: "غير محدد",
};

export const STATUS_LABELS_EN: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  awarded: "Awarded",
  cancelled: "Cancelled",
  unknown: "Unknown",
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

export const GOVERNORATE_LABELS_EN: Record<string, string> = {
  "دمشق": "Damascus",
  "ريف دمشق": "Rif Dimashq",
  "حلب": "Aleppo",
  "حمص": "Homs",
  "حماة": "Hama",
  "اللاذقية": "Latakia",
  "طرطوس": "Tartus",
  "إدلب": "Idlib",
  "درعا": "Daraa",
  "السويداء": "As-Suwayda",
  "القنيطرة": "Quneitra",
  "دير الزور": "Deir ez-Zor",
  "الرقة": "Raqqa",
  "الحسكة": "Al-Hasakah",
  "كل سورية": "All Syria",
  "غير محدد": "Not specified",
};

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

export const ENERGY_TYPE_LABELS_EN: Record<string, string> = {
  "كهرباء": "Electricity",
  "طاقة شمسية": "Solar energy",
  "طاقة رياح": "Wind energy",
  "طاقة كهرومائية": "Hydropower",
  "بطاريات وتخزين": "Batteries and storage",
  "كفاءة الطاقة": "Energy efficiency",
  "نفط وغاز": "Oil and gas",
  "هيدروجين": "Hydrogen",
  "بنية تحتية": "Infrastructure",
  "أخرى": "Other",
};

export const DATA_QUALITY_OPTIONS: DataQuality[] = [
  "Verified",
  "High Confidence",
  "Medium Confidence",
  "Low Confidence",
  "Estimated",
  "Unverified",
];

export const DEFAULT_DEADLINE_WARNING_DAYS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const TENDER_TIME_ZONE = "Asia/Damascus";
const tenderWallTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TENDER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function localDateKey(date: Date): string {
  const parts = tenderWallTime.formatToParts(date);
  const value = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Resolve the following local midnight with IANA timezone data, not a fixed offset. */
function endOfTenderDay(date: Date): Date {
  const nextDay = new Date(date.getTime());
  nextDay.setUTCHours(0, 0, 0, 0);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const target = nextDay.getTime();
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = tenderWallTime.formatToParts(new Date(instant));
    const number = (key: string) => Number(parts.find((part) => part.type === key)?.value);
    const wallTime = Date.UTC(number("year"), number("month") - 1, number("day"), number("hour"), number("minute"), number("second"));
    const corrected = target - (wallTime - instant);
    if (corrected === instant) break;
    instant = corrected;
  }
  return new Date(instant);
}

export function dateToInput(value?: TimestampLike, precision?: Tender["deadline_precision"]): string {
  if (!value) return "";
  const date = normalizeDate(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return precision === "date" || (precision !== "datetime" && date.toISOString().endsWith("T00:00:00.000Z"))
    ? date.toISOString().slice(0, 10) : localDateKey(date);
}

export function normalizeDate(value?: TimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && "seconds" in value) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDate(value?: TimestampLike, locale = "ar-SY"): string {
  const date = normalizeDate(value);
  if (!date) return locale.startsWith("en") ? "Not specified" : "غير محدد";
  return new Intl.DateTimeFormat(locale, { timeZone: TENDER_TIME_ZONE, year: "numeric", month: "short", day: "numeric" }).format(date);
}

export function getTenderDeadlineState(tender: Tender, warningDays = DEFAULT_DEADLINE_WARNING_DAYS, now = new Date()) {
  const deadlineDate = normalizeDate(tender.deadline);
  const rawStatus = String(tender.status || "open").toLowerCase();
  // Status also enters Leaflet marker HTML; never pass arbitrary stored text.
  const normalizedStatus = ["open", "closed", "awarded", "cancelled"].includes(rawStatus) ? rawStatus : "unknown";
  const finalStatuses = ["closed", "awarded", "cancelled", "unknown"];

  if (!deadlineDate || Number.isNaN(deadlineDate.getTime())) {
    return {
      deadlineDate,
      isExpired: false,
      isClosingSoon: false,
      daysRemaining: null as number | null,
      displayStatus: normalizedStatus,
    };
  }

  // Legacy date inputs were stored as midnight UTC. Keep them usable through
  // the named calendar day; explicitly timed deadlines retain their exact instant.
  const dateOnly = tender.deadline_precision === "date" || (
    tender.deadline_precision !== "datetime" &&
    deadlineDate.toISOString().slice(11) === "00:00:00.000Z"
  );
  const cutoff = dateOnly ? endOfTenderDay(deadlineDate) : deadlineDate;
  const remainingMs = cutoff.getTime() - now.getTime();
  const isExpired = remainingMs <= 0;
  const daysRemaining = Math.max(0, dateOnly
    ? Math.round((new Date(`${deadlineDate.toISOString().slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${localDateKey(now)}T00:00:00Z`).getTime()) / DAY_IN_MS)
    : Math.ceil(remainingMs / DAY_IN_MS));
  const isFinalStatus = finalStatuses.includes(normalizedStatus);

  return {
    deadlineDate,
    isExpired,
    isClosingSoon: !isFinalStatus && !isExpired && remainingMs <= warningDays * DAY_IN_MS,
    daysRemaining,
    displayStatus: isExpired && normalizedStatus === "open" ? "closed" : normalizedStatus,
  };
}

export function asRequirements(value?: string[] | string): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
