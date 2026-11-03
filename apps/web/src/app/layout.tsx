import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PayPal PromisePay | AI-Powered Proof-of-Outcome for Payments',
  description:
    'AI-powered proof-of-outcome lifecycle platform for PayPal payments: define promises, pay via PayPal Sandbox escrow, track deliverables, and auto-verify outcomes.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-[#F8FAFC] text-slate-900 font-sans selection:bg-[#0070BA] selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
