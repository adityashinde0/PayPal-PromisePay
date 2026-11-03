'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type DashboardTab =
  | 'dashboard'
  | 'ledger'
  | 'verification'
  | 'resolution'
  | 'analytics';

export type UserRole = 'buyer' | 'seller';

interface DashboardContextType {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [role, setRole] = useState<UserRole>('buyer');
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        role,
        setRole,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

