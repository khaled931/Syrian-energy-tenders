import Link from "next/link";
import { formatDate, STATUS_LABELS_AR, Tender, TENDER_TYPE_LABELS_AR } from "@/lib/types";

function label(map: Record<string, string>, value?: string) {
  if (!value) return "غير محدد";
  return map[value] || value;
}

export default function TenderCard({ tender }: { tender: Tender }) {
  const title = tender.title_ar || tender.title_en || "مناقصة دون عنوان";
  const organization = tender.organization_ar || tender.organization_en || "جهة غير محددة";
  const status = tender.status || "open";

  return (
    <Link className="sr-card" href={`/tenders/${tender.id}`} aria-label={`فتح تفاصيل ${title}`}>
      <div className="sr-card__topline">
        <span className={`sr-status sr-status--${status}`}>{label(STATUS_LABELS_AR, status)}</span>
        <span className="sr-type">{label(TENDER_TYPE_LABELS_AR, tender.tender_type)}</span>
      </div>

      <h2>{title}</h2>
      <p className="sr-card__org">{organization}</p>

      {tender.summary_ar ? <p className="sr-card__summary">{tender.summary_ar}</p> : null}

      <div className="sr-meta-grid">
        <span>
          <strong>نوع الطاقة</strong>
          {tender.energy_type || "غير محدد"}
        </span>
        <span>
          <strong>المحافظة</strong>
          {tender.governorate || "غير محدد"}
        </span>
        <span>
          <strong>قيمة الدفتر</strong>
          {tender.document_fee ? `${tender.document_fee} ${tender.currency || ""}` : "غير محدد"}
        </span>
        <span>
          <strong>آخر موعد</strong>
          {formatDate(tender.deadline)}
        </span>
      </div>

      <div className="sr-card__footer">
        <span>تاريخ الإعلان: {formatDate(tender.announcement_date)}</span>
        <span className="sr-readmore">التفاصيل ←</span>
      </div>
    </Link>
  );
}
