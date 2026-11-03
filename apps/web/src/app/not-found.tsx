import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs max-w-md w-full">
        <span className="font-mono text-4xl font-black text-[#0070BA]">404</span>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Page Not Found</h2>
        <p className="mt-2 text-xs text-slate-500">
          The escrow agreement, promise record, or verification dossier you requested does not exist.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#0070BA] hover:bg-[#003087] px-4 py-2 text-xs font-bold text-white transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

