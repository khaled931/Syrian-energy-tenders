import type { Metadata } from "next";
import PlatformShell from "@/components/PlatformShell";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./platform-shell.css";
import "./mobile-map.css";
import "./deadline-warning.css";
import "./membership.css";

const bootstrapScript = `(() => {
  try {
    const url = new URL(window.location.href);
    const requestedLocale = url.searchParams.get('lang');
    if (requestedLocale === 'ar' || requestedLocale === 'en') {
      localStorage.setItem('sr-locale', requestedLocale);
      url.searchParams.delete('lang');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    const locale = localStorage.getItem('sr-locale') === 'en' ? 'en' : 'ar';
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

    const savedTheme = localStorage.getItem('sr-theme');
    const theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  title: "مناقصات الطاقة في سورية | Syrian Renewables",
  description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية.",
  metadataBase: new URL("https://tender.syrianrenewables.com"),
  openGraph: {
    type: "website",
    siteName: "Syrian Renewables",
    title: "مناقصات الطاقة في سورية | Syrian Renewables",
    description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة في سورية.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: bootstrapScript }} /></head>
      <body><PlatformShell>{children}</PlatformShell></body>
    </html>
  );
}
