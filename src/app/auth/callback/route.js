import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Handles the redirect back from Google (and any OAuth provider) and from the
// signup confirmation email. Exchanges the code for a session, makes sure a
// business row exists, then sends the user to onboarding (or wherever ?next= points).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only same-site paths: "/x" is fine, "//evil.com" or "@evil.com" is not.
  const rawNext = searchParams.get("next") || "/onboarding";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ensure this user has a business row (first-time Google / email-confirm signups won't have one)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!biz) {
          const meta = user.user_metadata || {};
          await supabase.from("businesses").insert({
            owner_id: user.id,
            name: meta.business_name || meta.full_name || meta.name || "My Business",
            owner_email: user.email || null,
            status: "active",
          });
          // A brand-new account always starts with setup
          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // something went wrong — send back to signup with a flag
  return NextResponse.redirect(`${origin}/signup?error=oauth`);
}
