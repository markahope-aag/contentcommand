import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { csrfCheck } from "@/lib/security";

export async function middleware(request: NextRequest) {
  // CSRF protection for state-changing API requests
  const csrfResponse = csrfCheck(request);
  if (csrfResponse) return csrfResponse;

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
