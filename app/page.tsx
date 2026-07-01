"use client";

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TenderCard from "@/components/TenderCard";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { ENERGY_TYPES_AR, GOVERNORATES_AR, Tender } from "@/lib/types";

export default function HomePage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [language, setLanguage] = useState<"AR" | "EN">("AR");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [energyType, setEnergyType] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [tenderType, setTenderType] = useState("");

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

  function clearFilters() {
    setSearch("");
    setStatus("");
    setEnergyType("");
    setGovernorate("");
    setTenderType("");
  }

  return (
    <main className="sr-page-shell">
      <header className="sr-hero">
        <nav className="sr-topbar" aria-label="الشريط العلوي">
          <div>
            <span className="sr-eyebrow">Syrian Renewables</span>
            <h1>مناقصات الطاقة</h1>
          </div>
          <div className="sr-actions">
            <button className="sr-button sr-button--ghost" type="button" onClick={() => setShowFilters((value) => !value)}>
              فلاتر
            </button>
            <button className="sr-button sr-button--ghost" type="button" onClick={() => setLanguage(language === "AR" ? "EN" : "AR")}>
              {language}
            </button>
            <Link className="sr-button sr-button--primary" href="/admin">
              لوحة الإدارة
            </Link>
          </div>
        </nav>

        <section className="sr-hero__content">
          <p>
            منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية، مع روابط المصادر ودفاتر الشروط عند توفرها.
          </p>
          <div className="sr-searchbar">
            <input
              aria-label="بحث في المناقصات"
              type="search"
              placeholder="ابحث باسم المناقصة، الجهة، المحافظة أو نوع الطاقة..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="sr-button sr-button--primary" type="button">
              بحث
            </button>
          </div>
        </section>
      </header>

      {showFilters ? (
        <section className="sr-filters" aria-label="فلاتر المناقصات">
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

          <button className="sr-button sr-button--ghost" type="button" onClick={clearFilters}>
            مسح الفلاتر
          </button>
        </section>
      ) : null}

      <section className="sr-section-head">
        <div>
          <span className="sr-eyebrow">النتائج</span>
          <h2>{filteredTenders.length} فرصة منشورة</h2>
        </div>
      </section>

      {loading ? <p className="sr-state">جار تحميل المناقصات...</p> : null}
      {error ? <p className="sr-state sr-state--error">{error}</p> : null}
      {!loading && !error && filteredTenders.length === 0 ? <p className="sr-state">لا توجد مناقصات مطابقة حالياً.</p> : null}

      <section className="sr-card-grid" aria-label="قائمة المناقصات">
        {filteredTenders.map((tender) => (
          <TenderCard key={tender.id} tender={tender} />
        ))}
      </section>
    </main>
  );
}
