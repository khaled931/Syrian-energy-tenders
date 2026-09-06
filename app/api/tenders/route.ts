import { NextRequest, NextResponse } from "next/server";
import { resolveCentralAccess } from "@/lib/centralAccess";
import { isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { listTenders } from "@/lib/tendersServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "firebase_unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  const access = await resolveCentralAccess("energy_tenders", locale, 5);
  const tenders = await listTenders(access.allowed ? undefined : access.guestItemLimit);

  return NextResponse.json(
    {
      tenders,
      access: {
        fullAccess: access.allowed,
        authenticated: access.authenticated,
        guestItemLimit: access.guestItemLimit,
        loginUrl: access.loginUrl,
        registerUrl: access.registerUrl,
        reason: access.reason,
      },
    },
    { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
