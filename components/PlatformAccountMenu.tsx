"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PLATFORM_MAIN_SITE, type PlatformLocale } from "@/lib/platform";

type Session = { authenticated: boolean; displayName?: string | null; plan?: string };

export default function PlatformAccountMenu({ locale }: { locale: PlatformLocale }) {
  const [session, setSession] = useState<Session | null>(null);
  const [returnTo, setReturnTo] = useState(`https://tender.syrianrenewables.com/?lang=${locale}`);
  const pathname = usePathname();
  const isArabic = locale === "ar";
  useEffect(() => {
    const target = new URL(window.location.pathname + window.location.search + window.location.hash, "https://tender.syrianrenewables.com");
    target.searchParams.set("lang", locale);
    setReturnTo(target.toString());
  }, [locale, pathname]);
  useEffect(() => {
    let controller: AbortController | undefined;
    const refresh = () => {
      controller?.abort();
      controller = new AbortController();
      // The central endpoint already allows credentialed requests from platform
      // subdomains. Keep the session in memory; never cache tokens or email.
      fetch(`${PLATFORM_MAIN_SITE}/api/account/session`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
      }).then(async (response): Promise<Session> => {
        if (!response.ok) return { authenticated: false };
        const value = await response.json();
        return {
          authenticated: value.authenticated === true,
          displayName: typeof value.displayName === "string" ? value.displayName : null,
          plan: typeof value.plan === "string" ? value.plan : undefined,
        };
      }).then(setSession).catch((error) => {
        if (error.name !== "AbortError") setSession({ authenticated: false });
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller?.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  const href = new URL(`/${locale}/account${session?.authenticated ? "" : "/login"}`, PLATFORM_MAIN_SITE);
  if (!session?.authenticated) href.searchParams.set("returnTo", returnTo);
  const label = session?.authenticated ? session.displayName || (isArabic ? "حسابي" : "Account") : (isArabic ? "دخول" : "Sign in");
  return (
    <a href={href.toString()} className="sr-platform-account"
      aria-label={session?.authenticated ? (isArabic ? "فتح حسابي" : "Open my account") : (isArabic ? "تسجيل الدخول أو إنشاء حساب مجاني" : "Sign in or create a free account")}
      title={session?.authenticated ? label : (isArabic ? "تسجيل الدخول / حساب مجاني" : "Sign in / Free account")}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>
      <span className="sr-platform-account-label">{session === null ? (isArabic ? "حساب" : "Account") : label}</span>
      {session?.authenticated && session.plan === "free" ? <span className="sr-platform-account-badge">Free</span> : null}
    </a>
  );
}
