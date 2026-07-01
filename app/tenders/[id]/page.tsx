import type { Metadata } from "next";
import type { DocumentData } from "firebase-admin/firestore";
import Link from "next/link";
import ShareButton from "@/components/ShareButton";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { asRequirements, formatDate, normalizeDate, STATUS_LABELS_AR, Tender, TENDER_TYPE_LABELS_AR } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

function serializeDate(value: unknown): string | undefined {
  const date = normalizeDate(value as never);
  return date ? date.toISOString() : undefined;
}

function serializeTender(id: string, data: DocumentData): Tender {
  return {
    id,
    ...data,
    announcement_date: serializeDate(data.announcement_date),
    deadline: serializeDate(data.deadline),
    created_at: serializeDate(data.created_at),
    updated_at: serializeDate(data.updated_at),
  } as Tender;
}

async function getTender(id: string): Promise<Tender | null> {
  if (!isFirebaseAdminConfigured()) return null;
  const snapshot = await getAdminDb().collection("tenders").doc(id).get();
  if (!snapshot.exists) return null;
  return serializeTender(snapshot.id, snapshot.data() || {});
}

function getLabel(map: Record<string, string>, value?: string) {
  if (!value) return "غير محدد";
  return map[value] || value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tender = await getTender(id);
  if (!tender) {
    return {
      title: "تفاصيل مناقصة الطاقة | Syrian Renewables",
      description: "تفاصيل مناقصة أو مزايدة أو عرض طاقة منشور على Syrian Renewables.",
    };
  }

  const title = tender.title_ar || tender.title_en || "تفاصيل مناقصة الطاقة";
  const description = tender.summary_ar || tender.description_ar || "تفاصيل مناقصة أو مزايدة أو عرض طاقة في سورية.";

  return {
    title: `${title} | مناقصات الطاقة`,
    description: description.slice(0, 155),
    openGraph: {
      title,
      description: description.slice(0, 180),
      type: "article",
    },
  };
}

export default async function TenderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tender = await getTender(id);

  if (!isFirebaseAdminConfigured()) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">
          العودة إلى المناقصات
        </Link>
        <section className="sr-detail-card">
          <h1>إعدادات Firebase Admin غير مكتملة</h1>
          <p>
            لعرض صفحات التفاصيل بطريقة مناسبة للمشاركة وSEO، أضف متغيرات FIREBASE_PROJECT_ID وFIREBASE_CLIENT_EMAIL وFIREBASE_PRIVATE_KEY إلى Vercel.
          </p>
        </section>
      </main>
    );
  }

  if (!tender) {
    return (
      <main className="sr-page-shell sr-detail-page">
        <Link className="sr-back-link" href="/">
          العودة إلى المناقصات
        </Link>
        <section className="sr-detail-card">
          <h1>المناقصة غير موجودة</h1>
          <p>قد تكون المناقصة حُذفت أو تغيّر رابطها.</p>
        </section>
      </main>
    );
  }

  const title = tender.title_ar || tender.title_en || "مناقصة طاقة";
  const requirements = asRequirements(tender.requirements);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: tender.summary_ar || tender.description_ar || title,
    publisher: "Syrian Renewables",
    datePublished: normalizeDate(tender.announcement_date)?.toISOString(),
    expires: normalizeDate(tender.deadline)?.toISOString(),
    url: tender.source_url,
  };

  return (
    <main className="sr-page-shell sr-detail-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link className="sr-back-link" href="/">
        العودة إلى المناقصات
      </Link>

      <article className="sr-detail-card">
        <div className="sr-detail-header">
          <span className={`sr-status sr-status--${tender.status}`}>{getLabel(STATUS_LABELS_AR, tender.status)}</span>
          <span className="sr-type">{getLabel(TENDER_TYPE_LABELS_AR, tender.tender_type)}</span>
        </div>

        <h1>{title}</h1>
        <p className="sr-detail-org">{tender.organization_ar || tender.organization_en || "جهة غير محددة"}</p>

        <div className="sr-detail-grid">
          <Info label="نوع الطاقة" value={tender.energy_type} />
          <Info label="المحافظة / الموقع" value={[tender.governorate, tender.location].filter(Boolean).join(" - ")} />
          <Info label="تاريخ الإعلان" value={formatDate(tender.announcement_date)} />
          <Info label="آخر موعد للتقديم" value={formatDate(tender.deadline)} />
          <Info label="القدرة المطلوبة" value={tender.capacity} />
          <Info label="قيمة دفتر الشروط" value={tender.document_fee ? `${tender.document_fee} ${tender.currency || ""}` : undefined} />
          <Info label="طريقة التقديم" value={tender.submission_method} wide />
          <Info label="جودة البيانات" value={tender.data_quality} />
        </div>

        {tender.summary_ar ? (
          <section className="sr-detail-section">
            <h2>ملخص المناقصة</h2>
            <p>{tender.summary_ar}</p>
          </section>
        ) : null}

        {tender.description_ar ? (
          <section className="sr-detail-section">
            <h2>الوصف الكامل</h2>
            <p>{tender.description_ar}</p>
          </section>
        ) : null}

        {requirements.length ? (
          <section className="sr-detail-section">
            <h2>المتطلبات</h2>
            <ul>
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="sr-detail-actions">
          {tender.source_url ? (
            <a className="sr-button sr-button--primary" href={tender.source_url} target="_blank" rel="noopener noreferrer">
              رابط المصدر
            </a>
          ) : null}
          {tender.pdf_url ? (
            <a className="sr-button sr-button--ghost" href={tender.pdf_url} target="_blank" rel="noopener noreferrer">
              تحميل دفتر الشروط PDF
            </a>
          ) : null}
          <ShareButton title={title} />
        </div>

        {tender.notes ? <p className="sr-notes">ملاحظات: {tender.notes}</p> : null}
      </article>
    </main>
  );
}

function Info({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sr-info sr-info--wide" : "sr-info"}>
      <strong>{label}</strong>
      <span>{value || "غير محدد"}</span>
    </div>
  );
}
