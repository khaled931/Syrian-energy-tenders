import { dateToInput, isValidDateOnly, normalizeDate, type Tender, type TenderStatus, type TenderType } from "./types";

export type TenderForm = {
  title_ar: string; title_en: string; organization_ar: string; organization_en: string;
  energy_type: string; tender_type: TenderType; governorate: string; location: string;
  latitude: string; longitude: string; capacity: string; announcement_date: string;
  deadline: string; status: TenderStatus; document_fee: string; currency: string;
  submission_method: string; summary_ar: string; summary_en: string;
  description_ar: string; description_en: string; requirements: string;
  source_url: string; pdf_url: string; pdf_storage_path: string; data_quality: string; notes: string;
};

export function tenderFormFields(form: TenderForm, previous?: Tender): Record<string, unknown> {
  if (!form.title_ar.trim() || !form.organization_ar.trim()) {
    throw new Error("عنوان المناقصة والجهة المعلنة مطلوبان.");
  }
  if (!["open", "closed", "awarded", "cancelled"].includes(form.status)) throw new Error("حالة المناقصة غير صحيحة.");
  if (!["tender", "auction", "offer", "rfp"].includes(form.tender_type)) throw new Error("نوع الفرصة غير صحيح.");
  for (const field of ["announcement_date", "deadline"] as const) {
    if (form[field] && !isValidDateOnly(form[field])) throw new Error("تاريخ الإعلان أو الإغلاق غير صحيح.");
  }
  if (form.announcement_date && form.deadline && form.deadline < form.announcement_date) {
    throw new Error("موعد الإغلاق لا يمكن أن يسبق تاريخ الإعلان.");
  }
  for (const field of ["source_url", "pdf_url"] as const) {
    if (!form[field].trim()) continue;
    let url: URL;
    try { url = new URL(form[field].trim()); } catch { throw new Error("رابط المصدر أو المرفق غير صحيح."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
      throw new Error("استخدم رابط HTTP أو HTTPS دون بيانات تسجيل دخول.");
    }
  }
  const hasLatitude = Boolean(form.latitude.trim());
  const hasLongitude = Boolean(form.longitude.trim());
  if (hasLatitude !== hasLongitude) throw new Error("أدخل خط العرض وخط الطول معاً، أو اتركهما فارغين.");
  const latitude = hasLatitude ? Number(form.latitude) : null;
  const longitude = hasLongitude ? Number(form.longitude) : null;
  if ((latitude !== null && (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
      (longitude !== null && (!Number.isFinite(longitude) || Math.abs(longitude) > 180))) {
    throw new Error("الإحداثيات خارج النطاق الصحيح.");
  }
  // Only preserve a stored attachment reference, never accept a newly typed path.
  if (form.pdf_storage_path && form.pdf_storage_path !== previous?.pdf_storage_path) {
    throw new Error("مرجع المرفق غير صحيح.");
  }
  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value.trim() || null]),
  );
  fields.latitude = latitude;
  fields.longitude = longitude;
  // Canonical coordinates replace legacy aliases when an editor saves a record.
  fields.lat = null;
  fields.lng = null;
  fields.requirements = form.requirements.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  fields.status_origin = previous && previous.status === form.status ? previous.status_origin || null : "manual";
  // The editor currently accepts calendar dates. Preserve any existing exact
  // timestamp if the date input was not changed, instead of silently losing time.
  for (const field of ["announcement_date", "deadline"] as const) {
    if (form[field] && previous && form[field] === dateToInput(previous[field], field === "deadline" ? previous.deadline_precision : undefined)) {
      fields[field] = previous[field];
    }
  }
  const sameDeadline = Boolean(form.deadline && previous && form.deadline === dateToInput(previous.deadline, previous.deadline_precision));
  fields.deadline_precision = form.deadline
    ? (sameDeadline ? previous?.deadline_precision || (
      normalizeDate(previous?.deadline)?.toISOString().endsWith("T00:00:00.000Z") ? "date" : "datetime"
    ) : "date")
    : null;
  return fields;
}
