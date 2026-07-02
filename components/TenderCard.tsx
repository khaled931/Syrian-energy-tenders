import Link from "next/link";
import { formatDate, getTenderDeadlineState, STATUS_LABELS_AR, Tender, TENDER_TYPE_LABELS_AR } from "@/lib/types";

function label(map: Record<string, string>, value?: string) {
  if (!value) return "غير محدد";
  return map[value] || value;
}

export default function TenderCard({ tender }: { tender: Tender }) {
  const title = tender.title_ar || tender.title_en || "مناقصة دون عنوان";
  const organization = tender.organization_ar || tender.organization_en || "جهة غير محددة";
  const deadlineState = getTenderDeadlineState(tender);
  const status = deadlineState.displayStatus || "open";
  const closingSoonLabel = deadlineState.daysRemaining === 0 ? "تنتهي اليوم" : `تنتهي خلال ${deadlineState.daysRemaining} يوم`;

  return (
    <Link
      className={deadlineState.isClosingSoon ? "sr-card sr-card--compact sr-card--closing-soon" : "sr-card sr-card--compact"}
      href={`/tenders/${tender.id}`}
      aria-label={`فتح تفاصيل ${title}`}
    >
      <div className="sr-card__topline">
        <span className={`sr-status sr-status--${status}`}>{label(STATUS_LABELS_AR, status)}</span>
        <span className="sr-type">{label(TENDER_TYPE_LABELS_AR, tender.tender_type)}</span>
      </div>

      {deadlineState.isClosingSoon ? <span className="sr-deadline-badge">قريبة من الإغلاق · {closingSoonLabel}</span> : null}

      <div className="sr-card__main">
        <h2>{title}</h2>
        <p className="sr-card__org">{organization}</p>
      </div>

      <div className="sr-meta-grid sr-meta-grid--compact">
        <span>
          <strong>الطاقة</strong>
          {tender.energy_type || "غير محدد"}
        </span>
        <span>
          <strong>المحافظة</strong>
          {tender.governorate || "غير محدد"}
        </span>
        <span className={deadlineState.isClosingSoon ? "sr-deadline-date sr-deadline-date--soon" : "sr-deadline-date"}>
          <strong>الموعد</strong>
          {formatDate(tender.deadline)}
        </span>
      </div>

      <div className="sr-card__footer">
        <span>{tender.document_fee ? `دفتر الشروط: ${tender.document_fee} ${tender.currency || ""}` : "دفتر الشروط: غير محدد"}</span>
        <span className="sr-readmore">التفاصيل ←</span>
      </div>
    </Link>
  );
}
