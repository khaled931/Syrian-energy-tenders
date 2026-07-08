import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./mobile-map.css";
import "./deadline-warning.css";
import "./logo-header.css";
import "./card-density.css";
import "./theme-toggle.css";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
  fallback: ["Cairo", "Segoe UI", "Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "مناقصات الطاقة في سورية | Syrian Renewables",
  description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية.",
  metadataBase: new URL("https://syrianrenewables.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={ibmPlexSansArabic.className}>
        <a className="sr-platform-logo" href="https://syrianrenewables.com/" aria-label="العودة إلى الصفحة الرئيسية لمنصة بوابة الطاقة المتجددة في سورية">
          <span>العودة إلى الصفحة الرئيسية</span>
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
