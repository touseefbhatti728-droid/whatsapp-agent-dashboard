import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// One auth + profile lookup per request, shared by layouts and pages
// (React cache dedupes calls inside the same server render).
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getIsAdmin = cache(async (userId) => {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true;
});

export const MANAGE_COOKIE = "nr_manage_biz";

// The business every customer page works on:
//  - owners: their own business
//  - admins: the customer they chose with "Manage as customer" (cookie), else their own.
export const getActiveBusiness = cache(async (userId) => {
  if (!userId) return null;
  if (await getIsAdmin(userId)) {
    const id = (await cookies()).get(MANAGE_COOKIE)?.value;
    if (id) {
      const supabase = await createClient();
      const { data } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle();
      if (data) return { ...data, _managed: true };
    }
  }
  return getMyBusiness(userId);
});

// The signed-in owner's own business. Admins can read every business through RLS,
// so always filter by owner_id instead of taking the first visible row.
export const getMyBusiness = cache(async (userId) => {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data || null;
});
