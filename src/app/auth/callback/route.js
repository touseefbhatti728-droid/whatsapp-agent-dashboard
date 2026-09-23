import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Handles the redirect back from Google (and any OAuth provider).
// Exchanges the code for a session, makes sure a business row exists,
// then sends the user to onboarding (or wherever ?next= points).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // ensure this user has a business row (first-time Google signups won't have one)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!biz) {
          await supabase.from("businesses").insert({
            owner_id: user.id,
            name: user.user_metadata?.full_name || user.user_metadata?.name || "My Business",
            status: "active",
          });
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // something went wrong — send back to signup with a flag
  return NextResponse.redirect(`${origin}/signup?error=oauth`);
}