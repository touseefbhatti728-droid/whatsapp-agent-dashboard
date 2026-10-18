"use client";

import { useEffect, useRef, useState } from "react";
import { connectWhatsApp } from "@/lib/whatsapp-actions";
import { toast } from "@/lib/toast";

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_FB_CONFIG_ID;
const GV = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || "v21.0";

export default function ConnectWhatsApp({ connectedNumber }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | saving | done | error
  const [msg, setMsg] = useState("");
  const sessionRef = useRef({});

  useEffect(() => {
    if (!FB_APP_ID || typeof window === "undefined") return;

    if (window.FB) {
      try { window.FB.init({ appId: FB_APP_ID, autoLogAppEvents: true, xfbml: false, version: GV }); } catch (_) {}
    } else {
      window.fbAsyncInit = function () {
        window.FB.init({ appId: FB_APP_ID, autoLogAppEvents: true, xfbml: false, version: GV });
      };
      (function (d, s, id) {
        if (d.getElementById(id)) return;
        const js = d.createElement(s);
        js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        d.getElementsByTagName("head")[0].appendChild(js);
      })(document, "script", "facebook-jssdk");
    }

    // Embedded Signup posts the new WABA id + phone number id via window messages
    function onMessage(event) {
      let host = "";
      try { host = new URL(event.origin).hostname; } catch (_) { return; }
      if (!/(^|\.)facebook\.com$/.test(host)) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && data.type === "WA_EMBEDDED_SIGNUP" && data.data) {
          if (data.data.phone_number_id) sessionRef.current.phone_number_id = data.data.phone_number_id;
          if (data.data.waba_id) sessionRef.current.waba_id = data.data.waba_id;
          if (data.event) sessionRef.current.event = data.event;
        }
      } catch (_) {}
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function launch(coexistence) {
    if (!FB_APP_ID || !FB_CONFIG_ID) {
      setStatus("error");
      setMsg("WhatsApp connect isn't configured yet.");
      return;
    }
    if (!window.FB) {
      setStatus("error");
      setMsg("Facebook is still loading — try again in 2 seconds.");
      return;
    }
    setStatus("connecting");
    setMsg("");
    sessionRef.current = {};

    // NOTE: the Facebook SDK rejects async callbacks ("Expression is of type
    // asyncfunction, not function"), so this must be a plain function that
    // kicks off the async work with .then()/.catch().
    window.FB.login(
      function (response) {
        const code = response && response.authResponse && response.authResponse.code;
        if (!code) {
          setStatus("error");
          setMsg("Connection was cancelled or permission wasn't given.");
          return;
        }
        setStatus("saving");
        const info = sessionRef.current || {};
        connectWhatsApp({
          code,
          phoneNumberId: info.phone_number_id || null,
          wabaId: info.waba_id || null,
          coexistence: !!coexistence || info.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        })
          .then(function (r) {
            if (r && r.ok) {
              setStatus("done");
              setMsg("WhatsApp connected ✅ " + (r.phoneNumber ? "(" + r.phoneNumber + ")" : ""));
              toast.success("WhatsApp connected", r.phoneNumber ? r.phoneNumber + " is live — your AI now replies to customers." : "Your AI now replies to customers.");
            } else {
              setStatus("error");
              setMsg((r && r.error) || "Connection failed. Please try again.");
              toast.error("WhatsApp connect failed", (r && r.error) || undefined);
            }
          })
          .catch(function (e) {
            setStatus("error");
            setMsg((e && e.message) || "Connection failed. Please try again.");
          });
      },
      {
        config_id: FB_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        // featureType "whatsapp_business_app_onboarding" = Coexistence: the number keeps
        // working in the owner's WhatsApp Business app AND on NextReply's AI.
        extras: { setup: {}, featureType: coexistence ? "whatsapp_business_app_onboarding" : "", sessionInfoVersion: "3" },
      }
    );
  }

  if (!FB_APP_ID) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        WhatsApp connect isn't set up yet.
      </div>
    );
  }

  const busy = status === "connecting" || status === "saving";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.6-.8-2.7-1.4-3.8-3.2-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 2.5 1 3 1 3.5.9.7-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2z"/></svg>
        </span>
        <div>
          <p className="text-base font-semibold text-text">WhatsApp</p>
          <p className="text-sm text-muted">{connectedNumber ? "Connected: +" + String(connectedNumber).replace(/\D/g, "").replace(/^00/, "") : "Connect your WhatsApp Business number"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => launch(true)}
          disabled={busy}
          className="flex flex-col items-start gap-1 rounded-xl border-2 border-[#25D366] bg-[#25D366]/5 p-4 text-left transition hover:bg-[#25D366]/10 disabled:opacity-60"
        >
          <span className="text-sm font-semibold text-text">I use the WhatsApp Business app on this number</span>
          <span className="text-xs text-muted">Recommended. Keep using the app on your phone — your chats and contacts stay, and the AI replies too. You'll scan a QR code in the app.</span>
        </button>
        <button
          onClick={() => launch(false)}
          disabled={busy}
          className="flex flex-col items-start gap-1 rounded-xl border border-line p-4 text-left transition hover:bg-black/[0.02] disabled:opacity-60"
        >
          <span className="text-sm font-semibold text-text">New number / not on WhatsApp</span>
          <span className="text-xs text-muted">The number will work only through NextReply (it can't be used in the WhatsApp app at the same time).</span>
        </button>
      </div>

      {busy && <p className="mt-3 text-sm text-muted">Connecting… finish the steps in the Meta window.</p>}

      {msg && (
        <p className={"mt-3 text-sm " + (status === "done" ? "text-[#1a8f4c]" : status === "error" ? "text-red-600" : "text-muted")}>{msg}</p>
      )}

      <p className="mt-4 text-xs text-muted">
        A secure Meta window opens where you log in with Facebook, choose your business and verify your WhatsApp number.
      </p>
    </div>
  );
}
