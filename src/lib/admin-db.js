// Server-only: Supabase client with the service-role key, for writes that RLS
// doesn't allow from the owner's session (bookings, messages). Always check
// that the signed-in user owns the business BEFORE using it.
import { createClient } from "@supabase/supabase-js";

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
