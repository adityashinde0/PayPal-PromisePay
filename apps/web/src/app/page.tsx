export default function Home() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Promise Ledger</h2>
        <p className="mt-1 text-sm text-slate-500">
          Track agreements, PayPal Sandbox payments, fulfillment evidence, and AI verification status in real time.
        </p>
        
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            System Initialized — Ready for Phase 1 (Promise Core) &amp; Phase 2 (PayPal Sandbox Integration).
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <span className="inline-flex items-center rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
              API Service: Online
            </span>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
              DB Migrations: Synced
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

