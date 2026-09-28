"use client";

import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function timeOf(ts) { return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
function initials(n) { return n ? n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "•"; }

function AppointmentCard({ b, showBusiness }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas/40 p-3 transition hover:border-brand/40 hover:bg-brand-tint/30">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(b.customer_name)}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{b.customer_name || "Unknown"}</p>
        <p className="truncate text-xs text-muted">{b.service || "—"}{showBusiness ? ` · ${b.businessName}` : ""}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand-dark">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {timeOf(b.start_time)}
        </span>
        {b.ref_no && <span className="text-[10px] font-medium text-muted">BK-{b.ref_no}</span>}
      </div>
    </div>
  );
}

export default function CalendarView({ bookings, showBusiness }) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(ymd(today));

  const byDay = {};
  bookings.forEach((b) => {
    if (!b.start_time) return;
    const key = ymd(new Date(b.start_time));
    (byDay[key] = byDay[key] || []).push(b);
  });

  const first = new Date(view.y, view.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = ymd(today);
  const selList = (byDay[selected] || []).slice().sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const selDate = new Date(selected + "T00:00:00");

  const todayList = (byDay[todayKey] || []).slice().sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const now = Date.now();
  const nextToday = todayList.find((b) => new Date(b.start_time).getTime() >= now) || todayList[0] || null;

  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const goToday = () => { setView({ y: today.getFullYear(), m: today.getMonth() }); setSelected(todayKey); };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      {/* Calendar grid */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-text">{MONTHS[view.m]} {view.y}</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={goToday} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-text hover:bg-canvas">Today</button>
            <button onClick={prev} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-canvas">‹</button>
            <button onClick={next} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:bg-canvas">›</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{w}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = ymd(d);
            const list = byDay[key] || [];
            const isToday = key === todayKey;
            const isSel = key === selected;
            return (
              <button
                key={i}
                onClick={() => setSelected(key)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition
                  ${isSel ? "bg-brand text-white" : isToday ? "bg-brand-tint text-brand-dark" : "text-text hover:bg-canvas"}`}
              >
                <span className={isToday && !isSel ? "font-bold" : ""}>{d.getDate()}</span>
                {list.length > 0 && (
                  <span className={`mt-0.5 flex items-center gap-0.5`}>
                    {list.length <= 3
                      ? list.map((_, k) => <span key={k} className={`h-1 w-1 rounded-full ${isSel ? "bg-surface" : "bg-brand"}`} />)
                      : <span className={`text-[10px] font-semibold ${isSel ? "text-white" : "text-brand"}`}>{list.length}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        {/* Today summary card */}
        <div className="overflow-hidden rounded-[18px] bg-ink text-white shadow-[0_20px_40px_-24px_rgba(17,12,40,0.6)]">
          <div className="flex items-stretch justify-between gap-4 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Today</p>
              <p className="mt-1 text-3xl font-extrabold leading-none">{todayList.length}</p>
              <p className="mt-1 text-xs text-white/55">appointment{todayList.length === 1 ? "" : "s"}</p>
            </div>
            <div className="flex flex-col items-end justify-center border-l border-white/10 pl-4 text-right">
              {nextToday ? (
                <>
                  <p className="text-[11px] uppercase tracking-wide text-white/45">Next up</p>
                  <p className="mt-0.5 text-lg font-bold text-white">{timeOf(nextToday.start_time)}</p>
                  <p className="max-w-[150px] truncate text-xs text-white/60">{nextToday.customer_name || "—"}</p>
                </>
              ) : (
                <p className="text-xs text-white/50">Nothing scheduled</p>
              )}
            </div>
          </div>
          {selected !== todayKey && (
            <button onClick={goToday} className="w-full border-t border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-white/80 hover:bg-white/[0.08]">
              Jump to today
            </button>
          )}
        </div>

        {/* Selected day appointments */}
        <div className="card flex flex-col overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <p className="text-sm font-semibold text-text">
              {selDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-xs text-muted">{selList.length} appointment{selList.length === 1 ? "" : "s"}</p>
          </div>
          <div className="max-h-[58vh] flex-1 overflow-y-auto p-4">
            {selList.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">No appointments on this day.</div>
            ) : (
              <div className="space-y-2.5">
                {selList.map((b) => (<AppointmentCard key={b.id} b={b} showBusiness={showBusiness} />))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
