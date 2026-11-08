"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminWhatsappCallingInfo, adminWhatsappCalling, adminConnectNumber } from "@/app/(admin)/admin/actions";
import { toast } from "@/lib/toast";

// Admin: let the AI answer this customer's WhatsApp voice calls.
// Shows what Meta requires, switches calling on/off, and can connect a number by hand (test number).
const TIER_OK = (t) => /TIER_(2K|10K|100K|UNLIMITED)/i.test(String(t || ""));

export default function WhatsAppCallsCard({ id, connected, voicePlan }) {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState("");
  const [pnid, setPnid] = useState("");
  const [tok, setTok] = useState("");

  async function load() {
    if (!connected) return;
    setInfo(await adminWhatsappCallingInfo({ id }));
  }
  useEffect(() => { load(); }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(on) {
    setBusy("toggle");
    const r = await adminWhatsappCalling({ id, on });
    setBusy("");
    if (!r?.ok) return toast.error("Meta said no", r?.error);
    toast.success(on ? "WhatsApp calls switched on" : "WhatsApp calls switched off", on ? "Customers now see a call button; the AI answers." : "");
    load();
  }
  async function connect(e) {
    e.preventDefault();
    setBusy("connect");
    const r = await adminConnectNumber({ id, phoneNumberId: pnid, token: tok });
    setBusy("");
    if (!r?.ok) return toast.error("Couldn't connect", r?.error);
    setTok(""); toast.success("Number connected", `${r.number || ""} ${r.name ? "· " + r.name : ""}`);
    router.refresh();
  }

  const on = info?.calling?.status === "ENABLED";
  const tier = info?.phone?.messaging_limit_tier;
  const checks = [
    ["WhatsApp number connected (Cloud API)", connected],
    ["Voice plan with minutes", !!voicePlan],
    ["Messaging limit 2,000+ (test numbers are exempt)", tier ? TIER_OK(tier) : null],
  ];

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text">WhatsApp calls → AI</h2>
          <p className="text-xs text-muted">When someone taps the call button in WhatsApp, the AI receptionist answers. Minutes come from the voice plan.</p>
        </div>
        {connected && info?.ok && (
          on
            ? <button disabled={!!busy} onClick={() => toggle(false)} className="btn-ghost text-sm">{busy === "toggle" ? "…" : "Switch off"}</button>
            : <button disabled={!!busy} onClick={() => toggle(true)} className="btn-brand text-sm">{busy === "toggle" ? "Switching on…" : "Switch on WhatsApp calls"}</button>
        )}
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <ul className="space-y-2">
          {checks.map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${ok === true ? "bg-emerald-50 text-emerald-700" : ok === false ? "bg-red-50 text-red-600" : "bg-canvas text-muted"}`}>{ok === true ? "✓" : ok === false ? "!" : "?"}</span>
              <span className="text-text">{label}</span>
            </li>
          ))}
          {info?.ok && (
            <li className="pt-2 text-xs text-muted">
              Meta: calling <b className={on ? "text-emerald-700" : "text-text"}>{info.calling?.status || "not set"}</b>
              {tier && <> · limit {tier}</>}{info.phone?.platform_type && <> · {info.phone.platform_type}</>}
              {info.settingsError && <span className="block text-red-600">{info.settingsError}</span>}
            </li>
          )}
          {info && !info.ok && <li className="text-xs text-red-600">{info.error}</li>}
        </ul>
        <form onSubmit={connect} className="rounded-2xl border border-line bg-canvas/50 p-4">
          <p className="text-xs font-semibold text-text">Connect a number by hand (e.g. Meta test number)</p>
          <p className="text-[11px] text-muted">Meta App → WhatsApp → API Setup: copy the <b>Phone number ID</b> and an access token.</p>
          <input value={pnid} onChange={(e) => setPnid(e.target.value)} placeholder="Phone number ID" className="field mt-2 text-sm" />
          <input value={tok} onChange={(e) => setTok(e.target.value)} placeholder="Access token" type="password" autoComplete="off" className="field mt-2 text-sm" />
          <button disabled={!!busy || !pnid || !tok} className="btn-brand mt-2 w-full text-sm">{busy === "connect" ? "Checking with Meta…" : "Connect number"}</button>
        </form>
      </div>
    </section>
  );
}
