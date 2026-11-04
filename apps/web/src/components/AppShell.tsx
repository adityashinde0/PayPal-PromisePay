'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';

interface AppShellProps {
  children: React.ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { globalSearch, setGlobalSearch } = useDashboard();

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
