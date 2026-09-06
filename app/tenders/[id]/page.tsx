import type { Metadata } from "next";
import TenderDetailContent from "@/components/TenderDetailContent";
import { resolveCentralAccess } from "@/lib/centralAccess";
import { isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { getTender, isTenderInPublicSample } from "@/lib/tendersServer";
import { normalizeDate } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function resolveTenderPage(id: string) {
  const access = await resolveCentralAccess("energy_tenders", "ar", 5);
  const publicSample = access.allowed ? true : await isTenderInPublicSample(id, access.guestItemLimit);
  const tender = publicSample ? await getTender(id) : null;
  return { access, publicSample, tender };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { publicSample, tender } = await resolveTenderPage(id);

  if (!publicSample) {
    return {
      title: "مناقصة طاقة | Syrian Renewables",
      description: "أنشئ حساباً مجانياً للاطلاع على تفاصيل هذه المناقصة ضمن متتبع مناقصات الطاقة السوري.",
      robots: { index: false, follow: true },
    };
  }

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
  const { access, publicSample, tender } = firebaseConfigured
    ? await resolveTenderPage(id)
    : { access: await resolveCentralAccess("energy_tenders", "ar", 5), publicSample: false, tender: null };

  const title = tender?.title_ar || tender?.title_en || "Energy tender";
  const jsonLd = tender ? {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: title,
    description: tender.summary_ar || tender.summary_en || tender.description_ar || tender.description_en || title,
    publisher: "Syrian Renewables",
    datePublished: normalizeDate(tender.announcement_date)?.toISOString(),
    expires: normalizeDate(tender.deadline)?.toISOString(),
  } : null;

  const returnTo = `https://tender.syrianrenewables.com/tenders/${encodeURIComponent(id)}`;

  return (
    <>
      {jsonLd ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /> : null}
      <TenderDetailContent
        tender={tender}
        firebaseConfigured={firebaseConfigured}
        gated={!access.allowed && !publicSample}
        publicLimit={access.guestItemLimit}
        returnTo={returnTo}
      />
    </>
  );
}
