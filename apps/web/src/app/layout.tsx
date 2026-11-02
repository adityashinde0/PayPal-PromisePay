import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPal PromisePay | Proof-of-Outcome Payments",
  description: "AI-powered proof-of-outcome lifecycle platform for PayPal payments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0070BA] font-bold text-white shadow-sm">
                PP
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  PayPal PromisePay
                </h1>
                <p className="text-xs text-slate-500">Proof-of-Outcome for Payments</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4 text-sm font-medium text-slate-600">
              <a href="/" className="hover:text-blue-600">Ledger</a>
              <a href="/create" className="hover:text-blue-600">New Promise</a>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                Sandbox Mode
              </span>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}

