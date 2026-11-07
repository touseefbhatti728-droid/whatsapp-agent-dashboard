import { adminDb } from "@/lib/admin-db";
import PublicShell from "@/components/PublicShell";
import AcceptQuote from "@/components/AcceptQuote";

export const metadata = { title: "Your quote", robots: { index: false } };
const money = (c, n) => `${c} ${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

// Customer view of a quote or invoice (link sent on WhatsApp).
export default async function QuotePage({ params }) {
  const { token } = await params;
  const db = adminDb();
  const { data: q } = /^[0-9a-f]{32}$/.test(token) ? await db.from("quotes").select("*").eq("token", token).maybeSingle() : { data: null };
  if (!q || q.status === "draft") return <PublicShell title="Link not found"><p className="text-center text-sm text-muted">This link isn't valid.</p></PublicShell>;
  const { data: biz } = await db.from("businesses").select("name, location, payment_instructions").eq("id", q.business_id).maybeSingle();
  const label = q.kind === "invoice" ? "Invoice" : "Quote";

  return (
    <PublicShell title={biz?.name || label} sub={`${label} #${q.number}${q.customer_name ? ` · for ${q.customer_name}` : ""}`}>
      <div className="space-y-5">
        {q.status === "cancelled" && <p className="rounded-lg bg-canvas px-3 py-2 text-center text-sm text-muted">This {label.toLowerCase()} was cancelled.</p>}
        {q.status === "paid" && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-700">Paid — thank you!</p>}
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {(q.items || []).map((i, n) => (
              <tr key={n}><td className="py-2 text-text">{i.name}{i.qty > 1 ? ` × ${i.qty}` : ""}</td><td className="py-2 text-right text-text">{money(q.currency, i.qty * i.price)}</td></tr>
            ))}
            <tr><td className="pt-3 font-semibold text-text">Total</td><td className="pt-3 text-right text-lg font-bold text-text">{money(q.currency, q.total)}</td></tr>
            {q.deposit ? <tr><td className="py-1 text-muted">Deposit to confirm</td><td className="py-1 text-right font-semibold text-text">{money(q.currency, q.deposit)}</td></tr> : null}
          </tbody>
        </table>
        {q.kind === "invoice" && q.due_date && q.status !== "paid" && <p className="text-sm text-muted">Due by <b className="text-text">{new Date(`${q.due_date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</b></p>}
        {q.kind === "quote" && q.valid_until && <p className="text-sm text-muted">Valid until {new Date(`${q.valid_until}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" })}</p>}
        {q.notes && <p className="whitespace-pre-wrap rounded-xl bg-canvas p-3 text-sm text-text">{q.notes}</p>}
        {!["paid", "cancelled"].includes(q.status) && (
          <div className="space-y-3">
            {q.kind === "quote" && <AcceptQuote token={token} accepted={q.status === "accepted"} />}
            {q.payment_link && <a href={q.payment_link} target="_blank" rel="noreferrer" className="btn-brand block w-full py-3 text-center text-sm">Pay {q.deposit ? "deposit" : "now"} online</a>}
            {biz?.payment_instructions && <p className="whitespace-pre-wrap text-center text-xs text-muted">Other ways to pay: {biz.payment_instructions}</p>}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
