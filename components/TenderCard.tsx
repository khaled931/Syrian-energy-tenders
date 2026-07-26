import Link from "next/link";
import {
  ENERGY_TYPE_LABELS_EN,
  formatDate,
  getTenderDeadlineState,
  GOVERNORATE_LABELS_EN,
  STATUS_LABELS_AR,
  STATUS_LABELS_EN,
  Tender,
  TENDER_TYPE_LABELS_AR,
  TENDER_TYPE_LABELS_EN,
} from "@/lib/types";
import type { PlatformLocale } from "@/lib/platform";

function label(map: Record<string, string>, value: string | undefined, fallback: string) {
  if (!value) return fallback;
  return map[value] || value;
}

export default function TenderCard({ tender, locale }: { tender: Tender; locale: PlatformLocale }) {
  const isArabic = locale === "ar";
  const fallback = isArabic ? "غير محدد" : "Not specified";
  const title = isArabic
    ? tender.title_ar || tender.title_en || "مناقصة دون عنوان"
    : tender.title_en || tender.title_ar || "Untitled tender";
  const organization = isArabic
    ? tender.organization_ar || tender.organization_en || "جهة غير محددة"
    : tender.organization_en || tender.organization_ar || "Organization not specified";
  const deadlineState = getTenderDeadlineState(tender);
  const status = deadlineState.displayStatus || "open";
  const statusLabels = isArabic ? STATUS_LABELS_AR : STATUS_LABELS_EN;
  const typeLabels = isArabic ? TENDER_TYPE_LABELS_AR : TENDER_TYPE_LABELS_EN;
  const dateLocale = isArabic ? "ar-SY" : "en-GB";
  const closingSoonLabel = deadlineState.daysRemaining === 0
    ? (isArabic ? "تنتهي اليوم" : "Closes today")
    : (isArabic ? `تنتهي خلال ${deadlineState.daysRemaining} يوم` : `Closes in ${deadlineState.daysRemaining} days`);

  return (
    <Link
      className={deadlineState.isClosingSoon ? "sr-card sr-card--compact sr-card--closing-soon" : "sr-card sr-card--compact"}
      href={`/tenders/${tender.id}`}
      aria-label={isArabic ? `فتح تفاصيل ${title}` : `Open details for ${title}`}
    >
      <div className="sr-card__topline">
        <span className={`sr-status sr-status--${status}`}>{label(statusLabels, status, fallback)}</span>
        <span className="sr-type">{label(typeLabels, tender.tender_type, fallback)}</span>
      </div>

      {deadlineState.isClosingSoon ? <span className="sr-deadline-badge">{isArabic ? "قريبة من الإغلاق" : "Closing soon"} · {closingSoonLabel}</span> : null}

      <div className="sr-card__main">
        <h2>{title}</h2>
        <p className="sr-card__org">{organization}</p>
      </div>

      <div className="sr-meta-grid sr-meta-grid--compact">
        <span>
          <strong>{isArabic ? "الطاقة" : "Energy"}</strong>
          {isArabic ? tender.energy_type || fallback : ENERGY_TYPE_LABELS_EN[tender.energy_type] || tender.energy_type || fallback}
        </span>
        <span>
          <strong>{isArabic ? "المحافظة" : "Governorate"}</strong>
          {isArabic ? tender.governorate || fallback : GOVERNORATE_LABELS_EN[tender.governorate] || tender.governorate || fallback}
        </span>
        <span className={deadlineState.isClosingSoon ? "sr-deadline-date sr-deadline-date--soon" : "sr-deadline-date"}>
          <strong>{isArabic ? "الموعد" : "Deadline"}</strong>
          {formatDate(tender.deadline, dateLocale)}
        </span>
      </div>

      <div className="sr-card__footer">
        <span>
          {tender.document_fee
            ? `${isArabic ? "دفتر الشروط" : "Tender documents"}: ${tender.document_fee} ${tender.currency || ""}`
            : `${isArabic ? "دفتر الشروط" : "Tender documents"}: ${fallback}`}
        </span>
        <span className="sr-readmore">{isArabic ? "التفاصيل ←" : "Details →"}</span>
      </div>
    </Link>
  );
}
