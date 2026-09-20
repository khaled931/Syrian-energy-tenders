import { timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

const GOVERNORATES = new Set([
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
]);

const DATA_QUALITY = new Set([
  "Verified",
  "High Confidence",
  "Medium Confidence",
  "Low Confidence",
  "Estimated",
  "Unverified",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function unwrapNotionValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => unwrapNotionValue(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (!isRecord(value)) return "";

  for (const key of ["plain_text", "content", "url", "name", "start"]) {
    if (key in value) {
      const unwrapped = unwrapNotionValue(value[key]);
      if (unwrapped) return unwrapped;
    }
  }

  for (const key of ["title", "rich_text", "select", "date", "value"]) {
    if (key in value) {
      const unwrapped = unwrapNotionValue(value[key]);
      if (unwrapped) return unwrapped;
    }
  }

  if ("number" in value && value.number !== null && value.number !== undefined) {
    return String(value.number);
  }

  return "";
}

function findByAliases(value: unknown, aliases: string[], depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return undefined;
  const aliasSet = new Set(aliases.map(normalizeKey));

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByAliases(item, aliases, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (aliasSet.has(normalizeKey(key))) return nestedValue;
  }

  for (const nestedValue of Object.values(value)) {
    const found = findByAliases(nestedValue, aliases, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
}

function readField(body: JsonRecord, aliases: string[]) {
  return unwrapNotionValue(findByAliases(body, aliases)).trim();
}

function safeUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function asTimestamp(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return Timestamp.fromDate(date);
}

function deadlineStatus(value: string) {
  if (!value) return "open";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "open";
  if (dateOnly) date.setUTCHours(23, 59, 59, 999);
  return date.getTime() < Date.now() ? "closed" : "open";
}

function inferEnergyType(category: string, title: string, description: string) {
  const text = `${category} ${title} ${description}`.toLowerCase();

  if (/شمسي|شمسية|كهروضوئ|solar|pv/.test(text)) return "طاقة شمسية";
  if (/رياح|عنفة|توربين هوائي|wind/.test(text)) return "طاقة رياح";
  if (/كهرومائ|سد|hydro/.test(text)) return "طاقة كهرومائية";
  if (/بطاري|تخزين|bess|battery/.test(text)) return "بطاريات وتخزين";
  if (/نفط|غاز|محروقات|بترول|oil|gas/.test(text)) return "نفط وغاز";
  if (/هيدروجين|hydrogen/.test(text)) return "هيدروجين";
  if (/كفاءة الطاقة|energy efficiency/.test(text)) return "كفاءة الطاقة";
  if (category === "إنشاءات وبنية تحتية") return "بنية تحتية";
  if (category === "طاقة وكهرباء") return "كهرباء";
  return "أخرى";
}

function tenderType(value: string, title: string) {
  const text = `${value} ${title}`;
  if (text.includes("مزاد")) return "auction";
  if (text.includes("طلب عروض")) return "rfp";
  if (text.includes("عرض") || text.includes("استجرار عروض")) return "offer";
  return "tender";
}

function splitRequirements(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

function cleanObject(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

function secretMatches(request: NextRequest, expected: string) {
  const supplied = request.headers.get("x-syrian-renewables-sync-secret")?.trim() || "";
  if (!supplied || !expected) return false;

  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function stableTenderId(telegramMessageId: string) {
  const normalized = telegramMessageId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return normalized ? `telegram-${normalized}` : "";
}

export async function POST(request: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  const expectedSecret = process.env.NOTION_TENDER_WEBHOOK_SECRET?.trim() || "";
  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "notion_tender_webhook_not_configured" },
      { status: 503, headers },
    );
  }

  if (!secretMatches(request, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers });
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: "firebase_admin_not_configured" },
      { status: 503, headers },
    );
  }

  let body: JsonRecord;
  try {
    const parsed = await request.json();
    if (!isRecord(parsed)) throw new Error("invalid_json_object");
    body = parsed;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers });
  }

  const reviewStatus = readField(body, ["حالة المراجعة", "review_status", "reviewStatus"]);
  if (reviewStatus !== "معتمد" && reviewStatus.toLowerCase() !== "approved") {
    return NextResponse.json(
      { ok: false, error: "tender_not_approved", reviewStatus: reviewStatus || null },
      { status: 422, headers },
    );
  }

  const telegramMessageId = readField(body, [
    "Telegram Message ID",
    "telegram_message_id",
    "telegramMessageId",
  ]);
  const titleAr = readField(body, ["عنوان المناقصة", "title_ar", "title"]);
  const organizationAr = readField(body, ["الجهة المعلنة", "organization_ar", "organization"]);

  const missing = [
    !telegramMessageId ? "Telegram Message ID" : "",
    !titleAr ? "عنوان المناقصة" : "",
    !organizationAr ? "الجهة المعلنة" : "",
  ].filter(Boolean);

  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields", missing },
      { status: 422, headers },
    );
  }

  const tenderId = stableTenderId(telegramMessageId);
  if (!tenderId) {
    return NextResponse.json(
      { ok: false, error: "invalid_telegram_message_id" },
      { status: 422, headers },
    );
  }

  const category = readField(body, ["مجال المناقصة", "category", "tender_category"]);
  const opportunityType = readField(body, ["نوع الفرصة", "tender_type", "opportunity_type"]);
  const governorateRaw = readField(body, ["المحافظة", "governorate"]);
  const governorate = GOVERNORATES.has(governorateRaw) ? governorateRaw : "غير محدد";
  const descriptionAr = readField(body, ["وصف المناقصة", "description_ar", "description"]);
  const summaryAr =
    readField(body, ["ملخص المناقصة", "summary_ar", "summary"]) ||
    (descriptionAr.length > 500 ? `${descriptionAr.slice(0, 497)}...` : descriptionAr);
  const applicationUrl = safeUrl(readField(body, ["الرابط للتقديم", "application_url", "apply_url"]));
  const telegramSourceUrl = safeUrl(
    readField(body, ["رابط مصدر الخبر", "telegram_source_url", "source_url"]),
  );
  const sourceUrl = applicationUrl || telegramSourceUrl;
  const pdfUrl = /\.pdf(?:$|[?#])/i.test(applicationUrl) ? applicationUrl : "";

  const announcementDateRaw = readField(body, ["تاريخ الإعلان", "announcement_date"]);
  const deadlineRaw = readField(body, ["آخر موعد للتقديم", "deadline"]);
  const sourcePublishedAtRaw = readField(body, ["التاريخ والوقت", "source_published_at"]);
  const location = readField(body, ["الموقع", "location"]);
  const capacity = readField(body, ["القدرة", "capacity"]);
  const submissionMethod = readField(body, ["طريقة التقديم", "submission_method"]);
  const documentFee = readField(body, ["قيمة دفتر الشروط", "document_fee"]);
  const currencyRaw = readField(body, ["العملة", "currency"]);
  const currency = ["SYP", "USD", "EUR"].includes(currencyRaw) ? currencyRaw : "SYP";
  const requirements = splitRequirements(readField(body, ["المتطلبات", "requirements"]));
  const qualityRaw = readField(body, ["جودة البيانات", "data_quality"]);
  const dataQuality = DATA_QUALITY.has(qualityRaw) ? qualityRaw : "Medium Confidence";
  const manualNotes = readField(body, ["ملاحظات", "notes"]);
  const notionPageUrl =
    safeUrl(readField(body, ["notion_page_url", "page_url", "pageUrl"])) ||
    (typeof body.url === "string" && body.url.includes("notion") ? safeUrl(body.url) : "");

  const notes = [
    manualNotes,
    telegramSourceUrl && telegramSourceUrl !== sourceUrl
      ? `مصدر Telegram: ${telegramSourceUrl}`
      : "",
    "Imported from Notion: Tender Telegram Feed",
  ]
    .filter(Boolean)
    .join("\n");

  const payload = cleanObject({
    title_ar: titleAr,
    organization_ar: organizationAr,
    energy_type: inferEnergyType(category, titleAr, descriptionAr),
    tender_type: tenderType(opportunityType, titleAr),
    governorate,
    location,
    capacity,
    announcement_date: asTimestamp(announcementDateRaw),
    deadline: asTimestamp(deadlineRaw),
    status: deadlineStatus(deadlineRaw),
    document_fee: documentFee,
    currency,
    submission_method:
      submissionMethod || (applicationUrl && !pdfUrl ? `رابط التقديم: ${applicationUrl}` : ""),
    summary_ar: summaryAr,
    description_ar: descriptionAr,
    requirements,
    source_url: sourceUrl,
    pdf_url: pdfUrl,
    data_quality: dataQuality,
    notes,
    telegram_message_id: telegramMessageId,
    telegram_source_url: telegramSourceUrl,
    application_url: applicationUrl,
    notion_page_url: notionPageUrl,
    source_published_at: asTimestamp(sourcePublishedAtRaw),
    import_source: "notion_telegram_feed",
    updated_at: FieldValue.serverTimestamp(),
  });

  try {
    const db = getAdminDb();
    const ref = db.collection("tenders").doc(tenderId);
    const existing = await ref.get();

    if (!existing.exists) {
      payload.created_at = FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });

    return NextResponse.json(
      {
        ok: true,
        tenderId,
        operation: existing.exists ? "updated" : "created",
        adminUrl: `/admin`,
        tenderUrl: `/tenders/${tenderId}`,
      },
      { status: existing.exists ? 200 : 201, headers },
    );
  } catch (error) {
    console.error(
      "[notion-tender-import] Failed to upsert tender",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { ok: false, error: "firestore_write_failed" },
      { status: 500, headers },
    );
  }
}
