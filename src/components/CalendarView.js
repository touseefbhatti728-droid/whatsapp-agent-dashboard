"use client";

import { useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function timeOf(ts) { return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
function initials(n) { return n ? n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : "•"; }

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

      {/* Selected day appointments */}
      <div className="card flex flex-col overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <p className="text-sm font-semibold text-text">
            {selDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-xs text-muted">{selList.length} appointment{selList.length === 1 ? "" : "s"}</p>
        </div>
        <div className="max-h-[60vh] flex-1 overflow-y-auto">
          {selList.length === 0 ? (
            <div className="px-5 py-14 text-center text-sm text-muted">No appointments on this day.</div>
          ) : (
            <div className="divide-y divide-line">
              {selList.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{initials(b.customer_name)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{b.customer_name || "Unknown"}</p>
                    <p className="truncate text-xs text-muted">{b.service || "—"}{showBusiness ? ` · ${b.businessName}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-text">{timeOf(b.start_time)}</p>
                    {b.ref_no && <p className="text-[10px] text-brand">BK-{b.ref_no}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
