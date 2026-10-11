"use client";

import { useEffect, useRef, useState } from "react";
import { connectWhatsApp } from "@/lib/whatsapp-actions";

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
        }
      } catch (_) {}
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function launch() {
    if (!FB_APP_ID || !FB_CONFIG_ID) {
      setStatus("error");
      setMsg("WhatsApp connect abhi configure nahi hua (env missing).");
      return;
    }
    if (!window.FB) {
      setStatus("error");
      setMsg("Facebook abhi load ho raha hai — 2 second baad dobara try karein.");
      return;
    }
    setStatus("connecting");
    setMsg("");
    sessionRef.current = {};

    window.FB.login(
      async function (response) {
        const code = response && response.authResponse && response.authResponse.code;
        if (!code) {
          setStatus("error");
          setMsg("Connect cancel ho gaya ya permission nahi di gayi.");
          return;
        }
        setStatus("saving");
        const info = sessionRef.current || {};
        try {
          const r = await connectWhatsApp({
            code,
            phoneNumberId: info.phone_number_id || null,
            wabaId: info.waba_id || null,
          });
          if (r.ok) {
            setStatus("done");
            setMsg("WhatsApp connect ho gaya ✅ " + (r.phoneNumber ? "(" + r.phoneNumber + ")" : ""));
          } else {
            setStatus("error");
            setMsg(r.error || "Connect fail ho gaya.");
          }
        } catch (e) {
          setStatus("error");
          setMsg((e && e.message) || "Connect fail ho gaya.");
        }
      },
      {
        config_id: FB_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    );
  }

  if (!FB_APP_ID) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        WhatsApp connect abhi set up nahi hua.
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
          <p className="text-sm text-muted">{connectedNumber ? "Connected: " + connectedNumber : "Apna WhatsApp number connect karein"}</p>
        </div>
      </div>

      <button
        onClick={launch}
        disabled={busy}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Connecting…" : connectedNumber ? "Reconnect WhatsApp" : "Connect WhatsApp"}
      </button>

      {msg && (
        <p className={"mt-3 text-sm " + (status === "done" ? "text-[#1a8f4c]" : status === "error" ? "text-red-600" : "text-muted")}>{msg}</p>
      )}

      <p className="mt-4 text-xs text-muted">
        Ek Meta popup khulega jahan aap apna WhatsApp Business number verify karke connect karoge. Koi app delete nahi hogi.
      </p>
    </div>
  );
}
