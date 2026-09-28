"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/team-actions";

function initials(name) {
  if (!name) return "•";
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export default function TeamManager({ businesses, members }) {
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
    if (res && res.ok === false) { setError(res.error || "Could not add."); return; }
    setDraft({ name: "", role: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {businesses.length > 1 && (
        <div className="card p-5">
          <label className="mb-1.5 block text-sm font-medium text-text">Editing business</label>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="field max-w-sm">
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
            {list.map((m) => (<Row key={m.id} member={m} onChanged={() => router.refresh()} />))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ member, onChanged }) {
  const [row, setRow] = useState({ name: member.name || "", role: member.role || "" });
  const [busy, setBusy] = useState(false);
  const dirty = row.name !== (member.name || "") || row.role !== (member.role || "");

  async function save() { setBusy(true); await updateTeamMember({ id: member.id, ...row }); setBusy(false); onChanged(); }
  async function toggle() { setBusy(true); await updateTeamMember({ id: member.id, active: !member.active }); setBusy(false); onChanged(); }
  async function remove() { if (!confirm(`Remove ${member.name}?`)) return; setBusy(true); await deleteTeamMember(member.id); setBusy(false); onChanged(); }

  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 md:px-5 ${member.active ? "" : "opacity-60"}`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">{initials(row.name)}</div>
      <input value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} className="field w-40 py-1.5" placeholder="Name" />
      <input value={row.role} onChange={(e) => setRow({ ...row, role: e.target.value })} className="field flex-1 py-1.5" placeholder="Role" />
      <div className="flex items-center gap-2">
        {dirty && <button onClick={save} disabled={busy} className="btn-brand px-3 py-1.5 text-xs">Save</button>}
        <button onClick={toggle} disabled={busy} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${member.active ? "bg-brand-tint text-brand-dark" : "bg-canvas text-muted"}`}>
          {member.active ? "Active" : "Hidden"}
        </button>
        <button onClick={remove} disabled={busy} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-red-500">Remove</button>
      </div>
    </div>
  );
}
