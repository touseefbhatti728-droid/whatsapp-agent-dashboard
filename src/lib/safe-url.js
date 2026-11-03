// Server-only: decide whether a customer-supplied webhook URL is safe to call.
// Blocks plain http, localhost and private / link-local / metadata addresses, so a
// webhook can't be pointed at our own servers or cloud internals.
import { lookup } from "node:dns/promises";
import net from "node:net";

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 ||
      (a === 169 && b === 254) ||            // link-local + cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||  // carrier-grade NAT
      a >= 224;                              // multicast / reserved
  }
  const v6 = ip.toLowerCase();
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") ||
    v6.startsWith("fe80") || v6.startsWith("::ffff:127.") || v6.startsWith("::ffff:10.") ||
    v6.startsWith("::ffff:192.168.") || v6.startsWith("::ffff:169.254.");
}

// Returns { ok: true, url } or { ok: false, error }.
export async function checkWebhookUrl(raw) {
  let u;
  try { u = new URL(String(raw || "").trim()); } catch { return { ok: false, error: "That isn't a valid URL." }; }
  if (u.protocol !== "https:") return { ok: false, error: "The URL must start with https://" };
  if (u.username || u.password) return { ok: false, error: "Remove the username/password from the URL." };
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return { ok: false, error: "Internal addresses aren't allowed." };
  }
  try {
    const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return { ok: false, error: "Internal addresses aren't allowed." };
  } catch {
    return { ok: false, error: "We couldn't find that website. Check the URL." };
  }
  return { ok: true, url: u.toString() };
}
