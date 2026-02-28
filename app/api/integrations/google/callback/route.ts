import { NextRequest, NextResponse } from "next/server";
import { googleAuth } from "@/lib/integrations/google";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state"); // client_id
    const error = request.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard/integrations?error=missing-params", request.url)
      );
    }

    await googleAuth.handleCallback(code, state);

    return NextResponse.redirect(
      new URL(
        `/dashboard/integrations?success=google-connected&clientId=${state}`,
        request.url
      )
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=oauth-failed", request.url)
    );
  }
}
