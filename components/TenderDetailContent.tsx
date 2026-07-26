"use client";

import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { usePlatform } from "@/components/PlatformShell";
import {
  asRequirements,
  ENERGY_TYPE_LABELS_EN,
  formatDate,
  GOVERNORATE_LABELS_EN,
  STATUS_LABELS_AR,
  STATUS_LABELS_EN,
  Tender,
  TENDER_TYPE_LABELS_AR,
  TENDER_TYPE_LABELS_EN,
} from "@/lib/types";

function getLabel(map: Record<string, string>, value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return map[value] || value;
}

function Info({ label, value, wide = false, fallback }: { label: string; value?: string; wide?: boolean; fallback: string }) {
  return (
    <div className={wide ? "sr-info sr-info--wide" : "sr-info"}>
      <strong>{label}</strong>
      <span>{value || fallback}</span>
    </div>
  );
}

export default function TenderDetailContent({ tender, firebaseConfigured }: { tender: Tender | null; firebaseConfigured: boolean }) {
  const { locale } = usePlatform();
  const isArabic = locale === "ar";
  const fallback = isArabic ? "غير محدد" : "Not specified";
  const back = isArabic ? "العودة إلى المناقصات" : "Back to tenders";

  if (!firebaseConfigured) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">{back}</Link>
        <section className="sr-detail-card">
          <h1>{isArabic ? "إعدادات Firebase Admin غير مكتملة" : "Firebase Admin configuration is incomplete"}</h1>
          <p>
            {isArabic
              ? "لعرض صفحات التفاصيل بطريقة مناسبة للمشاركة وSEO، أضف متغيرات FIREBASE_PROJECT_ID وFIREBASE_CLIENT_EMAIL وFIREBASE_PRIVATE_KEY إلى Vercel."
              : "To render shareable, SEO-ready detail pages, add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Vercel."}
          </p>
        </section>
      </main>
    );
  }

  if (!tender) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">{back}</Link>
        <section className="sr-detail-card">
          <h1>{isArabic ? "المناقصة غير موجودة" : "Tender not found"}</h1>
          <p>{isArabic ? "قد تكون المناقصة حُذفت أو تغيّر رابطها." : "The tender may have been deleted or its URL may have changed."}</p>
        </section>
      </main>
    );
  }

  const title = isArabic ? tender.title_ar || tender.title_en || "مناقصة طاقة" : tender.title_en || tender.title_ar || "Energy tender";
  const organization = isArabic
    ? tender.organization_ar || tender.organization_en || "جهة غير محددة"
    : tender.organization_en || tender.organization_ar || "Organization not specified";
  const summary = isArabic ? tender.summary_ar || tender.summary_en : tender.summary_en || tender.summary_ar;
  const description = isArabic ? tender.description_ar || tender.description_en : tender.description_en || tender.description_ar;
  const requirements = asRequirements(tender.requirements);
  const statusLabels = isArabic ? STATUS_LABELS_AR : STATUS_LABELS_EN;
  const typeLabels = isArabic ? TENDER_TYPE_LABELS_AR : TENDER_TYPE_LABELS_EN;
  const dateLocale = isArabic ? "ar-SY" : "en-GB";
  const energy = isArabic ? tender.energy_type : ENERGY_TYPE_LABELS_EN[tender.energy_type] || tender.energy_type;
  const governorate = isArabic ? tender.governorate : GOVERNORATE_LABELS_EN[tender.governorate] || tender.governorate;

  return (
    <main className="sr-page-shell sr-detail-page">
      <Link className="sr-back-link" href="/">{back}</Link>

      <article className="sr-detail-card">
        <div className="sr-detail-header">
          <span className={`sr-status sr-status--${tender.status}`}>{getLabel(statusLabels, tender.status, fallback)}</span>
          <span className="sr-type">{getLabel(typeLabels, tender.tender_type, fallback)}</span>
        </div>

        <h1>{title}</h1>
        <p className="sr-detail-org">{organization}</p>

        <div className="sr-detail-grid">
          <Info label={isArabic ? "نوع الطاقة" : "Energy type"} value={energy} fallback={fallback} />
          <Info label={isArabic ? "المحافظة / الموقع" : "Governorate / location"} value={[governorate, tender.location].filter(Boolean).join(" - ")} fallback={fallback} />
          <Info label={isArabic ? "تاريخ الإعلان" : "Announcement date"} value={formatDate(tender.announcement_date, dateLocale)} fallback={fallback} />
          <Info label={isArabic ? "آخر موعد للتقديم" : "Submission deadline"} value={formatDate(tender.deadline, dateLocale)} fallback={fallback} />
          <Info label={isArabic ? "القدرة المطلوبة" : "Required capacity"} value={tender.capacity} fallback={fallback} />
          <Info label={isArabic ? "قيمة دفتر الشروط" : "Tender document fee"} value={tender.document_fee ? `${tender.document_fee} ${tender.currency || ""}` : undefined} fallback={fallback} />
          <Info label={isArabic ? "طريقة التقديم" : "Submission method"} value={tender.submission_method} wide fallback={fallback} />
          <Info label={isArabic ? "جودة البيانات" : "Data quality"} value={tender.data_quality} fallback={fallback} />
        </div>

        {summary ? <section className="sr-detail-section"><h2>{isArabic ? "ملخص المناقصة" : "Tender summary"}</h2><p>{summary}</p></section> : null}
        {description ? <section className="sr-detail-section"><h2>{isArabic ? "الوصف الكامل" : "Full description"}</h2><p>{description}</p></section> : null}

        {requirements.length ? (
          <section className="sr-detail-section">
            <h2>{isArabic ? "المتطلبات" : "Requirements"}</h2>
            <ul>{requirements.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ) : null}

        <div className="sr-detail-actions">
          {tender.source_url ? <a className="sr-button sr-button--primary" href={tender.source_url} target="_blank" rel="noopener noreferrer">{isArabic ? "رابط المصدر" : "Source link"}</a> : null}
          {tender.pdf_url ? <a className="sr-button sr-button--ghost" href={tender.pdf_url} target="_blank" rel="noopener noreferrer">{isArabic ? "تحميل دفتر الشروط PDF" : "Download tender PDF"}</a> : null}
          <ShareButton title={title} locale={locale} />
        </div>

        {tender.notes ? <p className="sr-notes">{isArabic ? "ملاحظات" : "Notes"}: {tender.notes}</p> : null}
      </article>
    </main>
  );
}
