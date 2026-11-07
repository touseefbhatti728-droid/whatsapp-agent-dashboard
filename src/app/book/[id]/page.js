import BookingPage from "@/components/BookingPage";

export const metadata = { title: "Book an appointment", robots: { index: false } };

// Public online booking page: app.nextreply.io/book/<business id>
// ?name=<website name> shows the website's own name; ?embed=1 is the compact version for iframes.
export default async function Book({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const name = String(sp?.name || "").replace(/[<>]/g, "").trim().slice(0, 60) || null;
  return <BookingPage businessId={id} displayName={name} embed={sp?.embed === "1"} />;
}
