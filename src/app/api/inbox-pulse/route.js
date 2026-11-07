import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

// Tiny "anything new?" check the dashboard polls every few seconds: the newest message
// for the business you're working on. The page only reloads its data when this changes.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const biz = await getActiveBusiness(user.id);
  if (!biz) return NextResponse.json({ last: null });
  const { data } = await supabase.from("messages").select("id, role, customer_phone, content, created_at")
    .eq("business_id", biz.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json(
    { last: data ? { id: data.id, at: data.created_at, role: data.role, phone: data.customer_phone, text: String(data.content || "").slice(0, 120) } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
