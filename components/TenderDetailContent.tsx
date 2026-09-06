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

function accountUrl(locale: "ar" | "en", kind: "login" | "register", returnTo: string) {
  const url = new URL(`/${locale}/account/${kind}`, "https://syrianrenewables.com");
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export default function TenderDetailContent({
  tender,
  firebaseConfigured,
  gated = false,
  publicLimit = 5,
  returnTo = "https://tender.syrianrenewables.com/",
}: {
  tender: Tender | null;
  firebaseConfigured: boolean;
  gated?: boolean;
  publicLimit?: number;
  returnTo?: string;
}) {
  const { locale } = usePlatform();
  const isArabic = locale === "ar";
  const fallback = isArabic ? "غير محدد" : "Not specified";
  const back = isArabic ? "العودة إلى المناقصات" : "Back to tenders";

  if (gated) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">{back}</Link>
        <section className="sr-detail-card sr-detail-gate">
          <span className="sr-eyebrow">Syrian Renewables</span>
          <h1>{isArabic ? "هذه المناقصة متاحة بعد إنشاء حساب مجاني" : "This tender is available with a free account"}</h1>
          <p>
            {isArabic
              ? `يمكن للزائر الاطلاع على أحدث ${publicLimit} مناقصات. أنشئ حساباً مجانياً للاطلاع على بقية السجلات المنشورة. لا يتطلب الحساب المجاني أي دفع.`
              : `Visitors can view the latest ${publicLimit} tenders. Create a free account to access the remaining published records. A Free account requires no payment.`}
          </p>
          <div className="sr-detail-actions">
            <a className="sr-button sr-button--primary" href={accountUrl(locale, "register", returnTo)}>
              {isArabic ? "إنشاء حساب مجاني" : "Create free account"}
            </a>
            <a className="sr-button sr-button--ghost" href={accountUrl(locale, "login", returnTo)}>
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </a>
          </div>
        </section>
      </main>
    );
  }

  if (!firebaseConfigured) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">{back}</Link>
        <section className="sr-detail-card">
          <h1>{isArabic ? "تعذر تحميل تفاصيل المناقصة" : "Tender details are unavailable"}</h1>
          <p>{isArabic ? "تعذر الوصول إلى خدمة البيانات حالياً. حاول مرة أخرى لاحقاً." : "The data service is currently unavailable. Please try again later."}</p>
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
          <ShareButton title={title} locale={locale} />
        </div>
      </article>
    </main>
  );
}
