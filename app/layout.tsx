import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./mobile-map.css";

export const metadata: Metadata = {
  title: "مناقصات الطاقة في سورية | Syrian Renewables",
  description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية.",
  metadataBase: new URL("https://syrianrenewables.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <a
          className="sr-platform-logo"
          href="https://syrianrenewables.com/"
          aria-label="الانتقال إلى الصفحة الرئيسية لمنصة Syrian Renewables"
        >
          <img src="/syrian-renewables-logo.svg" alt="Syrian Renewables" />
        </a>
        {children}
      </body>
    </html>
  );
}
