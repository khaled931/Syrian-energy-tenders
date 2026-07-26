import type { Metadata } from "next";
import type { DocumentData } from "firebase-admin/firestore";
import TenderDetailContent from "@/components/TenderDetailContent";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { normalizeDate, Tender } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
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
  const description = tender.summary_ar || tender.summary_en || tender.description_ar || tender.description_en || "تفاصيل مناقصة أو مزايدة أو عرض طاقة في سورية.";

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
  const firebaseConfigured = isFirebaseAdminConfigured();
  const tender = await getTender(id);
  const title = tender?.title_ar || tender?.title_en || "Energy tender";
  const jsonLd = tender ? {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: tender.summary_ar || tender.summary_en || tender.description_ar || tender.description_en || title,
    publisher: "Syrian Renewables",
    datePublished: normalizeDate(tender.announcement_date)?.toISOString(),
    expires: normalizeDate(tender.deadline)?.toISOString(),
    url: tender.source_url,
  } : null;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <TenderDetailContent tender={tender} firebaseConfigured={firebaseConfigured} />
    </>
  );
}
