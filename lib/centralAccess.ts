import "server-only";
import { cookies } from "next/headers";

const CENTRAL_ORIGIN = "https://syrianrenewables.com";

export type CentralAccess = {
  allowed: boolean;
  authenticated: boolean;
  guestItemLimit: number;
  loginUrl: string;
  registerUrl: string;
  reason: string;
};

export async function resolveCentralAccess(service: string, locale: "ar" | "en", fallbackLimit: number): Promise<CentralAccess> {
  const fallbackLogin = new URL(`/${locale}/account/login`, CENTRAL_ORIGIN);
  const fallbackRegister = new URL(`/${locale}/account/register`, CENTRAL_ORIGIN);
  const returnTo = `https://tender.syrianrenewables.com/${locale}`;
  fallbackLogin.searchParams.set("returnTo", returnTo);
  fallbackRegister.searchParams.set("returnTo", returnTo);

  const fallback: CentralAccess = {
    allowed: false,
    authenticated: false,
    guestItemLimit: fallbackLimit,
    loginUrl: fallbackLogin.toString(),
    registerUrl: fallbackRegister.toString(),
    reason: "access_service_unavailable",
  };

  try {
    const cookieStore = await cookies();
    const url = new URL("/api/access", CENTRAL_ORIGIN);
    url.searchParams.set("service", service);
    url.searchParams.set("action", "view_full");
    url.searchParams.set("locale", locale);
    url.searchParams.set("returnTo", returnTo);

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Cookie: cookieStore.toString(),
      },
    });
    if (!response.ok) return fallback;
    const payload = await response.json() as Record<string, unknown>;
    const limit = Number(payload.guest_item_limit);
    return {
      allowed: payload.allowed === true,
      authenticated: payload.authenticated === true,
      guestItemLimit: Number.isSafeInteger(limit) && limit > 0 ? limit : fallbackLimit,
      loginUrl: typeof payload.login_url === "string" ? payload.login_url : fallback.loginUrl,
      registerUrl: typeof payload.register_url === "string" ? payload.register_url : fallback.registerUrl,
      reason: typeof payload.reason === "string" ? payload.reason : "permission_denied",
    };
  } catch {
    // Fail closed so a central-auth outage cannot expand public access.
    return fallback;
  }
}
