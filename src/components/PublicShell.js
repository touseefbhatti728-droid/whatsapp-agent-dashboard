// Simple centred layout for pages customers open from a WhatsApp link.
export default function PublicShell({ title, sub, children }) {
  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-lg">
        {title && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-text">{title}</h1>
            {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
          </div>
        )}
        <div className="card p-5 sm:p-6">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">Powered by NextReply</p>
      </div>
    </div>
  );
}
