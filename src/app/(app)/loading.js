// Shown instantly while a page's data loads, so a click never feels frozen.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-lg bg-black/[0.07]" />
        <div className="h-4 w-80 rounded-lg bg-black/[0.05]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-black/[0.05]" />)}
      </div>
      <div className="h-64 rounded-2xl bg-black/[0.05]" />
    </div>
  );
}
