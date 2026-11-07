"use client";

import { useEffect, useMemo, useState } from "react";
import { BACKEND_URL } from "@/lib/backend";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const utcDay = (d) => new Date(`${d}T12:00:00Z`);
const dayNum = (d) => utcDay(d).getUTCDate();
const monthName = (d) => utcDay(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const longDay = (d) => utcDay(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const nice = (t) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

// Two weeks of dates in the business's timezone, laid out Monday-first.
function calendar(tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const today = fmt.format(new Date());
  const lead = (utcDay(today).getUTCDay() + 6) % 7; // blanks before today in a Mon-first grid
  const days = [];
  for (let i = 0; i < 14; i++) days.push(fmt.format(new Date(Date.now() + i * 86400000)));
  return { today, cells: [...Array(lead).fill(null), ...days] };
}

export default function BookingPage({ businessId, displayName, embed: embedProp }) {
  const api = `${BACKEND_URL}/public/${businessId}`;
  const [embed, setEmbed] = useState(!!embedProp);
  const [info, setInfo] = useState(null);
  const [loadErr, setLoadErr] = useState("");
  const [service, setService] = useState("");
  const [staff, setStaff] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState(null);
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => { try { if (window.self !== window.top) setEmbed(true); } catch (_) { setEmbed(true); } }, []);
  useEffect(() => {
    fetch(`${api}/info`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Online booking isn't available right now.");
      setInfo(j);
    }).catch((e) => setLoadErr(e.message));
  }, [api]);

  const title = displayName || info?.name || "Book an appointment";
  const cal = useMemo(() => (info ? calendar(info.timezone) : null), [info]);
  const needService = !!info?.services?.length;
  const svc = info?.services?.find((s) => s.name === service);
  const people = (info?.staff || []).filter((m) => !m.services?.length || !service || m.services.some((s) => s.toLowerCase() === service.toLowerCase()));
  const qs = () => `date=${date}&service=${encodeURIComponent(service)}${staff ? `&staff=${encodeURIComponent(staff)}` : ""}`;

  useEffect(() => {
    if (!date || (needService && !service)) return;
    setSlots(null); setTime("");
    fetch(`${api}/slots?${qs()}`).then((r) => r.json()).then((j) => setSlots(j.slots || [])).catch(() => setSlots([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, date, service, staff, needService]);

  const groups = useMemo(() => {
    const g = { Morning: [], Afternoon: [], Evening: [] };
    (slots || []).forEach((t) => { const h = Number(t.slice(0, 2)); (h < 12 ? g.Morning : h < 17 ? g.Afternoon : g.Evening).push(t); });
    return Object.entries(g).filter(([, v]) => v.length);
  }, [slots]);

  async function book(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${api}/book`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, service, date, time, staff: staff || undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error || "Couldn't book. Please try again.");
        if (r.status === 409) { setTime(""); setSlots(null); fetch(`${api}/slots?${qs()}`).then((x) => x.json()).then((x) => setSlots(x.slots || [])); }
      } else setDone(j);
    } catch (_) { setErr("Connection problem — please try again."); }
    setBusy(false);
  }

  const shell = (children) => (
    <div className={embed ? "bg-transparent px-2 py-4" : "min-h-screen bg-canvas px-4 py-10"}>
      <div className="mx-auto max-w-xl">
        <div className={`${embed ? "mb-4" : "mb-6"} text-center`}>
          <h1 className={`${embed ? "text-xl" : "text-2xl"} font-bold tracking-tight text-text`}>{title}</h1>
          <p className="mt-1 text-sm text-muted">{embed ? "Book your appointment online" : [info?.location, "Book your appointment online"].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">{children}</div>
        <p className="mt-4 text-center text-[11px] text-muted">Powered by NextReply</p>
      </div>
    </div>
  );

  if (loadErr) return shell(<p className="p-8 text-center text-sm text-muted">{loadErr}</p>);
  if (!info) return shell(<div className="space-y-3 p-6">{[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-canvas" />)}</div>);

  if (done) {
    return shell(
      <div className="p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600">✓</div>
        <h2 className="mt-4 text-xl font-bold text-text">You're booked!</h2>
        <div className="mx-auto mt-4 max-w-sm space-y-1 rounded-xl bg-canvas p-4 text-left text-sm">
          {service && <p><span className="text-muted">Service:</span> <b className="text-text">{service}</b></p>}
          <p><span className="text-muted">When:</span> <b className="text-text">{longDay(date)}, {nice(time)}</b></p>
          {done.staff && <p><span className="text-muted">With:</span> <b className="text-text">{done.staff}</b></p>}
          {done.ref && <p><span className="text-muted">Reference:</span> <b className="text-text">{done.ref}</b></p>}
        </div>
        {done.extra && (
          <p className="mx-auto mt-4 max-w-sm whitespace-pre-wrap rounded-xl border border-line p-3 text-left text-sm text-text">
            {done.extra.split(/(https:\/\/\S+)/).map((part, i) => /^https:\/\//.test(part)
              ? <a key={i} href={part} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">{part}</a>
              : part)}
          </p>
        )}
        {info.whatsapp && (
          <a href={`https://wa.me/${info.whatsapp}?text=${encodeURIComponent(`Hi! I booked ${done.ref || "an appointment"} online.`)}`} target="_blank" rel="noreferrer"
            className="btn-brand mt-6 inline-flex px-5 py-2.5 text-sm">Message us on WhatsApp</a>
        )}
      </div>
    );
  }

  let n = 0;
  return shell(
    {/* Only the Confirm button books — pressing Enter in a field must not. */}
    <form onSubmit={book} onKeyDown={(e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault(); }} className="divide-y divide-line">
      {needService && (
        <Section n={++n} title="Choose a service" summary={svc && `${svc.name} · ${svc.duration} min`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {info.services.map((s) => (
              <button type="button" key={s.name} onClick={() => { setService(s.name); setStaff(""); setDate(""); }}
                className={`rounded-xl border p-3 text-left transition ${service === s.name ? "border-brand bg-brand-tint ring-1 ring-brand" : "border-line hover:border-brand/40"}`}>
                <p className="text-sm font-semibold text-text">{s.name}</p>
                <p className="mt-0.5 text-xs text-muted">{[s.duration && `${s.duration} min`, s.price != null && s.price !== "" ? s.price : null].filter(Boolean).join(" · ")}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {(!needService || service) && people.length > 1 && (
        <Section n={++n} title="With" optional>
          <div className="flex flex-wrap gap-2">
            {[{ id: "", name: "Anyone available" }, ...people].map((m) => (
              <button type="button" key={m.id || "any"} onClick={() => setStaff(m.id)}
                className={`rounded-full border px-4 py-1.5 text-sm ${staff === m.id ? "border-brand bg-brand text-white" : "border-line text-text hover:border-brand/40"}`}>{m.name}</button>
            ))}
          </div>
        </Section>
      )}

      {(!needService || service) && cal && (
        <Section n={++n} title="Pick a day" summary={date && longDay(date)}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{monthName(cal.today)}</p>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEK.map((w) => <span key={w} className="pb-1 text-[11px] font-medium text-muted">{w}</span>)}
            {cal.cells.map((d, i) => d ? (
              <button type="button" key={d} onClick={() => setDate(d)}
                className={`aspect-square rounded-xl text-sm font-semibold transition ${date === d ? "bg-brand text-white" : d === cal.today ? "border border-brand/40 text-text hover:bg-brand-tint" : "text-text hover:bg-canvas"}`}>
                {dayNum(d)}
              </button>
            ) : <span key={`b${i}`} />)}
          </div>
        </Section>
      )}

      {date && (
        <Section n={++n} title="Pick a time" summary={time && nice(time)}>
          {slots === null ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-canvas" />)}</div>
            : slots.length === 0 ? <p className="rounded-xl bg-canvas p-4 text-center text-sm text-muted">No free times on this day — please pick another day.</p>
            : (
              <div className="space-y-3">
                {groups.map(([label, list]) => (
                  <div key={label}>
                    <p className="mb-1.5 text-xs font-semibold text-muted">{label}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((t) => (
                        <button type="button" key={t} onClick={() => setTime(t)}
                          className={`rounded-lg border py-2 text-sm font-medium transition ${time === t ? "border-brand bg-brand text-white" : "border-line text-text hover:border-brand/40"}`}>{nice(t)}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Section>
      )}

      {time && (
        <Section n={++n} title="Your details">
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted">Full name
              <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
            </label>
            <label className="block text-xs font-medium text-muted">Mobile / WhatsApp number (with country code)
              <input className="field mt-1" placeholder="+971 50 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" />
            </label>
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
            <button disabled={busy} className="btn-brand w-full py-3 text-sm disabled:opacity-60">
              {busy ? "Booking…" : `Confirm ${service ? service + " · " : ""}${longDay(date)}, ${nice(time)}`}
            </button>
          </div>
        </Section>
      )}
    </form>
  );
}

function Section({ n, title, summary, optional, children }) {
  return (
    <div className="p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <p className="text-sm font-semibold text-text">{title}{optional && <span className="ml-1 font-normal text-muted">(optional)</span>}</p>
        {summary && <span className="ml-auto truncate text-xs font-medium text-brand">{summary}</span>}
      </div>
      {children}
    </div>
  );
}
