import { randomUUID, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { importedTenderStatus, importDatePrecision } from "@/lib/tenderImport";
import { dateToInput, isValidDateOnly } from "@/lib/types";
import { BodyTooLargeError, readBoundedJson } from "@/lib/requestBody";

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
  if (depth > 8 || value === null || value === undefined) return undefined;
  const aliasSet = new Set(aliases.map(normalizeKey));

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findByAliases(item, aliases, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  // Standard object shape: { "الجهة المعلنة": ... }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (aliasSet.has(normalizeKey(key))) return nestedValue;
  }

  // Notion webhook payloads can also encode a property as a descriptor,
  // e.g. { name: "الجهة المعلنة", value: "..." } or
  // { property: "الجهة المعلنة", rich_text: [...] }.
  const descriptorKeys = ["name", "property", "property_name", "propertyName", "label", "key"];
  const payloadKeys = [
    "value",
    "text",
    "rich_text",
    "title",
    "select",
    "date",
    "url",
    "content",
    "plain_text",
    "number",
    "property_value",
    "propertyValue",
  ];

  for (const descriptorKey of descriptorKeys) {
    const descriptor = value[descriptorKey];
    if (typeof descriptor !== "string" || !aliasSet.has(normalizeKey(descriptor))) continue;

    for (const payloadKey of payloadKeys) {
      if (payloadKey === descriptorKey || !(payloadKey in value)) continue;
      const candidate = value[payloadKey];
      if (candidate !== undefined && candidate !== null) return candidate;
    }
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

function inferOrganization(title: string, description: string) {
  const candidates = [description, title].filter(Boolean);

  for (const text of candidates) {
    const announcedBy = text.match(/(?:^|[.!؟]\s*)تعلن\s+([^،,.؛:]{3,120}?)\s+(?:عن|استدراج|طلب|مناقصة|مزاد)/);
    if (announcedBy?.[1]) return announcedBy[1].trim();

    const dashSuffix = text.match(/[–—-]\s*([^–—-]{3,100})$/);
    if (dashSuffix?.[1] && /(شركة|مؤسسة|وزارة|محافظة|مديرية|إدارة|جامعة|منظمة|مجلس|هيئة)/.test(dashSuffix[1])) {
      return dashSuffix[1].trim();
    }
  }

  return "";
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

const DEBUG_DOC_PATH = ["_system", "notion_tender_webhook_debug"] as const;

async function writeWebhookDebug(data: Record<string, unknown>) {
  if (!isFirebaseAdminConfigured()) return;
  try {
    const db = getAdminDb();
    await db.collection(DEBUG_DOC_PATH[0]).doc(DEBUG_DOC_PATH[1]).set(
      {
        ...data,
        receivedAt: new Date().toISOString(),
      },
    );
  } catch (error) {
    console.error(
      "[notion-tender-import] Failed to write webhook diagnostics",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function GET(request: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  // Diagnostics use the existing automation credential. Do not disclose even
  // configuration flags, or read Firestore, before authentication succeeds.
  const expectedSecret = process.env.NOTION_TENDER_WEBHOOK_SECRET?.trim() || "";
  if (!secretMatches(request, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401, headers });
  }

  let lastWebhookDebug: Record<string, unknown> | null = null;

  if (isFirebaseAdminConfigured()) {
    try {
      const db = getAdminDb();
      const snapshot = await db.collection(DEBUG_DOC_PATH[0]).doc(DEBUG_DOC_PATH[1]).get();
      lastWebhookDebug = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
    } catch {
      lastWebhookDebug = { result: "debug_read_failed" };
    }
  }

  return NextResponse.json(
    {
      ok: true,
      service: "notion-tender-import",
      version: "2026-09-26.2",
      webhookSecretConfigured: Boolean(process.env.NOTION_TENDER_WEBHOOK_SECRET?.trim()),
      firebaseAdminConfigured: isFirebaseAdminConfigured(),
      lastWebhookDebug,
    },
    { headers },
  );
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

  const authHeaderPresent = Boolean(
    request.headers.get("x-syrian-renewables-sync-secret")?.trim(),
  );
  const authMatched = secretMatches(request, expectedSecret);

  if (!authMatched) {
    // Untrusted requests must not generate billable diagnostic database writes.
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
    const parsed = await readBoundedJson(request);
    if (!isRecord(parsed)) throw new Error("invalid_json_object");
    body = parsed;
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ ok: false, error: "body_too_large" }, { status: 413, headers });
    }
    await writeWebhookDebug({
      result: "invalid_json",
      authHeaderPresent,
      authMatched: true,
    });
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers });
  }

  const topLevelKeys = Object.keys(body).slice(0, 50);
  const reviewStatus = readField(body, ["حالة المراجعة", "review_status", "reviewStatus"]);
  if (reviewStatus !== "معتمد" && reviewStatus.toLowerCase() !== "approved") {
    await writeWebhookDebug({
      result: "tender_not_approved",
      authHeaderPresent,
      authMatched: true,
      topLevelKeys,
      reviewStatus: reviewStatus || null,
    });
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
  const organizationFromWebhook = readField(body, ["الجهة المعلنة", "organization_ar", "organization"]);

  const missing = [
    !telegramMessageId ? "Telegram Message ID" : "",
    !titleAr ? "عنوان المناقصة" : "",
  ].filter(Boolean);

  if (missing.length) {
    await writeWebhookDebug({
      result: "missing_required_fields",
      authHeaderPresent,
      authMatched: true,
      topLevelKeys,
      reviewStatus,
      extracted: {
        telegramMessageIdPresent: Boolean(telegramMessageId),
        titlePresent: Boolean(titleAr),
        organizationPresent: Boolean(organizationFromWebhook),
      },
      missing,
    });
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
  const inferredOrganization = inferOrganization(titleAr, descriptionAr);
  const organizationAr = organizationFromWebhook || inferredOrganization || "جهة غير محددة";
  const organizationSource = organizationFromWebhook
    ? "webhook"
    : inferredOrganization
      ? "inferred_from_text"
      : "fallback_unspecified";
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
  for (const [field, value] of Object.entries({ announcement_date: announcementDateRaw, deadline: deadlineRaw, source_published_at: sourcePublishedAtRaw })) {
    if (!value) continue;
    const valid = importDatePrecision(value) === "date"
      ? isValidDateOnly(value)
      : isValidDateOnly(value.slice(0, 10)) && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Boolean(asTimestamp(value));
    if (!valid) return NextResponse.json({ ok: false, error: "invalid_date", field }, { status: 422, headers });
  }
  if (announcementDateRaw && deadlineRaw &&
      dateToInput(asTimestamp(deadlineRaw), importDatePrecision(deadlineRaw)) <
      dateToInput(asTimestamp(announcementDateRaw), importDatePrecision(announcementDateRaw))) {
    return NextResponse.json({ ok: false, error: "deadline_before_announcement" }, { status: 422, headers });
  }
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
    !organizationFromWebhook
      ? organizationSource === "inferred_from_text"
        ? `الجهة المعلنة لم تصل من Notion webhook؛ استُخرجت من نص المناقصة: ${organizationAr}`
        : "الجهة المعلنة لم تصل من Notion webhook؛ سُجلت مؤقتاً كجهة غير محددة."
      : "",
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
    deadline_precision: deadlineRaw ? importDatePrecision(deadlineRaw) : undefined,
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
    save_operation_id: randomUUID(),
    updated_at: FieldValue.serverTimestamp(),
  });

  try {
    const db = getAdminDb();
    const ref = db.collection("tenders").doc(tenderId);
    const operation = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      const data = existing.data() || {};
      const status = importedTenderStatus(data, payload);
      const write = { ...payload, status, status_origin: data.status_origin || "import" };
      if (!existing.exists) Object.assign(write, { created_at: FieldValue.serverTimestamp() });
      transaction.set(ref, write, { merge: true });
      return existing.exists ? "updated" : "created";
    });

    await writeWebhookDebug({
      result: "success",
      authHeaderPresent,
      authMatched: true,
      topLevelKeys,
      reviewStatus,
      tenderId,
      operation,
      extracted: {
        telegramMessageIdPresent: true,
        titlePresent: true,
        organizationPresent: Boolean(organizationFromWebhook),
        organizationSource,
        organizationValue: organizationAr,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        tenderId,
        operation,
        adminUrl: `/admin`,
        tenderUrl: `/tenders/${tenderId}`,
      },
      { status: operation === "updated" ? 200 : 201, headers },
    );
  } catch (error) {
    console.error(
      "[notion-tender-import] Failed to upsert tender",
      error instanceof Error ? error.message : error,
    );
    await writeWebhookDebug({
      result: "firestore_write_failed",
      authHeaderPresent,
      authMatched: true,
      topLevelKeys,
      reviewStatus,
      tenderId,
    });
    return NextResponse.json(
      { ok: false, error: "firestore_write_failed" },
      { status: 500, headers },
    );
  }
}
