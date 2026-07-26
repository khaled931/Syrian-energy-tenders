"use client";

import dynamic from "next/dynamic";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import TenderCard from "@/components/TenderCard";
import { usePlatform } from "@/components/PlatformShell";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  ENERGY_TYPES_AR,
  ENERGY_TYPE_LABELS_EN,
  GOVERNORATES_AR,
  GOVERNORATE_LABELS_EN,
  STATUS_LABELS_AR,
  STATUS_LABELS_EN,
  TENDER_TYPE_LABELS_AR,
  TENDER_TYPE_LABELS_EN,
  Tender,
} from "@/lib/types";

const TenderMap = dynamic(() => import("@/components/TenderMap"), { ssr: false });

const copy = {
  ar: {
    title: "مناقصات الطاقة",
    filter: "فلتر",
    topbar: "الشريط العلوي",
    list: "قائمة المناقصات",
    map: "خريطة المناقصات والعروض",
    view: "طريقة عرض المناقصات",
    description: "منصة معلوماتية مختصرة لتتبع مناقصات ومزايدات وعروض الطاقة في سورية، مع روابط المصادر ودفاتر الشروط عند توفرها.",
    searchLabel: "بحث في المناقصات",
    searchPlaceholder: "ابحث باسم المناقصة أو الجهة...",
    filtersTitle: "فلاتر البحث",
    closeFilters: "إغلاق الفلاتر",
    status: "الحالة",
    allStatuses: "كل الحالات",
    energy: "نوع الطاقة",
    allEnergy: "كل الأنواع",
    governorate: "المحافظة",
    allGovernorates: "كل المحافظات",
    opportunity: "نوع الفرصة",
    allOpportunities: "كل الأنواع",
    clear: "مسح الفلاتر",
    apply: "تطبيق",
    results: "النتائج",
    published: "فرصة منشورة",
    loading: "جار تحميل المناقصات...",
    firebase: "لم يتم ضبط إعدادات Firebase بعد. أضف متغيرات البيئة ثم أعد النشر.",
    loadError: "تعذر تحميل المناقصات.",
    empty: "لا توجد مناقصات مطابقة حالياً.",
    listLabel: "قائمة المناقصات",
  },
  en: {
    title: "Energy Tenders",
    filter: "Filters",
    topbar: "Page controls",
    list: "Tender list",
    map: "Tenders and offers map",
    view: "Tender display mode",
    description: "A concise information platform tracking energy tenders, auctions, and offers in Syria, with source links and tender documents when available.",
    searchLabel: "Search tenders",
    searchPlaceholder: "Search by tender title or organization...",
    filtersTitle: "Search filters",
    closeFilters: "Close filters",
    status: "Status",
    allStatuses: "All statuses",
    energy: "Energy type",
    allEnergy: "All types",
    governorate: "Governorate",
    allGovernorates: "All governorates",
    opportunity: "Opportunity type",
    allOpportunities: "All types",
    clear: "Clear filters",
    apply: "Apply",
    results: "Results",
    published: "published opportunities",
    loading: "Loading tenders...",
    firebase: "Firebase is not configured. Add the required environment variables and redeploy.",
    loadError: "Unable to load tenders.",
    empty: "No matching tenders are currently available.",
    listLabel: "Tender list",
  },
} as const;

