"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";
import { listFacebookPages, connectFacebookPage, disconnectFacebookPage } from "@/lib/social-actions";
import { toast } from "@/lib/toast";

const GV = "v22.0";

// Facebook Login for Business (Pages configuration) → pick a Page → connected.
export default function ConnectSocial({ connected, configId, appId }) {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [pages, setPages] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!appId || typeof window === "undefined") return;
    if (window.FB) { try { window.FB.init({ appId, xfbml: false, version: GV }); } catch (_) {} return; }
    window.fbAsyncInit = () => window.FB.init({ appId, xfbml: false, version: GV });
    if (!document.getElementById("facebook-jssdk")) {
      const s = document.createElement("script");
      s.id = "facebook-jssdk"; s.src = "https://connect.facebook.net/en_US/sdk.js";
      document.head.appendChild(s);
    }
  }, [appId]);

  function login() {
    setErr("");
    if (!configId) return setErr("Instagram & Messenger login isn't configured yet (NEXT_PUBLIC_FB_PAGES_CONFIG_ID).");
    if (!window.FB) return setErr("Facebook is still loading — try again in 2 seconds.");
    // The SDK rejects async callbacks, so keep this a plain function.
    window.FB.login(function (res) {
      const t = res?.authResponse?.accessToken;
      if (!t) return setErr("The Facebook window was closed before finishing.");
      setToken(t); setBusy(true);
      listFacebookPages(t).then((r) => {
        setBusy(false);
        if (!r.ok) return setErr(r.error);
        setPages(r.pages);
      });
    }, { config_id: configId });
  }

  async function pick(id) {
    setBusy(true); setErr("");
    const r = await connectFacebookPage(token, id);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    toast.success("Connected", [r.page, r.instagram && `@${r.instagram}`].filter(Boolean).join(" + "));
    setPages(null); router.refresh();
  }

  if (connected) {
    return (
      <div className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="pill bg-brand-tint text-brand-dark"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> Connected</span>
          <p className="text-sm text-text"><b>Facebook Page:</b> {connected.page}</p>
          <p className="text-sm text-text"><b>Instagram:</b> {connected.instagram ? `@${connected.instagram}` : <span className="text-muted">not linked to this Page</span>}</p>
        </div>
        <p className="text-sm text-muted">New Messenger and Instagram DMs are answered by your AI and appear in Conversations, where you can reply. When you reply yourself from the Page inbox or Instagram app, the AI steps back for that chat.</p>
        {!connected.instagram && <p className="text-xs text-muted">To add Instagram: link your Instagram professional account to this Facebook Page (Instagram → Settings → Business tools → Connect a Facebook Page), then reconnect here.</p>}
        <ConfirmButton onConfirm={async () => { const r = await disconnectFacebookPage(); if (!r.ok) toast.error("Couldn't disconnect", r.error); router.refresh(); }}
          label="Disconnect" confirmLabel="Yes, disconnect" className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:text-red-500" />
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-6">
      {!pages ? (
        <>
          <p className="text-sm text-text">You'll log in with Facebook and choose your business Page. If your Instagram professional account is linked to that Page, it's connected too.</p>
          <button onClick={login} disabled={busy} className="btn-brand px-5 py-2.5 text-sm disabled:opacity-60">{busy ? "Loading your Pages…" : "Connect Facebook Page & Instagram"}</button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-text">Which Page should your AI answer for?</p>
          <div className="space-y-2">
            {pages.map((p) => (
              <button key={p.id} disabled={busy} onClick={() => pick(p.id)} className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left text-sm hover:bg-canvas disabled:opacity-60">
                <span className="font-medium text-text">{p.name}</span>
                <span className="text-xs text-muted">{p.instagram ? `+ Instagram @${p.instagram}` : "Messenger only"}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
