// Tiny global toast helper (client side). Usage:
//   toast.success("Saved")            toast.error("Could not save", "Try again")
//   toast({ kind: "alert", title: "New booking", body: "...", url: "/calendar" })
export function toast(input) {
  if (typeof window === "undefined") return;
  const t = typeof input === "string" ? { title: input } : { ...input };
  window.dispatchEvent(new CustomEvent("nr-toast", { detail: t }));
}
toast.success = (title, body) => toast({ kind: "success", title, body });
toast.error = (title, body) => toast({ kind: "error", title, body });
toast.info = (title, body) => toast({ kind: "info", title, body });
