import type { Metadata } from "next";
import PlatformShell from "@/components/PlatformShell";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./platform-shell.css";
import "./mobile-map.css";
import "./deadline-warning.css";

const themeScript = `(() => {
  try {
    const saved = localStorage.getItem('sr-theme');
    const theme = saved === 'dark' || saved === 'light'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (_) {}
})();`;

export const metadata: Metadata = {
  title: "مناقصات الطاقة في سورية | Syrian Renewables",
  description: "منصة معلوماتية لتتبع مناقصات ومزايدات وعروض الطاقة والكهرباء والطاقة المتجددة في سورية.",
  metadataBase: new URL("https://syrian-energy-tenders.vercel.app"),
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
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body><PlatformShell>{children}</PlatformShell></body>
    </html>
  );
}
