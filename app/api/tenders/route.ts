import { NextRequest, NextResponse } from "next/server";
import { resolveCentralAccess } from "@/lib/centralAccess";
import { isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { listTenders } from "@/lib/tendersServer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const access = await resolveCentralAccess("energy_tenders", locale, 5);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const accessPayload = {
    fullAccess: access.allowed,
    authenticated: access.authenticated,
    guestItemLimit: access.guestItemLimit,
    loginUrl: access.loginUrl,
    registerUrl: access.registerUrl,
    reason: access.reason,
  };

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        tenders: [],
        dataAvailable: false,
        error: "firebase_admin_not_configured",
        access: accessPayload,
      },
      { headers },
    );
  }

  try {
    const tenders = await listTenders(access.allowed ? undefined : access.guestItemLimit);

    return NextResponse.json(
      {
        tenders,
        dataAvailable: true,
        access: accessPayload,
      },
      { headers },
    );
  } catch (error) {
    console.error("[tenders-api] Failed to read tenders from Firestore", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        tenders: [],
        dataAvailable: false,
        error: "firebase_admin_read_failed",
        access: accessPayload,
      },
      { headers },
    );
  }
}
