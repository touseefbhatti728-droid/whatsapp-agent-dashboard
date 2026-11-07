"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createAppointment, updateAppointment, cancelAppointment } from "@/lib/booking-actions";
import { toast } from "@/lib/toast";
import { sourceLabel } from "@/lib/phone";

// A slot opened up — remind the owner that people are waiting for that day.
function waitlistNote(n) {
  if (!n) return undefined;
  return `${n} ${n === 1 ? "person is" : "people are"} on the waitlist for that day — see Waitlist to offer the slot.`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// All dates are shown in the BUSINESS timezone, not the viewer's browser timezone.
function partsIn(ts, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return { key: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}`, hour: Number(p.hour) };
}
function keyOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function fromKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mondayOf(d) { const x = new Date(d); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
function niceTime(hhmm) { const [h, m] = hhmm.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`; }
function initials(n) { return n ? n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "•"; }
function todayKeyIn(tz) { return partsIn(Date.now(), tz).key; }

function Pill({ children, tone = "brand" }) {
  const c = tone === "muted" ? "bg-canvas text-muted" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-brand-tint text-brand-dark";
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>;
}

function BookingRow({ b, tz, onOpen }) {
  const t = partsIn(b.start_time, tz).time;
  return (
    <button onClick={() => onOpen(b)} className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left transition hover:border-brand/40 hover:shadow-sm">
      <div className="w-[62px] shrink-0 text-center">
        <p className="text-sm font-bold text-text">{niceTime(t).split(" ")[0]}</p>
        <p className="text-[10px] font-semibold uppercase text-muted">{niceTime(t).split(" ")[1]}</p>
      </div>
      <div className="h-9 w-px bg-line" />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(b.customer_name)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{b.customer_name || "Unknown"}</p>
        <p className="truncate text-xs text-muted">{b.service || "No service"}{b.customer_phone ? ` · +${b.customer_phone}` : ""}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        {b.ref_no && <Pill>BK-{b.ref_no}</Pill>}
        <Pill tone="muted">{sourceLabel(b.source)}</Pill>
      </div>
    </button>
  );
}

// Full details of one booking + edit + cancel
function BookingDrawer({ b, tz, services, onClose }) {
  const router = useRouter();
  const p = partsIn(b.start_time, tz);
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: b.customer_name || "", phone: b.customer_phone || "", service: b.service || "", date: p.key, time: p.time, notes: b.notes || "" });
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr(""); };

  async function save() {
    setBusy(true); setErr("");
    const r = await updateAppointment({ id: b.id, ...f });
    setBusy(false);
    if (!r?.ok) return setErr(r?.error || "Couldn't save.");
    toast.success("Appointment updated", waitlistNote(r.waiting));
    router.refresh(); onClose();
  }
  async function cancel() {
    setBusy(true); setErr("");
    const r = await cancelAppointment(b.id);
    setBusy(false);
    if (!r?.ok) return setErr(r?.error || "Couldn't cancel.");
    toast.success("Appointment cancelled", waitlistNote(r.waiting));
    router.refresh(); onClose();
  }

  const wa = b.customer_phone ? `https://wa.me/${String(b.customer_phone).replace(/\D/g, "")}` : null;
  const svcOptions = Array.from(new Set([f.service, ...services].filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-sm font-semibold text-text">Appointment details</p>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-muted hover:bg-canvas hover:text-text" aria-label="Close">✕</button>
        </div>

        {!edit ? (
          <div className="space-y-5 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(b.customer_name)}</div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-text">{b.customer_name || "Unknown"}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {b.ref_no && <Pill>BK-{b.ref_no}</Pill>}
                  <Pill tone="muted">{b.source === "dashboard" ? "Added by you" : "Booked by " + sourceLabel(b.source)}</Pill>
                </div>
              </div>
            </div>
            <dl className="divide-y divide-line rounded-xl border border-line">
              <Row label="Date" value={fromKey(p.key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
              <Row label="Time" value={`${niceTime(p.time)} (${tz})`} />
              <Row label="Service" value={b.service || "—"} />
              <Row label="WhatsApp" value={b.customer_phone ? `+${b.customer_phone}` : "—"} />
              <Row label="Notes" value={b.notes || "—"} />
              <Row label="Created" value={b.created_at ? new Date(b.created_at).toLocaleString(undefined, { timeZone: tz, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—"} />
            </dl>
            <div className="grid grid-cols-2 gap-2">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost text-center">Message on WhatsApp</a>}
              <button onClick={() => setEdit(true)} className={`btn-brand ${wa ? "" : "col-span-2"}`}>Edit</button>
            </div>
            {!confirmCancel ? (
              <button onClick={() => setConfirmCancel(true)} className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Cancel appointment</button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <p>Cancel this appointment? It will be removed from your calendar.</p>
                <div className="mt-2 flex gap-2">
                  <button disabled={busy} onClick={cancel} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">{busy ? "Cancelling…" : "Yes, cancel it"}</button>
                  <button onClick={() => setConfirmCancel(false)} className="rounded-lg px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100">Keep it</button>
                </div>
              </div>
            )}
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <Label text="Customer name"><input value={f.name} onChange={(e) => set("name", e.target.value)} className="field" /></Label>
            <Label text="WhatsApp number"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" placeholder="With country code" className="field" /></Label>
            <Label text="Service">
              {svcOptions.length ? (
                <select value={f.service} onChange={(e) => set("service", e.target.value)} className="field">
                  {svcOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="">No service</option>
                </select>
              ) : <input value={f.service} onChange={(e) => set("service", e.target.value)} className="field" />}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Label text="Date"><input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="field" /></Label>
              <Label text="Time"><input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className="field" /></Label>
            </div>
            <Label text="Notes"><textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="field resize-y" /></Label>
            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setEdit(false)} className="btn-ghost">Back</button>
              <button disabled={busy} onClick={save} className="btn-brand">{busy ? "Saving…" : "Save changes"}</button>
            </div>
            <p className="text-[11px] text-muted">Times are in your business timezone ({tz}).</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3 px-4 py-2.5 text-sm">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words text-text">{value}</dd>
    </div>
  );
}
function Label({ text, children }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted">{text}</span>{children}</label>;
}

function NewAppointment({ date, services, tz, onClose }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", service: services[0] || "", date, time: "10:00", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErr(""); };

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await createAppointment(f);
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || "Couldn't save. Please try again."); return; }
    toast.success("Appointment added", [f.name, r.ref].filter(Boolean).join(" · "));
    router.refresh();
    onClose(f.date);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => onClose()}>
      <form onSubmit={save} className="flex h-full w-full max-w-md flex-col gap-3 overflow-y-auto bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-text">New appointment</p>
          <button type="button" onClick={() => onClose()} className="rounded-lg px-2 py-1 text-muted hover:bg-canvas hover:text-text" aria-label="Close">✕</button>
        </div>
        <Label text="Customer name *"><input required autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} className="field" /></Label>
        <Label text="WhatsApp number"><input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="With country code, e.g. 971501234567" inputMode="tel" className="field" /></Label>
        <Label text="Service">
          {services.length > 0 ? (
            <select value={f.service} onChange={(e) => set("service", e.target.value)} className="field">
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="">Other / not listed</option>
            </select>
          ) : (
            <input value={f.service} onChange={(e) => set("service", e.target.value)} placeholder="e.g. Haircut" className="field" />
          )}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Label text="Date *"><input type="date" required value={f.date} onChange={(e) => set("date", e.target.value)} className="field" /></Label>
          <Label text="Time *"><input type="time" required value={f.time} onChange={(e) => set("time", e.target.value)} className="field" /></Label>
        </div>
        <Label text="Notes"><textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="field resize-y" /></Label>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <button disabled={busy} className="btn-brand mt-1 w-full">{busy ? "Saving…" : "Save appointment"}</button>
        <p className="text-[11px] text-muted">Times are in your business timezone ({tz}). Change it in AI front desk.</p>
      </form>
    </div>
  );
}

export default function CalendarView({ bookings, showBusiness, services = [], canCreate = false, openNew = false, timezone = "Asia/Dubai" }) {
  const tz = timezone;
  const todayKey = todayKeyIn(tz);
  const [mode, setMode] = useState("month"); // month | week | list
  const [cursor, setCursor] = useState(fromKey(todayKey)); // any date inside the visible month/week
  const [selected, setSelected] = useState(todayKey);
  const [adding, setAdding] = useState(openNew && canCreate);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return bookings;
    return bookings.filter((b) => [b.customer_name, b.customer_phone, b.service, b.ref_no && `bk-${b.ref_no}`].some((v) => String(v || "").toLowerCase().includes(s)));
  }, [bookings, q]);

  const byDay = useMemo(() => {
    const m = {};
    filtered.forEach((b) => {
      if (!b.start_time) return;
      const k = partsIn(b.start_time, tz).key;
      (m[k] = m[k] || []).push(b);
    });
    Object.values(m).forEach((l) => l.sort((a, z) => new Date(a.start_time) - new Date(z.start_time)));
    return m;
  }, [filtered, tz]);

  const y = cursor.getFullYear(), mo = cursor.getMonth();
  const step = (n) => setCursor((c) => mode === "week" ? addDays(c, 7 * n) : new Date(c.getFullYear(), c.getMonth() + n, 1));
  const goToday = () => { setCursor(fromKey(todayKey)); setSelected(todayKey); };

  // Month grid (weeks start Monday)
  const gridStart = mondayOf(new Date(y, mo, 1));
  const monthCells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekStart = mondayOf(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const title = mode === "week"
    ? `${weekDays[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
    : `${MONTHS[mo]} ${y}`;

  const selList = byDay[selected] || [];
  const upcoming = filtered
    .filter((b) => new Date(b.start_time).getTime() >= Date.now() - 3600000)
    .sort((a, z) => new Date(a.start_time) - new Date(z.start_time));
  const todayCount = (byDay[todayKey] || []).length;
  const weekCount = weekDays.reduce((n, d) => n + (byDay[keyOf(d)] || []).length, 0);
  const monthCount = Object.entries(byDay).filter(([k]) => k.startsWith(`${y}-${String(mo + 1).padStart(2, "0")}`)).reduce((n, [, l]) => n + l.length, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-canvas" aria-label="Previous">‹</button>
          <button onClick={goToday} className="h-9 rounded-lg border border-line px-3 text-sm font-medium text-text hover:bg-canvas">Today</button>
          <button onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted hover:bg-canvas" aria-label="Next">›</button>
        </div>
        <h2 className="min-w-[160px] text-base font-semibold text-text">{mode === "list" ? "All upcoming" : title}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, service, BK-…" className="field h-9 w-56 py-1.5 text-sm" />
          <div className="flex rounded-lg border border-line p-0.5">
            {["month", "week", "list"].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${mode === m ? "bg-brand text-white" : "text-muted hover:text-text"}`}>{m}</button>
            ))}
          </div>
          {canCreate && (
            <button onClick={() => setAdding(true)} className="btn-brand inline-flex h-9 items-center gap-1.5 py-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              New appointment
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Today" value={todayCount} />
        <Stat label="This week" value={weekCount} />
        <Stat label={mode === "week" ? "This month" : `${MONTHS[mo]}`} value={monthCount} />
      </div>

      {mode === "month" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-line bg-canvas/50">
              {WEEKDAYS.map((w) => <div key={w} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{w}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map((d, i) => {
                const k = keyOf(d);
                const list = byDay[k] || [];
                const inMonth = d.getMonth() === mo;
                const isToday = k === todayKey, isSel = k === selected;
                return (
                  <button key={i} onClick={() => setSelected(k)} onDoubleClick={() => { setSelected(k); if (canCreate) setAdding(true); }}
                    className={`min-h-[92px] border-b border-r border-line p-1.5 text-left align-top transition ${isSel ? "bg-brand-tint/60" : "hover:bg-canvas/60"} ${inMonth ? "" : "bg-canvas/30"}`}>
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-brand text-white" : inMonth ? "text-text" : "text-muted/60"}`}>{d.getDate()}</span>
                    <div className="mt-1 space-y-0.5">
                      {list.slice(0, 2).map((b) => (
                        <div key={b.id} className="truncate rounded bg-brand/10 px-1 py-0.5 text-[10.5px] font-medium text-brand-dark">
                          {niceTime(partsIn(b.start_time, tz).time).replace(":00", "")} {b.customer_name || ""}
                        </div>
                      ))}
                      {list.length > 2 && <div className="px-1 text-[10.5px] font-semibold text-muted">+{list.length - 2} more</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text">{fromKey(selected).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
                <p className="text-xs text-muted">{selList.length} appointment{selList.length === 1 ? "" : "s"}</p>
              </div>
              {canCreate && <button onClick={() => setAdding(true)} className="text-xs font-semibold text-brand hover:text-brand-dark">+ Add</button>}
            </div>
            <div className="max-h-[60vh] flex-1 space-y-2 overflow-y-auto p-3">
              {selList.length === 0
                ? <div className="py-12 text-center text-sm text-muted">No appointments on this day.{canCreate ? " Double-click a day to add one." : ""}</div>
                : selList.map((b) => <BookingRow key={b.id} b={b} tz={tz} onOpen={setOpen} />)}
            </div>
          </div>
        </div>
      )}

      {mode === "week" && (
        <div className="card overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-7">
            {weekDays.map((d) => {
              const k = keyOf(d);
              const list = byDay[k] || [];
              const isToday = k === todayKey;
              return (
                <div key={k} className="min-h-[360px] border-r border-line last:border-r-0">
                  <div className={`border-b border-line px-2 py-2 text-center ${isToday ? "bg-brand-tint" : "bg-canvas/50"}`}>
                    <p className="text-[11px] font-semibold uppercase text-muted">{WEEKDAYS[(d.getDay() + 6) % 7]}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-brand-dark" : "text-text"}`}>{d.getDate()}</p>
                  </div>
                  <div className="space-y-1.5 p-1.5">
                    {list.map((b) => (
                      <button key={b.id} onClick={() => setOpen(b)} className="w-full rounded-lg border border-brand/20 bg-brand/[0.07] p-2 text-left hover:bg-brand/[0.12]">
                        <p className="text-[11px] font-bold text-brand-dark">{niceTime(partsIn(b.start_time, tz).time)}</p>
                        <p className="truncate text-xs font-semibold text-text">{b.customer_name || "Unknown"}</p>
                        <p className="truncate text-[11px] text-muted">{b.service || "—"}</p>
                      </button>
                    ))}
                    {canCreate && (
                      <button onClick={() => { setSelected(k); setAdding(true); }} className="w-full rounded-lg py-1.5 text-[11px] font-semibold text-muted hover:bg-canvas hover:text-brand">+ Add</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "list" && (
        <div className="card p-3">
          {upcoming.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted">No upcoming appointments{q ? " match your search" : ""}.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(upcoming.reduce((m, b) => { const k = partsIn(b.start_time, tz).key; (m[k] = m[k] || []).push(b); return m; }, {})).map(([k, list]) => (
                <div key={k}>
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {k === todayKey ? "Today · " : ""}{fromKey(k).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                  <div className="space-y-2">{list.map((b) => <BookingRow key={b.id} b={b} tz={tz} onOpen={setOpen} />)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {open && <BookingDrawer key={open.id} b={open} tz={tz} services={services} onClose={() => setOpen(null)} />}
      {adding && canCreate && (
        <NewAppointment date={selected} services={services} tz={tz} onClose={(d) => { setAdding(false); if (d) { setSelected(d); setCursor(fromKey(d)); } }} />
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-text">{value}</p>
    </div>
  );
}
