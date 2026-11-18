import navigationSnapshot from "./platform-navigation-fallback.json";

export type PlatformLocale = "ar" | "en";

export interface PlatformNavigationItem {
  key: string;
  label: { ar: string; en: string };
  href?: string;
  external?: boolean;
  openInNewTab?: boolean;
  children?: PlatformNavigationItem[];
}

export const PLATFORM_MAIN_SITE = "https://syrianrenewables.com";
export const PLATFORM_LOGO = "/syrian-renewables-logo.svg";

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

/** Snapshot of the official navigation API; used only if the central source fails. */
export const platformNavigationByLocale: Record<PlatformLocale, PlatformNavigationItem[]> = {
  ar: parsePlatformNavigation({ items: navigationSnapshot.ar }),
  en: parsePlatformNavigation({ items: navigationSnapshot.en }),
};
export const platformNavigation = platformNavigationByLocale.ar;

export function parsePlatformNavigation(payload: unknown): PlatformNavigationItem[] {
  if (!payload || typeof payload !== "object" || !("items" in payload) || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 20) {
    throw new Error("Invalid platform navigation");
  }
  const keys = new Set<string>();
  function parse(value: unknown, depth = 0): PlatformNavigationItem {
    if (!value || typeof value !== "object" || depth > 1) throw new Error("Invalid navigation entry");
    const item = value as Record<string, unknown>;
    const label = item.label as Record<string, unknown> | undefined;
    if (typeof item._key !== "string" || !item._key || keys.has(item._key) || !label || typeof label.ar !== "string" || typeof label.en !== "string") throw new Error("Invalid navigation label/key");
    keys.add(item._key);
    let href: string | undefined;
    if (item.href !== undefined) {
      if (typeof item.href !== "string" || !item.href) throw new Error("Invalid navigation URL");
      if (item.href.startsWith("/") && !item.href.startsWith("//") && !item.href.includes("\\")) href = item.href;
      else {
        const url = new URL(item.href);
        if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Unsafe navigation URL");
        href = item.href;
      }
    }
    let children: PlatformNavigationItem[] | undefined;
    if (item.children !== undefined) {
      if (!Array.isArray(item.children) || item.children.length > 80) throw new Error("Invalid navigation children");
      children = item.children.map((child) => parse(child, depth + 1));
    }
    if (!href && !children?.length) throw new Error("Empty navigation entry");
    return { key: item._key, label: { ar: label.ar, en: label.en }, href, external: item.external === true, openInNewTab: item.openInNewTab === true, children };
  }
  return payload.items.map((item) => parse(item));
}

export function resolvePlatformHref(href: string, locale: PlatformLocale) {
  if (/^https?:\/\//i.test(href)) return href;
  if (/^\/(ar|en)(?=\/|$)/.test(href)) return `${PLATFORM_MAIN_SITE}${href.replace(/^\/(ar|en)(?=\/|$)/, `/${locale}`)}`;
  const path = href === "/" ? "" : href.startsWith("/") ? href : `/${href}`;
  return `${PLATFORM_MAIN_SITE}/${locale}${path}`;
}
