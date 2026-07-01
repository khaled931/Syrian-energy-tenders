import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مناقصات الطاقة في سورية | Syrian Renewables",
  description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية.",
  metadataBase: new URL("https://syrianrenewables.com"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
