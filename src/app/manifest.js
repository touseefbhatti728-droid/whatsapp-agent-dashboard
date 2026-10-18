// PWA manifest — lets owners "Add to Home Screen" on iPhone/Android so booking
// alerts arrive like a normal app notification (required for push on iPhone).
export default function manifest() {
  return {
    name: "NextReply",
    short_name: "NextReply",
    description: "Your AI front desk on WhatsApp",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#14102b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
