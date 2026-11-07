import { adminDb } from "@/lib/admin-db";
import PublicShell from "@/components/PublicShell";
import IntakeForm from "@/components/IntakeForm";

export const metadata = { title: "Before your appointment", robots: { index: false } };

export default async function IntakePage({ params }) {
  const { token } = await params;
  const db = adminDb();
  const { data: row } = /^[0-9a-f]{32}$/.test(token)
    ? await db.from("intake_responses").select("business_id, booking_id, customer_name, answers, submitted_at").eq("token", token).maybeSingle()
    : { data: null };
  if (!row) return <PublicShell title="Link not found"><p className="text-center text-sm text-muted">This form link isn't valid.</p></PublicShell>;
  const [{ data: biz }, { data: booking }] = await Promise.all([
    db.from("businesses").select("name, timezone, intake_form").eq("id", row.business_id).maybeSingle(),
    row.booking_id ? db.from("bookings").select("service, start_time").eq("id", row.booking_id).maybeSingle() : { data: null },
  ]);
  const when = booking?.start_time
    ? new Date(booking.start_time).toLocaleString("en-GB", { timeZone: biz?.timezone || "Asia/Dubai", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null;
  const form = Array.isArray(biz?.intake_form) ? biz.intake_form : [];

  return (
    <PublicShell title={biz?.name || "Your appointment"} sub={[booking?.service, when].filter(Boolean).join(" · ") || "A few questions before your visit"}>
      {form.length === 0
        ? <p className="text-center text-sm text-muted">Nothing to fill in — see you soon!</p>
        : <IntakeForm token={token} form={form} initial={row.answers || {}} done={!!row.submitted_at} />}
    </PublicShell>
  );
}
