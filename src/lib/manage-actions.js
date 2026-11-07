"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, getIsAdmin, MANAGE_COOKIE } from "@/lib/session";

// Admin opens the whole customer dashboard for one business ("Manage as customer").
export async function manageBusiness(formData) {
  const user = await getSessionUser();
  if (!user || !(await getIsAdmin(user.id))) redirect("/dashboard");
  const id = String(formData.get("id") || "");
  // Business ids are UUIDs — accept only that shape.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) redirect("/admin/clients");
  (await cookies()).set(MANAGE_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 8 });
  // Optional page to land on — only these known pages.
  const next = String(formData.get("next") || "");
  redirect(["/connect-whatsapp", "/settings", "/conversations", "/billing"].includes(next) ? next : "/dashboard");
}

export async function stopManaging() {
  (await cookies()).delete(MANAGE_COOKIE);
  redirect("/admin/clients");
}
