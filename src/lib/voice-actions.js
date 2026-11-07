"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/session";
import { adminDb } from "@/lib/admin-db";
import { BACKEND_URL } from "@/lib/backend";

const VAPI = "https://api.vapi.ai";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const biz = await getActiveBusiness(user.id);
  if (!biz) return { error: "No business found for this account." };
  return { biz };
}

async function vapi(path, method, body) {
  const key = process.env.VAPI_API_KEY;
  if (!key) throw new Error("The phone receptionist isn't set up on the server yet (VAPI_API_KEY).");
  const r = await fetch(`${VAPI}${path}`, { method, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(Array.isArray(j?.message) ? j.message.join(", ") : j?.message || `Vapi answered ${r.status}`);
  return j;
}

// Creates (or updates) the Vapi assistant that uses our AI, and a phone number for it.
export async function setupVoiceLine({ areaCode } = {}) {
  const { biz, error } = await ctx();
  if (error) return { ok: false, error };
  const db = adminDb();
  if (!("voice_token" in biz)) return { ok: false, error: "The phone receptionist turns on after a quick database update by your provider." };
  try {
    const token = biz.voice_token || crypto.randomBytes(24).toString("hex");
    const base = `${BACKEND_URL}/voice/vapi/${biz.id}/${token}`;
    const assistant = {
      name: `${biz.name || "NextReply"} receptionist`.slice(0, 40),
      firstMessage: `Hi, thanks for calling ${biz.name || "us"}! How can I help you today?`,
      model: { provider: "custom-llm", url: base, model: "nextreply" },
      server: { url: `${base}/events` },
      serverMessages: ["end-of-call-report"],
      endCallPhrases: ["goodbye", "bye bye", "allah hafiz", "khuda hafiz"],
      maxDurationSeconds: 900,
    };
    const a = biz.vapi_assistant_id
      ? await vapi(`/assistant/${biz.vapi_assistant_id}`, "PATCH", assistant)
      : await vapi("/assistant", "POST", assistant);
    await db.from("businesses").update({ voice_token: token, vapi_assistant_id: a.id }).eq("id", biz.id);

    let number = biz.voice_number;
    if (!biz.vapi_phone_number_id) {
      const body = { provider: "vapi", assistantId: a.id, name: (biz.name || "NextReply").slice(0, 40) };
      if (/^\d{3}$/.test(String(areaCode || ""))) body.numberDesiredAreaCode = String(areaCode);
      const p = await vapi("/phone-number", "POST", body);
      number = p.number || null;
      await db.from("businesses").update({ vapi_phone_number_id: p.id, voice_number: number }).eq("id", biz.id);
    }
    revalidatePath("/phone");
    return { ok: true, number, assistantId: a.id };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Turns the line off: releases the number and deletes the assistant.
export async function removeVoiceLine() {
  const { biz, error } = await ctx();
  if (error) return { ok: false, error };
  try {
    if (biz.vapi_phone_number_id) await vapi(`/phone-number/${biz.vapi_phone_number_id}`, "DELETE").catch(() => {});
    if (biz.vapi_assistant_id) await vapi(`/assistant/${biz.vapi_assistant_id}`, "DELETE").catch(() => {});
  } catch (_) {}
  await adminDb().from("businesses").update({ vapi_assistant_id: null, vapi_phone_number_id: null, voice_number: null }).eq("id", biz.id);
  revalidatePath("/phone");
  return { ok: true };
}
