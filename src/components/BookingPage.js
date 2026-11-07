"use client";

import { useEffect, useMemo, useState } from "react";
import { BACKEND_URL } from "@/lib/backend";

// Dates in the business's timezone for the next two weeks ("YYYY-MM-DD").
function nextDays(tz, n = 14) {
  const out = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  for (let i = 0; i < n; i++) out.push(fmt.format(new Date(Date.now() + i * 86400000)));
  return out;
}
const dayName = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
const dayNum = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const nice = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

export default function BookingPage({ businessId }) {
  const api = `${BACKEND_URL}/public/${businessId}`;
  const [info, setInfo] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    fetch(`${api}/info`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "This booking page isn't available.");
      setInfo(j);
      if (!j.services.length) setService("");
    }).catch((e) => setLoadErr(e.message));
  }, [api]);

  const days = useMemo(() => (info ? nextDays(info.timezone) : []), [info]);
  const needService = !!info?.services?.length;

  useEffect(() => {
    if (!date || (needService && !service)) return;
    setSlots(null); setTime("");
    fetch(`${api}/slots?date=${date}&service=${encodeURIComponent(service)}`)
      .then((r) => r.json()).then((j) => setSlots(j.slots || [])).catch(() => setSlots([]));
  }, [api, date, service, needService]);

  async function book(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${api}/book`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, service, date, time }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error || "Couldn't book. Please try again.");
        if (r.status === 409) { setTime(""); setSlots(null); fetch(`${api}/slots?date=${date}&service=${encodeURIComponent(service)}`).then((x) => x.json()).then((x) => setSlots(x.slots || [])); }
      } else setDone(j);
    } catch (_) { setErr("Connection problem — please try again."); }
    setBusy(false);
  }

  if (loadErr) return <Shell><p className="text-center text-sm text-muted">{loadErr}</p></Shell>;
  if (!info) return <Shell><p className="text-center text-sm text-muted">Loading…</p></Shell>;

  if (done) {
    return (
      <Shell title={info.name}>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-2xl">✓</div>
          <h2 className="mt-4 text-lg font-semibold text-text">You're booked!</h2>
          <p className="mt-1 text-sm text-muted">{[service, `${dayName(date)} ${dayNum(date)}`, nice(time)].filter(Boolean).join(" · ")}</p>
          {done.ref && <p className="mt-3 text-sm text-text">Your reference: <b>{done.ref}</b></p>}
          {info.whatsapp && (
            <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(`Hi! I booked ${done.ref || "an appointment"} online.`)}`}
              className="btn-brand mt-6 inline-flex px-5 py-2.5 text-sm">Message us on WhatsApp</a>
          )}
          <p className="mt-4 text-xs text-muted">Need to change it? Message us on WhatsApp with your reference.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={info.name} sub={[info.location, info.hours].filter(Boolean).join(" · ")}>
      <form onSubmit={book} className="space-y-6">
        {needService && (
          <Step n={1} label="Choose a service">
            <div className="grid gap-2">
              {info.services.map((s) => (
                <button type="button" key={s.name} onClick={() => setService(s.name)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${service === s.name ? "border-brand bg-brand-tint" : "border-line hover:bg-canvas"}`}>
                  <span className="font-medium text-text">{s.name}</span>
                  <span className="text-muted">{[s.price != null && s.price !== "" ? s.price : null, `${s.duration} min`].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {(!needService || service) && (
          <Step n={needService ? 2 : 1} label="Pick a day">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d) => (
                <button type="button" key={d} onClick={() => setDate(d)}
                  className={`flex min-w-[64px] flex-col items-center rounded-xl border px-3 py-2 text-sm ${date === d ? "border-brand bg-brand-tint" : "border-line hover:bg-canvas"}`}>
                  <span className="text-xs text-muted">{dayName(d)}</span>
                  <span className="font-semibold text-text">{dayNum(d)}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {date && (
          <Step n={needService ? 3 : 2} label="Pick a time">
            {slots === null ? <p className="text-sm text-muted">Checking free times…</p>
              : slots.length === 0 ? <p className="text-sm text-muted">No free times that day — try another day.</p>
              : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((t) => (
                    <button type="button" key={t} onClick={() => setTime(t)}
                      className={`rounded-lg border px-2 py-2 text-sm ${time === t ? "border-brand bg-brand text-white" : "border-line hover:bg-canvas"}`}>{nice(t)}</button>
                  ))}
                </div>
              )}
          </Step>
        )}

        {time && (
          <Step n={needService ? 4 : 3} label="Your details">
            <div className="space-y-3">
              <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
              <input className="field" placeholder="Mobile number with country code, e.g. +971 50 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" />
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button disabled={busy} className="btn-brand w-full py-3 text-sm disabled:opacity-60">{busy ? "Booking…" : `Book ${nice(time)}, ${dayNum(date)}`}</button>
            </div>
          </Step>
        )}
      </form>
    </Shell>
  );
}

function Shell({ title, sub, children }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-lg">
        {title && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
            <p className="mt-1 text-sm text-muted">{sub || "Book your appointment online"}</p>
          </div>
        )}
        <div className="card p-5 sm:p-6">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">Powered by NextReply</p>
      </div>
    </div>
  );
}

function Step({ n, label, children }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-text"><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">{n}</span>{label}</p>
      {children}
    </div>
  );
}