export default function HomePage() {
  const { locale } = usePlatform();
  const text = copy[locale];
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [energyType, setEnergyType] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [tenderType, setTenderType] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      setError(text.firebase);
      return;
    }

    const q = query(collection(db, "tenders"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTenders(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Tender));
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message || text.loadError);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [text.firebase, text.loadError]);

  useEffect(() => {
    if (!showFilters) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFilters(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showFilters]);

  const filteredTenders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenders.filter((tender) => {
      const searchableText = [
        tender.title_ar,
        tender.title_en,
        tender.organization_ar,
        tender.organization_en,
        tender.summary_ar,
        tender.summary_en,
        tender.governorate,
        tender.energy_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchableText.includes(term)) &&
        (!status || tender.status === status) &&
        (!energyType || tender.energy_type === energyType) &&
        (!governorate || tender.governorate === governorate) &&
        (!tenderType || tender.tender_type === tenderType)
      );
    });
  }, [energyType, governorate, search, status, tenderType, tenders]);

  const activeFilters = [status, energyType, governorate, tenderType].filter(Boolean).length;
  const statusLabels = locale === "ar" ? STATUS_LABELS_AR : STATUS_LABELS_EN;
  const typeLabels = locale === "ar" ? TENDER_TYPE_LABELS_AR : TENDER_TYPE_LABELS_EN;

  function clearFilters() {
    setSearch("");
    setStatus("");
    setEnergyType("");
    setGovernorate("");
    setTenderType("");
  }

  return (
    <main className="sr-page-shell sr-home-shell">
      <header className="sr-hero sr-hero--compact">
        <nav className="sr-topbar sr-mobile-topbar" aria-label={text.topbar}>
          <div className="sr-title-block">
            <span className="sr-eyebrow">Syrian Renewables</span>
            <h1>{text.title}</h1>
          </div>
          <div className="sr-actions sr-mobile-actions">
            <button className="sr-mini-button" type="button" onClick={() => setShowFilters(true)} aria-label={text.filtersTitle}>
              {text.filter}{activeFilters ? ` ${activeFilters}` : ""}
            </button>
          </div>
        </nav>

        <div className="sr-view-tabs" role="tablist" aria-label={text.view}>
          <button className={viewMode === "list" ? "sr-view-tab sr-view-tab--active" : "sr-view-tab"} type="button" role="tab" aria-selected={viewMode === "list"} onClick={() => setViewMode("list")}>
            {text.list}
          </button>
          <button className={viewMode === "map" ? "sr-view-tab sr-view-tab--active" : "sr-view-tab"} type="button" role="tab" aria-selected={viewMode === "map"} onClick={() => setViewMode("map")}>
            {text.map}
          </button>
        </div>

        <section className="sr-hero__content sr-hero__content--compact">
          <p>{text.description}</p>
          <div className="sr-searchbar sr-searchbar--compact">
            <input
              aria-label={text.searchLabel}
              type="search"
              placeholder={text.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </section>
      </header>

      {showFilters ? (
        <div className="sr-filter-layer" role="presentation">
          <button className="sr-filter-backdrop" type="button" onClick={() => setShowFilters(false)} aria-label={text.closeFilters} />
          <aside className="sr-filter-drawer" aria-label={text.filtersTitle}>
            <div className="sr-filter-drawer__head">
              <div><span className="sr-eyebrow">Filter</span><h2>{text.filtersTitle}</h2></div>
              <button className="sr-mini-button" type="button" onClick={() => setShowFilters(false)} aria-label={text.closeFilters}>×</button>
            </div>

            <div className="sr-filters sr-filters--drawer">
              <label>
                {text.status}
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">{text.allStatuses}</option>
                  {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>

              <label>
                {text.energy}
                <select value={energyType} onChange={(event) => setEnergyType(event.target.value)}>
                  <option value="">{text.allEnergy}</option>
                  {ENERGY_TYPES_AR.map((item) => <option key={item} value={item}>{locale === "ar" ? item : ENERGY_TYPE_LABELS_EN[item] || item}</option>)}
                </select>
              </label>

              <label>
                {text.governorate}
                <select value={governorate} onChange={(event) => setGovernorate(event.target.value)}>
                  <option value="">{text.allGovernorates}</option>
                  {GOVERNORATES_AR.map((item) => <option key={item} value={item}>{locale === "ar" ? item : GOVERNORATE_LABELS_EN[item] || item}</option>)}
                </select>
              </label>

              <label>
                {text.opportunity}
                <select value={tenderType} onChange={(event) => setTenderType(event.target.value)}>
                  <option value="">{text.allOpportunities}</option>
                  {Object.entries(typeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
            </div>

            <div className="sr-filter-drawer__actions">
              <button className="sr-button sr-button--ghost" type="button" onClick={clearFilters}>{text.clear}</button>
              <button className="sr-button sr-button--primary" type="button" onClick={() => setShowFilters(false)}>{text.apply}</button>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="sr-section-head sr-section-head--compact">
        <div><span className="sr-eyebrow">{text.results}</span><h2>{filteredTenders.length} {text.published}</h2></div>
      </section>

      {loading ? <p className="sr-state">{text.loading}</p> : null}
      {error ? <p className="sr-state sr-state--error">{error}</p> : null}
      {!loading && !error && filteredTenders.length === 0 ? <p className="sr-state">{text.empty}</p> : null}

      {!loading && !error && viewMode === "map" ? <TenderMap tenders={filteredTenders} locale={locale} /> : null}

      {!loading && !error && viewMode === "list" ? (
        <section className="sr-card-grid sr-card-grid--compact" aria-label={text.listLabel}>
          {filteredTenders.map((tender) => <TenderCard key={tender.id} tender={tender} locale={locale} />)}
        </section>
      ) : null}
    </main>
  );
}
