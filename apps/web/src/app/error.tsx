'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to client-side error reporting or console
    console.error('PromisePay App Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <span className="font-mono text-xs font-semibold tracking-wider uppercase text-rose-600">
          Runtime Exception
        </span>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Something Went Wrong</h2>
        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
          An unexpected error occurred while processing this PromisePay view. Our autonomous verification state remains secure in escrow.
        </p>

        {error.message && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-left border border-slate-200">
            <p className="text-[11px] font-mono text-slate-700 break-words line-clamp-3">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-1 text-[10px] font-mono text-slate-400">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#0070BA] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#003087] focus:outline-none focus:ring-2 focus:ring-[#0070BA] focus:ring-offset-2"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
