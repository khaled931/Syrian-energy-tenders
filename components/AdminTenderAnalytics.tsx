"use client";

import { useMemo, useState } from "react";
import {
  ENERGY_TYPES_AR,
  GOVERNORATES_AR,
  getTenderDeadlineState,
  normalizeDate,
  STATUS_LABELS_AR,
  Tender,
  TENDER_TYPE_LABELS_AR,
} from "@/lib/types";

type FilterState = {
  status: string;
  energy: string;
  governorate: string;
  tenderType: string;
  dateFrom: string;
  dateTo: string;
};

const emptyFilters: FilterState = {
  status: "all",
  energy: "all",
  governorate: "all",
  tenderType: "all",
  dateFrom: "",
  dateTo: "",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#0f766e",
  closed: "#475467",
  awarded: "#b54708",
  cancelled: "#b42318",
};

function countBy(items: Tender[], selector: (item: Tender) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item) || "غير محدد";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("ar-SY-u-nu-latn", { month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, 1),
  );
}

function TrendChart({ items }: { items: Tender[] }) {
  const points = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
      return { key: formatMonthKey(date), value: 0 };
    });
    const byKey = new Map(months.map((item) => [item.key, item]));
    items.forEach((tender) => {
      const date = normalizeDate(tender.announcement_date);
      if (!date) return;
      const bucket = byKey.get(formatMonthKey(date));
      if (bucket) bucket.value += 1;
    });
    return months;
  }, [items]);

  const max = Math.max(1, ...points.map((point) => point.value));
  const svgPoints = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 92 - (point.value / max) * 72;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="sr-admin-chart sr-admin-trend">
      <div className="sr-admin-chart__head">
        <div>
          <span>اتجاه النشر</span>
          <strong>إعلانات المناقصات خلال آخر 12 شهراً</strong>
        </div>
      </div>
      <svg viewBox="0 0 100 100" role="img" aria-label="اتجاه نشر المناقصات خلال آخر 12 شهراً">
        <polyline className="sr-admin-trend__line" points={svgPoints} vectorEffect="non-scaling-stroke" />
        {points.map((point, index) => {
          const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
          const y = 92 - (point.value / max) * 72;
          return (
            <g key={point.key}>
              <circle className="sr-admin-trend__point" cx={x} cy={y} r="2.1">
                <title>{monthLabel(point.key)}: {point.value}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="sr-admin-trend__labels">
        <span>{monthLabel(points[0].key)}</span>
        <span>{monthLabel(points[points.length - 1].key)}</span>
      </div>
    </div>
  );
}

export default function AdminTenderAnalytics({ tenders }: { tenders: Tender[] }) {
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const filtered = useMemo(() => tenders.filter((tender) => {
    if (filters.status !== "all" && (tender.status || "open") !== filters.status) return false;
    if (filters.energy !== "all" && tender.energy_type !== filters.energy) return false;
    if (filters.governorate !== "all" && tender.governorate !== filters.governorate) return false;
    if (filters.tenderType !== "all" && tender.tender_type !== filters.tenderType) return false;

    const announcement = normalizeDate(tender.announcement_date);
    if (filters.dateFrom) {
      const from = new Date(`${filters.dateFrom}T00:00:00`);
      if (!announcement || announcement < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59`);
      if (!announcement || announcement > to) return false;
    }
    return true;
  }), [filters, tenders]);

  const open = filtered.filter((tender) => (tender.status || "open") === "open").length;
  const awarded = filtered.filter((tender) => tender.status === "awarded").length;
  const closingSoon = filtered.filter((tender) => getTenderDeadlineState(tender, 7).isClosingSoon).length;
  const needsReview = filtered.filter((tender) =>
    ["Low Confidence", "Unverified"].includes(tender.data_quality || "") ||
    !tender.deadline ||
    !tender.source_url,
  ).length;

  const statusData = countBy(filtered, (item) => item.status || "open");
  const energyData = countBy(filtered, (item) => item.energy_type || "غير محدد").slice(0, 8);
  const governorateData = countBy(filtered, (item) => item.governorate || "غير محدد").slice(0, 10);
  const organizationData = countBy(filtered, (item) => item.organization_ar || item.organization_en || "غير محدد").slice(0, 6);

  const totalForStatus = Math.max(1, statusData.reduce((sum, item) => sum + item.value, 0));
  let cursor = 0;
  const donutStops = statusData.map((item) => {
    const start = (cursor / totalForStatus) * 100;
    cursor += item.value;
    const end = (cursor / totalForStatus) * 100;
    return `${STATUS_COLORS[item.label] || "#217a8d"} ${start}% ${end}%`;
  });
  const donutBackground = statusData.length
    ? `conic-gradient(${donutStops.join(", ")})`
    : "conic-gradient(#d0d5dd 0 100%)";

  function updateFilter(name: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="sr-admin-dashboard" aria-label="إحصائيات المناقصات">
      <div className="sr-admin-dashboard__intro">
        <div>
          <span className="sr-eyebrow">تحليل مباشر</span>
          <h2>إحصائيات المناقصات</h2>
          <p>المؤشرات والرسوم أدناه تُحسب مباشرة من السجلات الحالية في Firestore.</p>
        </div>
        <button className="sr-button sr-button--ghost" type="button" onClick={() => setFilters(emptyFilters)}>
          إعادة ضبط الفلاتر
        </button>
      </div>

      <div className="sr-admin-filterbar" aria-label="فلاتر الإحصائيات">
        <label>
          الحالة
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(STATUS_LABELS_AR).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>
          نوع الطاقة
          <select value={filters.energy} onChange={(event) => updateFilter("energy", event.target.value)}>
            <option value="all">كل الأنواع</option>
            {ENERGY_TYPES_AR.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          المحافظة
          <select value={filters.governorate} onChange={(event) => updateFilter("governorate", event.target.value)}>
            <option value="all">كل المحافظات</option>
            {GOVERNORATES_AR.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          نوع الفرصة
          <select value={filters.tenderType} onChange={(event) => updateFilter("tenderType", event.target.value)}>
            <option value="all">كل الفرص</option>
            {Object.entries(TENDER_TYPE_LABELS_AR).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>
          من تاريخ
          <input type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        </label>
        <label>
          إلى تاريخ
          <input type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </label>
      </div>

      <div className="sr-admin-kpis">
        <article><span>السجلات ضمن الفلاتر</span><strong>{filtered.length}</strong><small>من أصل {tenders.length}</small></article>
        <article><span>مفتوحة</span><strong>{open}</strong><small>{filtered.length ? Math.round((open / filtered.length) * 100) : 0}% من النتائج</small></article>
        <article><span>تنتهي خلال 7 أيام</span><strong>{closingSoon}</strong><small>تحتاج متابعة عاجلة</small></article>
        <article><span>تمت الترسية</span><strong>{awarded}</strong><small>حالة Awarded</small></article>
        <article className={needsReview ? "is-warning" : ""}><span>تحتاج مراجعة بيانات</span><strong>{needsReview}</strong><small>مصدر/موعد/ثقة ناقصة</small></article>
      </div>

      <div className="sr-admin-chart-grid">
        <div className="sr-admin-chart sr-admin-donut-card">
          <div className="sr-admin-chart__head">
            <div><span>الحالة</span><strong>توزيع حالة المناقصات</strong></div>
          </div>
          <div className="sr-admin-donut-wrap">
            <div className="sr-admin-donut" style={{ background: donutBackground }}>
              <div><strong>{filtered.length}</strong><span>إجمالي</span></div>
            </div>
            <div className="sr-admin-chart-legend">
              {statusData.map((item) => (
                <button type="button" key={item.label} onClick={() => updateFilter("status", item.label)}>
                  <i style={{ background: STATUS_COLORS[item.label] || "#217a8d" }} />
                  <span>{STATUS_LABELS_AR[item.label] || item.label}</span>
                  <strong>{item.value}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>

        <TrendChart items={filtered} />

        <div className="sr-admin-chart">
          <div className="sr-admin-chart__head">
            <div><span>نوع الطاقة</span><strong>أكثر المجالات نشاطاً</strong></div>
          </div>
          <div className="sr-admin-bars">
            {energyData.map((item) => {
              const max = Math.max(1, energyData[0]?.value || 1);
              return (
                <button type="button" className="sr-admin-bar" key={item.label} onClick={() => updateFilter("energy", item.label)}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sr-admin-chart">
          <div className="sr-admin-chart__head">
            <div><span>التوزيع الجغرافي</span><strong>المناقصات حسب المحافظة</strong></div>
          </div>
          <div className="sr-admin-bars">
            {governorateData.map((item) => {
              const max = Math.max(1, governorateData[0]?.value || 1);
              return (
                <button type="button" className="sr-admin-bar" key={item.label} onClick={() => updateFilter("governorate", item.label)}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${(item.value / max) * 100}%` }} /></div>
                  <strong>{item.value}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sr-admin-chart sr-admin-ranking">
        <div className="sr-admin-chart__head">
          <div><span>الجهات المعلنة</span><strong>أكثر الجهات نشراً ضمن النتائج الحالية</strong></div>
        </div>
        <div className="sr-admin-ranking__grid">
          {organizationData.length ? organizationData.map((item, index) => (
            <article key={item.label}>
              <span>{index + 1}</span>
              <div><strong>{item.label}</strong><small>{item.value} سجل</small></div>
            </article>
          )) : <p className="sr-state">لا توجد بيانات ضمن الفلاتر الحالية.</p>}
        </div>
      </div>
    </section>
  );
}
