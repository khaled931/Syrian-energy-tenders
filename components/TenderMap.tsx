"use client";

import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { formatDate, STATUS_LABELS_AR, Tender, TENDER_TYPE_LABELS_AR } from "@/lib/types";

type TenderWithCoordinates = Tender & {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
};

const GOVERNORATE_COORDINATES: Record<string, [number, number]> = {
  "دمشق": [33.5138, 36.2765],
  "ريف دمشق": [33.5167, 36.95],
  "حلب": [36.2021, 37.1343],
  "حمص": [34.7324, 36.7137],
  "حماة": [35.1318, 36.7578],
  "اللاذقية": [35.5317, 35.7901],
  "طرطوس": [34.8959, 35.8867],
  "إدلب": [35.9306, 36.6339],
  "درعا": [32.6189, 36.1021],
  "السويداء": [32.7089, 36.5663],
  "القنيطرة": [33.1259, 35.8246],
  "دير الزور": [35.3359, 40.1408],
  "الرقة": [35.9528, 39.0079],
  "الحسكة": [36.5079, 40.7477],
  "كل سورية": [34.8021, 38.9968],
  "غير محدد": [34.8021, 38.9968],
};

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseCoordinatesFromLocation(location?: string): [number, number] | null {
  if (!location) return null;
  const match = location.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

function getTenderCoordinates(tender: TenderWithCoordinates): [number, number] {
  const explicitLat = safeNumber(tender.latitude ?? tender.lat);
  const explicitLng = safeNumber(tender.longitude ?? tender.lng);
  if (explicitLat !== null && explicitLng !== null) return [explicitLat, explicitLng];

  const parsed = parseCoordinatesFromLocation(tender.location);
  if (parsed) return parsed;

  return GOVERNORATE_COORDINATES[tender.governorate || "غير محدد"] || GOVERNORATE_COORDINATES["غير محدد"];
}

function label(map: Record<string, string>, value?: string) {
  if (!value) return "غير محدد";
  return map[value] || value;
}

function createMarker(status?: string) {
  return L.divIcon({
    className: "sr-map-marker-wrap",
    html: `<span class="sr-map-marker sr-map-marker--${status || "open"}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

export default function TenderMap({ tenders }: { tenders: Tender[] }) {
  const mapTenders = tenders.map((tender) => ({
    tender,
    coords: getTenderCoordinates(tender as TenderWithCoordinates),
  }));

  return (
    <section className="sr-map-shell" aria-label="خريطة المناقصات والعروض في سورية">
      <div className="sr-map-panel">
        <MapContainer center={[34.8021, 38.9968]} zoom={6} minZoom={5} maxZoom={13} scrollWheelZoom className="sr-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {mapTenders.map(({ tender, coords }) => {
            const title = tender.title_ar || tender.title_en || "مناقصة دون عنوان";
            const organization = tender.organization_ar || tender.organization_en || "جهة غير محددة";
            return (
              <Marker key={tender.id || title} position={coords} icon={createMarker(tender.status)}>
                <Popup className="sr-map-popup">
                  <div className="sr-map-card">
                    <div className="sr-map-card__tags">
                      <span className={`sr-status sr-status--${tender.status || "open"}`}>{label(STATUS_LABELS_AR, tender.status)}</span>
                      <span className="sr-type">{label(TENDER_TYPE_LABELS_AR, tender.tender_type)}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{organization}</p>
                    <div className="sr-map-card__meta">
                      <span>{tender.governorate || "غير محدد"}</span>
                      <span>{formatDate(tender.deadline)}</span>
                    </div>
                    {tender.id ? (
                      <Link className="sr-map-card__link" href={`/tenders/${tender.id}`}>
                        عرض التفاصيل
                      </Link>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="sr-map-list" aria-label="قائمة مختصرة للمناقصات على الخريطة">
        {mapTenders.map(({ tender, coords }) => {
          const title = tender.title_ar || tender.title_en || "مناقصة دون عنوان";
          return (
            <Link className="sr-map-list-card" href={`/tenders/${tender.id}`} key={tender.id || title}>
              <span className={`sr-map-dot sr-map-dot--${tender.status || "open"}`} />
              <div>
                <strong>{title}</strong>
                <small>
                  {tender.governorate || "غير محدد"} · {formatDate(tender.deadline)} · {coords[0].toFixed(2)}, {coords[1].toFixed(2)}
                </small>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
