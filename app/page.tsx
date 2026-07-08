"use client";

import dynamic from "next/dynamic";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import TenderCard from "@/components/TenderCard";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ENERGY_TYPES_AR, GOVERNORATES_AR, Tender } from "@/lib/types";

const TenderMap = dynamic(() => import("@/components/TenderMap"), {
  ssr: false,
  loading: () => <p className="sr-state">جار تحميل خريطة المناقصات...</p>,
});

export default function HomePage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState<"AR" | "EN">("AR");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [energyType, setEnergyType] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [tenderType, setTenderType] = useState("");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem("sr-theme", theme);
    } catch {
      // Theme persistence is optional.
    }
  }, [theme]);

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("sr-theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        setTheme(savedTheme);
      }
    } catch {
      // Keep the default light theme if localStorage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      setError("لم يتم ضبط إعدادات Firebase بعد. أضف متغيرات البيئة ثم أعد النشر.");
      return;
    }

    const q = query(collection(db, "tenders"), orderBy("created_at", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTenders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Tender));
        setLoading(false);
      },
      (err) => {
        setError(err.message || "تعذر تحميل المناقصات.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const filteredTenders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenders.filter((tender) => {
      const text = [
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
        (!term || text.includes(term)) &&
        (!status || tender.status === status) &&
        (!energyType || tender.energy_type === energyType) &&
        (!governorate || tender.governorate === governorate) &&
        (!tenderType || tender.tender_type === tenderType)
      );
    });
  }, [energyType, governorate, search, status, tenderType, tenders]);

  const activeFilters = [status, energyType, governorate, tenderType].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setStatus("");
    setEnergyType("");
    setGovernorate("");
    setTenderType("");
  }

  return (
    <main className={`sr-page-shell sr-home-shell ${theme === "dark" ? "sr-theme-dark" : ""}`}>
      <header className="sr-hero sr-hero--compact">
        <nav className="sr-topbar sr-mobile-topbar" aria-label="الشريط العلوي">
          <div className="sr-title-block">
            <span className="sr-eyebrow">Syrian Renewables</span>
            <h1>مناقصات الطاقة</h1>
          </div>
          <div className="sr-actions sr-mobile-actions">
            <button className="sr-mini-button" type="button" onClick={() => setShowFilters(true)} aria-label="فتح الفلاتر">
              فلتر{activeFilters ? ` ${activeFilters}` : ""}
            </button>
            <button className="sr-mini-button" type="button" onClick={() => setLanguage(language === "AR" ? "EN" : "AR")} aria-label="تبديل اللغة">
              {language}
            </button>
            <button className="sr-mini-button" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="تبديل الوضع الداكن والفاتح">
              {theme === "light" ? "☾" : "☀"}
            </button>
          </div>
        </nav>

        <div className="sr-view-tabs" role="tablist" aria-label="طريقة عرض المناقصات">
          <button className={viewMode === "list" ? "sr-view-tab sr-view-tab--active" : "sr-view-tab"} type="button" onClick={() => setViewMode("list")}>
            قائمة المناقصات
          </button>
          <button className={viewMode === "map" ? "sr-view-tab sr-view-tab--active" : "sr-view-tab"} type="button" onClick={() => setViewMode("map")}>
            خريطة المناقصات والعروض
          </button>
        </div>

        <section className="sr-hero__content sr-hero__content--compact">
          <p>
            منصة معلوماتية مختصرة لتتبع مناقصات ومزايدات وعروض الطاقة في سورية، مع روابط المصادر ودفاتر الشروط عند توفرها.
          </p>
          <div className="sr-searchbar sr-searchbar--compact">
            <input
              aria-label="بحث في المناقصات"
              type="search"
              placeholder="ابحث باسم المناقصة أو الجهة..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </section>
      </header>

      {showFilters ? (
        <div className="sr-filter-layer" role="presentation">
          <button className="sr-filter-backdrop" type="button" onClick={() => setShowFilters(false)} aria-label="إغلاق الفلاتر" />
          <aside className="sr-filter-drawer" aria-label="فلاتر المناقصات">
            <div className="sr-filter-drawer__head">
              <div>
                <span className="sr-eyebrow">Filter</span>
                <h2>فلاتر البحث</h2>
              </div>
              <button className="sr-mini-button" type="button" onClick={() => setShowFilters(false)} aria-label="إغلاق">
                ×
              </button>
            </div>

            <div className="sr-filters sr-filters--drawer">
              <label>
                الحالة
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">كل الحالات</option>
                  <option value="open">مفتوحة</option>
                  <option value="closed">مغلقة</option>
                  <option value="awarded">مُرساة</option>
                  <option value="cancelled">ملغاة</option>
                </select>
              </label>

              <label>
                نوع الطاقة
                <select value={energyType} onChange={(event) => setEnergyType(event.target.value)}>
                  <option value="">كل الأنواع</option>
                  {ENERGY_TYPES_AR.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                المحافظة
                <select value={governorate} onChange={(event) => setGovernorate(event.target.value)}>
                  <option value="">كل المحافظات</option>
                  {GOVERNORATES_AR.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                نوع الفرصة
                <select value={tenderType} onChange={(event) => setTenderType(event.target.value)}>
                  <option value="">كل الأنواع</option>
                  <option value="tender">مناقصة</option>
                  <option value="auction">مزاد</option>
                  <option value="offer">عرض</option>
                  <option value="rfp">طلب عروض</option>
                </select>
              </label>
            </div>

            <div className="sr-filter-drawer__actions">
              <button className="sr-button sr-button--ghost" type="button" onClick={clearFilters}>
                مسح الفلاتر
              </button>
              <button className="sr-button sr-button--primary" type="button" onClick={() => setShowFilters(false)}>
                تطبيق
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="sr-section-head sr-section-head--compact">
        <div>
          <span className="sr-eyebrow">النتائج</span>
          <h2>{filteredTenders.length} فرصة منشورة</h2>
        </div>
      </section>

      {loading ? <p className="sr-state">جار تحميل المناقصات...</p> : null}
      {error ? <p className="sr-state sr-state--error">{error}</p> : null}
      {!loading && !error && filteredTenders.length === 0 ? <p className="sr-state">لا توجد مناقصات مطابقة حالياً.</p> : null}

      {!loading && !error && viewMode === "map" ? <TenderMap tenders={filteredTenders} /> : null}

      {!loading && !error && viewMode === "list" ? (
        <section className="sr-card-grid sr-card-grid--compact" aria-label="قائمة المناقصات">
          {filteredTenders.map((tender) => (
            <TenderCard key={tender.id} tender={tender} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
