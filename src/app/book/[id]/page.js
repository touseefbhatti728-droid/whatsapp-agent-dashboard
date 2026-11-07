import BookingPage from "@/components/BookingPage";

export const metadata = { title: "Book an appointment", robots: { index: false } };

// Public online booking page: app.nextreply.io/book/<business id>
export default async function Book({ params }) {
  const { id } = await params;
  return <BookingPage businessId={id} />;
}
