import "./globals.css";
import { getBranding } from "@/lib/branding";

export const metadata = {
  title: "Dashboard",
  description: "Manage your WhatsApp booking agent, businesses, and appointments.",
};

export default async function RootLayout({ children }) {
  const b = await getBranding();
  const style = {
    "--brand-rgb": b.brandRgb,
    "--brand-dark-rgb": b.brandDarkRgb,
    "--brand-tint-rgb": b.brandTintRgb,
  };
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={style} className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
