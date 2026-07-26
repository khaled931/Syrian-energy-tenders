"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type SVGProps } from "react";
import {
  PLATFORM_LOGO,
  PLATFORM_MAIN_SITE,
  platformBrand,
  platformNavigation,
  resolvePlatformHref,
  type PlatformLocale,
  type PlatformNavigationItem,
} from "@/lib/platform";

type PlatformContextValue = {
  locale: PlatformLocale;
  setLocale: (locale: PlatformLocale) => void;
};

const PlatformContext = createContext<PlatformContextValue>({ locale: "ar", setLocale: () => undefined });

export function usePlatform() {
  return useContext(PlatformContext);
}

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

const ChevronIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="m6 9 6 6 6-6" /></Icon>;
const ExternalIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Icon>;
const MenuIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></Icon>;
const CloseIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>;
const MoonIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></Icon>;
const SunIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.42 1.42" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></Icon>;
const MailIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Icon>;
const SendIcon = (props: SVGProps<SVGSVGElement>) => <Icon {...props}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon>;

const socialMarks: Record<string, string> = {
  linkedin: "in",
  facebook: "f",
  x: "X",
  instagram: "◎",
  youtube: "▶",
  tiktok: "♪",
  whatsapp: "WA",
};

function OfficialLogo({ footer = false }: { footer?: boolean }) {
  return (
    <span className={footer ? "sr-platform-footer-logo" : "sr-platform-logo-plate"}>
      {/* The exact canonical asset is served by the new main website; the local legacy asset is only a network fallback. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PLATFORM_LOGO}
        alt="Syrian Renewables — بوابة الطاقة المتجددة في سورية"
        width="217"
        height="298"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/syrian-renewables-logo.svg";
        }}
      />
    </span>
  );
}

function PlatformHeader({ locale, setLocale }: PlatformContextValue) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  function closeNavigation() {
    setMobileOpen(false);
    setExpandedKey(null);
  }

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeNavigation();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNavigation();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
    };
  }, []);

  function renderItem(item: PlatformNavigationItem, child = false, submenuId?: string) {
    const hasChildren = Boolean(item.children?.length);
    const expanded = expandedKey === item.key;
    const active = item.key === "energy-tenders" || item.children?.some((entry) => entry.key === "energy-tenders");
    const className = `sr-platform-nav-link ${child ? "sr-platform-child-link" : "sr-platform-top-link"} ${active ? "is-active" : ""}`;

    if (!item.href) {
      return (
        <button
          className={className}
          type="button"
          aria-haspopup={hasChildren ? "true" : undefined}
          aria-expanded={hasChildren ? expanded : undefined}
          aria-controls={hasChildren ? submenuId : undefined}
          onClick={() => hasChildren && setExpandedKey((current) => current === item.key ? null : item.key)}
        >
          <span>{item.label[locale]}</span>
          {hasChildren ? <ChevronIcon className="sr-platform-chevron" width="16" height="16" /> : null}
        </button>
      );
    }

    const href = resolvePlatformHref(item.href, locale);
    return (
      <a
        className={className}
        href={href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        aria-current={item.key === "energy-tenders" ? "page" : undefined}
        onClick={closeNavigation}
      >
        <span>{item.label[locale]}</span>
        {item.external && child ? <ExternalIcon className="sr-platform-external" width="13" height="13" /> : null}
      </a>
    );
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { window.localStorage.setItem("sr-theme", next); } catch { /* current-page theme still works */ }
  }

  return (
    <header ref={headerRef} className="sr-platform-header">
      <div className="sr-platform-shell sr-platform-header-inner">
        <a className="sr-platform-brand" href={`${PLATFORM_MAIN_SITE}/${locale}`} aria-label={platformBrand.name[locale]} onClick={closeNavigation}>
          <OfficialLogo />
        </a>

        <nav id="sr-primary-navigation" className={`sr-platform-nav ${mobileOpen ? "is-open" : ""}`} aria-label={locale === "ar" ? "التنقل الرئيسي" : "Main navigation"}>
          {platformNavigation.map((item, index) => {
            const submenuId = item.children?.length ? `sr-platform-submenu-${index}` : undefined;
            const expanded = expandedKey === item.key;
            return (
              <div className={`sr-platform-nav-item ${expanded ? "is-expanded" : ""}`} key={item.key}>
                {renderItem(item, false, submenuId)}
                {item.children?.length ? (
                  <div id={submenuId} className="sr-platform-dropdown" aria-label={item.label[locale]}>
                    {item.children.map((child) => <div key={child.key}>{renderItem(child, true)}</div>)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sr-platform-tools">
          <button
            className="sr-platform-language"
            type="button"
            aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
            onClick={() => {
              closeNavigation();
              setLocale(locale === "ar" ? "en" : "ar");
            }}
          >
            {locale === "ar" ? "EN" : "ع"}
          </button>
          <button className="sr-platform-icon-button" type="button" onClick={toggleTheme} aria-label={locale === "ar" ? "تبديل الوضع اللوني" : "Toggle color theme"}>
            <MoonIcon className="sr-theme-icon sr-theme-icon-moon" width="18" height="18" />
            <SunIcon className="sr-theme-icon sr-theme-icon-sun" width="18" height="18" />
          </button>
          <button
            className="sr-platform-menu-button"
            type="button"
            aria-controls="sr-primary-navigation"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? (locale === "ar" ? "إغلاق القائمة" : "Close menu") : (locale === "ar" ? "فتح القائمة" : "Open menu")}
            onClick={() => {
              setMobileOpen((current) => !current);
              if (mobileOpen) setExpandedKey(null);
            }}
          >
            {mobileOpen ? <CloseIcon width="22" height="22" /> : <MenuIcon width="22" height="22" />}
          </button>
        </div>
      </div>
    </header>
  );
}

function PlatformFooter({ locale }: { locale: PlatformLocale }) {
  const footerLinks = [
    { href: "/", label: { ar: "الصفحة الرئيسية", en: "Home" } },
    { href: "/news", label: { ar: "أخبار الطاقة في سورية", en: "Syria Energy News" } },
    { href: "/about-us", label: { ar: "من نحن", en: "Who We Are" } },
    { href: "/contact", label: { ar: "تواصل معنا", en: "Contact Us" } },
    { href: "/privacy-policy", label: { ar: "سياسة الخصوصية", en: "Privacy Policy" } },
  ];

  return (
    <footer className="sr-platform-footer">
      <div className="sr-platform-shell sr-platform-footer-grid">
        <section className="sr-platform-footer-brand">
          <a href={`${PLATFORM_MAIN_SITE}/${locale}`} aria-label={platformBrand.name[locale]}><OfficialLogo footer /></a>
          <p>{locale === "ar" ? "منصة مستقلة للبيانات والتحليل والأخبار المتخصصة بقطاع الطاقة السوري." : "An independent platform for data, analysis, and specialist reporting on Syria’s energy sector."}</p>
          <a className="sr-platform-footer-email" href={`mailto:${platformBrand.email}`}><MailIcon width="18" height="18" />{platformBrand.email}</a>
        </section>

        <section>
          <h3>{locale === "ar" ? "روابط المنصة" : "Platform"}</h3>
          <div className="sr-platform-footer-links">
            {footerLinks.map((item) => <a key={item.href} href={resolvePlatformHref(item.href, locale)}>{item.label[locale]}</a>)}
          </div>
        </section>

        <section className="sr-platform-newsletter">
          <SendIcon width="24" height="24" />
          <h3>{locale === "ar" ? "اشترك في النشرة" : "Subscribe to the newsletter"}</h3>
          <p>{locale === "ar" ? "ملخصات وتحليلات وتقارير دورية تصل مباشرة إلى بريدك." : "Periodic briefs, analysis, and reports delivered to your inbox."}</p>
          <a className="sr-platform-subscribe" href={platformBrand.newsletter} target="_blank" rel="noopener noreferrer">{locale === "ar" ? "صفحة الاشتراك" : "Subscribe"}</a>
        </section>
      </div>

      <div className="sr-platform-shell sr-platform-footer-bottom">
        <div className="sr-platform-socials">
          {Object.entries(platformBrand.social).map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={key}><span aria-hidden="true">{socialMarks[key]}</span></a>
          ))}
        </div>
        <p>© {new Date().getFullYear()} Syrian Renewables · Norway organization no. {platformBrand.organizationNumber}</p>
      </div>
    </footer>
  );
}

export default function PlatformShell({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<PlatformLocale>("ar");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sr-locale");
      if (saved === "ar" || saved === "en") setLocaleState(saved);
    } catch { /* Arabic remains the safe default */ }
  }, []);

  function setLocale(next: PlatformLocale) {
    setLocaleState(next);
    try { window.localStorage.setItem("sr-locale", next); } catch { /* current-page locale still works */ }
  }

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  return (
    <PlatformContext.Provider value={{ locale, setLocale }}>
      <a className="sr-platform-skip" href="#main-content">{locale === "ar" ? "انتقل إلى المحتوى الرئيسي" : "Skip to main content"}</a>
      <PlatformHeader locale={locale} setLocale={setLocale} />
      <div id="main-content" dir={locale === "ar" ? "rtl" : "ltr"}>{children}</div>
      <PlatformFooter locale={locale} />
    </PlatformContext.Provider>
  );
}
