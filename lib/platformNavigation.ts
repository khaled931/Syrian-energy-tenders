import "server-only";
import { parsePlatformNavigation, platformNavigationByLocale, PLATFORM_MAIN_SITE, type PlatformLocale } from "./platform";

/** Public navigation is cached; account/session data never enters this cache. */
export async function getPlatformNavigation(locale: PlatformLocale, request: typeof fetch = fetch) {
  const fallback = platformNavigationByLocale[locale];
  if (process.env.PLATFORM_NAVIGATION_USE_SNAPSHOT === "1") return fallback;
  try {
    const response = await request(`${PLATFORM_MAIN_SITE}/api/platform-navigation?locale=${locale}`, {
      headers: { Accept: "application/json" }, next: { revalidate: 300 }, signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return fallback;
    return parsePlatformNavigation(await response.json());
  } catch { return fallback; }
}

export async function getPlatformNavigationSet() {
  const [ar, en] = await Promise.all([getPlatformNavigation("ar"), getPlatformNavigation("en")]);
  return { ar, en };
}
