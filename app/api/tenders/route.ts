import { NextRequest, NextResponse } from "next/server";
import { resolveCentralAccess } from "@/lib/centralAccess";
import { isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { listTenders } from "@/lib/tendersServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const access = await resolveCentralAccess("energy_tenders", locale, 5);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

  // A missing Firebase Admin configuration must never expand access, but it also
  // should not turn a normal page load into a failing browser request. Return an
  // empty, fail-closed dataset with the central membership context intact.
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        tenders: [],
        dataAvailable: false,
        access: {
          fullAccess: access.allowed,
          authenticated: access.authenticated,
          guestItemLimit: access.guestItemLimit,
          loginUrl: access.loginUrl,
          registerUrl: access.registerUrl,
          reason: access.reason,
        },
      },
      { headers },
    );
  }

  const tenders = await listTenders(access.allowed ? undefined : access.guestItemLimit);

  return NextResponse.json(
    {
      tenders,
      dataAvailable: true,
      access: {
        fullAccess: access.allowed,
        authenticated: access.authenticated,
        guestItemLimit: access.guestItemLimit,
        loginUrl: access.loginUrl,
        registerUrl: access.registerUrl,
        reason: access.reason,
      },
    },
    { headers },
  );
}
