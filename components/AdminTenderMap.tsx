"use client";

import { useMemo, useState } from "react";
import TenderMap from "@/components/TenderMap";
import { ENERGY_TYPES_AR, GOVERNORATES_AR, Tender, STATUS_LABELS_AR } from "@/lib/types";

function hasPreciseCoordinates(tender: Tender) {
  const lat = tender.latitude ?? tender.lat;
  const lng = tender.longitude ?? tender.lng;
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) return true;
  return Boolean(tender.location?.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/));
}

export default function AdminTenderMap({ tenders }: { tenders: Tender[] }) {
  const [status, setStatus] = useState("all");
  const [energy, setEnergy] = useState("all");
  const [governorate, setGovernorate] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenders.filter((tender) => {
      if (status !== "all" && (tender.status || "open") !== status) return false;
      if (energy !== "all" && tender.energy_type !== energy) return false;
      if (governorate !== "all" && tender.governorate !== governorate) return false;
      if (!term) return true;
      return [
        tender.title_ar,
        tender.title_en,
        tender.organization_ar,
        tender.organization_en,
        tender.location,
        tender.governorate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [energy, governorate, search, status, tenders]);

  const precise = filtered.filter(hasPreciseCoordinates).length;
  const approximate = filtered.length - precise;
  const missingLocation = filtered.filter((tender) => !tender.location && (!tender.governorate || tender.governorate === "غير محدد")).length;

  return (
    <section className="sr-admin-map-workspace" aria-label="خريطة المناقصات">
      <div className="sr-admin-dashboard__intro">
        <div>
          <span className="sr-eyebrow">OpenStreetMap</span>
          <h2>الخريطة الجغرافية للمناقصات</h2>
          <p>تعرض الخريطة الإحداثيات الدقيقة عند توفرها، وإلا تستخدم مركز المحافظة كموضع تقريبي واضح للأدمن.</p>
        </div>
      </div>

      <div className="sr-admin-filterbar sr-admin-filterbar--map">
        <label>
          بحث
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="العنوان، الجهة، الموقع..."
          />
        </label>
        <label>
          الحالة
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABELS_AR).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>
          نوع الطاقة
          <select value={energy} onChange={(event) => setEnergy(event.target.value)}>
            <option value="all">كل الأنواع</option>
            {ENERGY_TYPES_AR.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          المحافظة
          <select value={governorate} onChange={(event) => setGovernorate(event.target.value)}>
            <option value="all">كل المحافظات</option>
            {GOVERNORATES_AR.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      <div className="sr-admin-map-kpis">
        <article><strong>{filtered.length}</strong><span>نقطة ضمن الفلاتر</span></article>
        <article><strong>{precise}</strong><span>بإحداثيات دقيقة</span></article>
        <article className={approximate ? "is-warning" : ""}><strong>{approximate}</strong><span>موضع تقريبي بالمحافظة</span></article>
        <article className={missingLocation ? "is-danger" : ""}><strong>{missingLocation}</strong><span>بيانات موقع ناقصة</span></article>
      </div>

      {filtered.length ? (
        <TenderMap tenders={filtered} locale="ar" />
      ) : (
        <p className="sr-state">لا توجد مناقصات مطابقة للفلاتر الحالية.</p>
      )}

      <aside className="sr-admin-map-note">
        <strong>منهجية الموقع</strong>
        <p>
          لإظهار نقطة دقيقة، أدخل خط العرض وخط الطول في سجل المناقصة. عند غيابهما تستخدم الخريطة مركز المحافظة،
          لذلك يجب عدم تفسير النقاط التقريبية كموقع فعلي للمشروع.
        </p>
      </aside>
    </section>
  );
}
