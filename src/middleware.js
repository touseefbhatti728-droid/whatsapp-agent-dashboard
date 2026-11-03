import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Skip static files, the service worker/manifest and the Stripe webhook (no session needed there).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest|api/stripe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|webmanifest|json)$).*)",
  ],
};
