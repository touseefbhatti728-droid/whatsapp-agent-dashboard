import "./globals.css";

export const metadata = {
  title: "Booking Agent — Dashboard",
  description: "Manage your WhatsApp booking agent, businesses, and appointments.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
