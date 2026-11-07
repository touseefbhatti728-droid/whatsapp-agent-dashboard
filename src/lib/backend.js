// The Node backend (Railway) that runs the AI, the website widget and online booking.
export const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://whatsapp-agent-production-b43f.up.railway.app").replace(/\/$/, "");
