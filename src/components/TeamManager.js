"use client";

import ConfirmButton from "@/components/ConfirmButton";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/team-actions";
import { toast } from "@/lib/toast";

function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

const DAYS = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"], ["sat", "Sat"], ["sun", "Sun"]];
const defaultHours = () => Object.fromEntries(DAYS.map(([k]) => [k, { on: k !== "sun", start: "09:00", end: "18:00" }]));

export default function TeamManager({ businesses, members, serviceNames = [], staffReady = true }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(businesses[0]?.id || "");
  const [draft, setDraft] = useState({ name: "", role: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const list = members.filter((m) => m.business_id === selectedId);

  async function add() {
    if (!draft.name.trim()) { setError("Please enter a name."); return; }
    setBusy(true); setError("");
    const res = await addTeamMember({ business_id: selectedId, ...draft });
    setBusy(false);
    if (res && res.ok === false) { setError(res.error || "Could not add."); toast.error("Could not add team member", res.error); return; }
    toast.success("Team member added", draft.name);
    setDraft({ name: "", role: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select value={selectedId} onChange={(e) => setSelectedId(businesses.find((x) => String(x.id) === e.target.value)?.id ?? e.target.value)} className="field max-w-sm">
            {businesses.map((b) => (<option key={b.id} value={b.id}>{b.name || "Unnamed business"}</option>))}
          </select>
        </div>
      )}

      {/* Add member */}
      <div className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-text">Add a team member</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="field" />
          <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role (optional) — e.g. Senior stylist" className="field" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={add} disabled={busy} className="btn-brand">{busy ? "Adding…" : "Add member"}</button>
          {error && <span className="text-sm font-medium text-red-500">{error}</span>}
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Your team</h2>
          <p className="text-xs text-muted">{list.length} member{list.length === 1 ? "" : "s"}</p>
        </div>
        {list.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-medium text-text">No team members yet</p>
            <p className="mt-1 text-sm text-muted">Add your first member above.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {list.map((m) => (<Row key={m.id} member={m} serviceNames={serviceNames} staffReady={staffReady} onChanged={() => router.refresh()} />))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ member, serviceNames, staffReady, onChanged }) {
  const [row, setRow] = useState({ name: member.name || "", role: member.role || "" });
  const [busy, setBusy] = useState(false);
  const dirty = row.name !== (member.name || "") || row.role !== (member.role || "");

  async function save() { setBusy(true); await updateTeamMember({ id: member.id, ...row }); setBusy(false); onChanged(); }
  async function toggle() { setBusy(true); await updateTeamMember({ id: member.id, active: !member.active }); setBusy(false); onChanged(); }
  async function remove() { setBusy(true); await deleteTeamMember(member.id); setBusy(false); onChanged(); }

  const [open, setOpen] = useState(false);
  return (
    <div className={member.active ? "" : "opacity-60"}>
    <div className="flex flex-wrap items-center gap-3 p-4 md:px-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(row.name)}</div>
      <input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} className="field w-40 py-1.5" placeholder="Name" />
      <input value={row.role} onChange={(e) => setRow({ ...row, role: e.target.value })} className="field flex-1 py-1.5" placeholder="Role" />
      <div className="flex items-center gap-2">
        {dirty && <button onClick={save} disabled={busy} className="btn-brand px-3 py-1.5 text-xs">Save</button>}
        <button onClick={toggle} disabled={busy} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${member.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>
          {member.active ? "Active" : "Hidden"}
        </button>
        <button onClick={() => setOpen(!open)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-canvas">{open ? "Close" : "Hours & services"}</button>
        <ConfirmButton onConfirm={remove} disabled={busy} label="Remove" confirmLabel="Yes, remove" className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-red-500" />
      </div>
    </div>
    {open && <Schedule member={member} serviceNames={serviceNames} staffReady={staffReady} onChanged={onChanged} />}
    </div>
  );
}

// What this person does and when they work.
function Schedule({ member, serviceNames, staffReady, onChanged }) {
  const [services, setServices] = useState(member.services || []);
  const [own, setOwn] = useState(!!member.availability);
  const [hours, setHours] = useState(member.availability || defaultHours());
  const [busy, setBusy] = useState(false);

  if (!staffReady) {
    return <p className="mx-4 mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 md:mx-5">Staff schedules turn on after a quick database update by your provider.</p>;
  }
  const toggleSvc = (n) => setServices((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));
  const setDay = (k, patch) => setHours((h) => ({ ...h, [k]: { ...(h[k] || { on: false, start: "09:00", end: "18:00" }), ...patch } }));

  async function save() {
    setBusy(true);
    const r = await updateTeamMember({ id: member.id, services, availability: own ? hours : null });
    setBusy(false);
    if (r && r.ok === false) return toast.error("Couldn't save", r.error);
    toast.success("Saved", `${member.name}'s hours and services`);
    onChanged();
  }

  return (
    <div className="mx-4 mb-4 space-y-5 rounded-xl border border-line bg-canvas/50 p-4 md:mx-5">
      <div>
        <p className="text-sm font-semibold text-text">Services {member.name} does</p>
        <p className="text-xs text-muted">None ticked = all services.</p>
        {serviceNames.length === 0
          ? <p className="mt-2 text-sm text-muted">Add services on the Services page first.</p>
          : (
            <div className="mt-2 flex flex-wrap gap-2">
              {serviceNames.map((n) => (
                <button key={n} type="button" onClick={() => toggleSvc(n)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${services.includes(n) ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-surface text-text"}`}>{n}</button>
              ))}
            </div>
          )}
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm font-semibold text-text">
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> Own working hours
        </label>
        <p className="text-xs text-muted">Off = works whenever the business is open.</p>
        {own && (
          <div className="mt-3 space-y-2">
            {DAYS.map(([k, label]) => {
              const d = hours[k] || { on: false, start: "09:00", end: "18:00" };
              return (
                <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex w-20 items-center gap-2"><input type="checkbox" checked={!!d.on} onChange={(e) => setDay(k, { on: e.target.checked })} />{label}</label>
                  {d.on ? (
                    <>
                      <input type="time" value={d.start} onChange={(e) => setDay(k, { start: e.target.value })} className="field w-28 py-1" />
                      <span className="text-muted">to</span>
                      <input type="time" value={d.end} onChange={(e) => setDay(k, { end: e.target.value })} className="field w-28 py-1" />
                    </>
                  ) : <span className="text-muted">Off</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={save} disabled={busy} className="btn-brand px-4 py-1.5 text-sm">{busy ? "Saving…" : "Save hours & services"}</button>
    </div>
  );
}
