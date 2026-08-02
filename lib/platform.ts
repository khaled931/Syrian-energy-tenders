export type PlatformLocale = "ar" | "en";

export interface PlatformNavigationItem {
  key: string;
  label: { ar: string; en: string };
  href?: string;
  external?: boolean;
  openInNewTab?: boolean;
  children?: PlatformNavigationItem[];
}

export const PLATFORM_MAIN_SITE = "https://www.syrian-renewables.com";
export const PLATFORM_LOGO = `${PLATFORM_MAIN_SITE}/brand/syrian-renewables-logo-fixed.svg`;

export const platformBrand = {
  name: { ar: "بوابة الطاقة المتجددة في سورية", en: "Syrian Renewables" },
  email: "khaled.alassad@syrianrenewables.com",
  newsletter: "https://syrian-renewables.kit.com/newsletterlandpage",
  organizationNumber: "920833128",
  social: {
    linkedin: "https://www.linkedin.com/company/syrianrenewables/",
    facebook: "https://www.facebook.com/syrianrenewables",
    x: "https://x.com/SyrianRenew",
    instagram: "https://www.instagram.com/syrianrenewables/",
    youtube: "https://www.youtube.com/channel/UCRWZ3b0AR9QcYcsRMRZs68w",
    tiktok: "https://www.tiktok.com/@syrianrenewables?_r=1&_t=ZN-977WRXV1gak",
    whatsapp: "https://whatsapp.com/channel/0029VayODloK5cD9gUAPoj0m",
  },
};

export const platformNavigation: PlatformNavigationItem[] = [
  { key: "home", href: "/", label: { ar: "الصفحة الرئيسية", en: "Home" } },
  { key: "news", href: "/news", label: { ar: "أخبار الطاقة في سورية", en: "Syria Energy News" } },
  {
    key: "renewables",
    label: { ar: "الطاقات المتجددة", en: "Renewable Energy" },
    children: [
      { key: "storage-batteries", href: "/storage-and-batteries", label: { ar: "أنظمة التخزين والبطاريات", en: "Storage Systems & Batteries" } },
      { key: "solar-energy", href: "/solar-energy", label: { ar: "الطاقة الشمسية", en: "Solar Energy" } },
      { key: "wind-energy", href: "/wind-energy", label: { ar: "طاقة الرياح", en: "Wind Energy" } },
      { key: "hydropower", href: "/hydropower", label: { ar: "الطاقة الكهرومائية", en: "Hydropower" } },
      { key: "biogas", href: "/biogas", label: { ar: "الغاز الحيوي", en: "Biogas" } },
    ],
  },
  {
    key: "services",
    label: { ar: "خدماتنا", en: "Our Services" },
    children: [
      { key: "project-tracker", href: "https://projects.syrianrenewables.com/", external: true, openInNewTab: true, label: { ar: "متتبع مشاريع الطاقة", en: "Energy Project Tracker" } },
      { key: "ev-map", href: "https://ev.syrianrenewables.com/", external: true, openInNewTab: true, label: { ar: "خريطة شواحن السيارات الكهربائية", en: "EV Charging Map" } },
      { key: "policy-tracker", href: "https://policies.syrianrenewables.com/", external: true, openInNewTab: true, label: { ar: "متتبع سياسات الطاقة", en: "Energy Policy Tracker" } },
      { key: "energy-tenders", href: "https://syrian-energy-tenders.vercel.app/", external: true, label: { ar: "متتبع مناقصات الطاقة", en: "Energy Tenders Tracker" } },
      { key: "ninja-simulator", href: "https://syr-res-ninja-app.vercel.app/", external: true, openInNewTab: true, label: { ar: "محاكاة الطاقة الشمسية والريحية في سورية", en: "Solar and Wind Energy Simulation in Syria" } },
      { key: "major-projects", href: "https://major-projects.syrianrenewables.com/", external: true, openInNewTab: true, label: { ar: "مشاريع كبرى", en: "Major Projects" } },
    ],
  },
  {
    key: "official-institutions",
    label: { ar: "هيئات ومؤسسات رسمية", en: "Official Institutions" },
    children: [
      { key: "ministry-energy", href: "/ministry-of-energy", label: { ar: "وزارة الطاقة السورية", en: "Syrian Ministry of Energy" } },
      { key: "syrian-petroleum-company", href: "/syrian-petroleum-company", label: { ar: "الشركة السورية للبترول", en: "Syrian Petroleum Company" } },
      { key: "syrian-electricity-company", href: "/syrian-electricity-company", label: { ar: "الشركة السورية للكهرباء", en: "Syrian Electricity Company" } },
      { key: "renewable-energy-support-fund", href: "/renewable-energy-support-fund", label: { ar: "صندوق دعم الطاقات المتجددة", en: "Renewable Energy Support Fund" } },
      { key: "nerc", href: "/nerc", label: { ar: "المركز الوطني لبحوث الطاقة NERC", en: "National Energy Research Center (NERC)" } },
    ],
  },
  {
    key: "about-platform",
    label: { ar: "عن المنصة", en: "About the Platform" },
    children: [
      { key: "about-us", href: "/about-us", label: { ar: "من نحن", en: "Who We Are" } },
      { key: "contact", href: "/contact", label: { ar: "تواصل معنا", en: "Contact Us" } },
      { key: "join-team", href: "/join-our-team", label: { ar: "انضم إلى فريقنا", en: "Join Our Team" } },
      { key: "privacy-policy", href: "/privacy-policy", label: { ar: "سياسة الخصوصية", en: "Privacy Policy" } },
      { key: "partnerships", href: "/partnerships", label: { ar: "شراكات", en: "Partnerships" } },
    ],
  },
];

export function resolvePlatformHref(href: string, locale: PlatformLocale) {
  if (/^https?:\/\//i.test(href)) return href;
  const path = href === "/" ? "" : href.startsWith("/") ? href : `/${href}`;
  return `${PLATFORM_MAIN_SITE}/${locale}${path}`;
}
