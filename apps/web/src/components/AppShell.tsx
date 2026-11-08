'use client';

import React, { useEffect, useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

// Suppress harmless PayPal JS SDK lifecycle cancellations (e.g. Component closed, popup closed, dev remount)
if (typeof window !== 'undefined') {
  const origConsoleError = window.console.error;
  window.console.error = function (...args: unknown[]) {
    const message = args.map((arg) => (typeof arg === 'string' ? arg : (arg as Error)?.message || '')).join(' ');
    if (
      message.includes('paypal_js_sdk') ||
      message.includes('Component closed') ||
      message.includes('detected popup close')
    ) {
      return;
    }
    origConsoleError.apply(window.console, args);
  };
}

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { globalSearch, setGlobalSearch } = useDashboard();

  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const str = String(reason?.message || reason || '');
      if (
        str.includes('paypal_js_sdk') ||
        str.includes('Component closed') ||
        str.includes('detected popup close')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event?.message || event?.error?.message || '');
      if (
        msg.includes('paypal_js_sdk') ||
        msg.includes('Component closed') ||
        msg.includes('detected popup close')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('unhandledrejection', handleRejection, true);
    window.addEventListener('error', handleError, true);

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Left Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Scrollable Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopNavbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          searchValue={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 max-w-[1560px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AuthProvider>
      <DashboardProvider>
        <AppShellInner>{children}</AppShellInner>
      </DashboardProvider>
    </AuthProvider>
  );
}
