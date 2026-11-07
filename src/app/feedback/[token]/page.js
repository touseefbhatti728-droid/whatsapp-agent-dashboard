import { adminDb } from "@/lib/admin-db";
import PublicShell from "@/components/PublicShell";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata = { title: "How was your visit?", robots: { index: false } };

export default async function FeedbackPage({ params }) {
  const { token } = await params;
  const db = adminDb();
  const { data: fb } = /^[0-9a-f]{32}$/.test(token)
    ? await db.from("feedback").select("business_id, customer_name, service, staff_name, answered_at").eq("token", token).maybeSingle()
    : { data: null };
  if (!fb) return <PublicShell title="Link not found"><p className="text-center text-sm text-muted">This feedback link isn't valid.</p></PublicShell>;
  const { data: biz } = await db.from("businesses").select("name").eq("id", fb.business_id).maybeSingle();
  return (
    <PublicShell title={biz?.name || "Your visit"} sub={[fb.service, fb.staff_name && `with ${fb.staff_name}`].filter(Boolean).join(" · ")}>
      {fb.answered_at
        ? <p className="text-center text-sm text-muted">Thank you — we already have your feedback 🙏</p>
        : <FeedbackForm token={token} name={fb.customer_name} />}
    </PublicShell>
  );
}
