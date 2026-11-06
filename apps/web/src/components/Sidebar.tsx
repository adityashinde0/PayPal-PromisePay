'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Table2,
  ShieldCheck,
  Scale,
  BarChart3,
  Shield,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';
import { useDashboard, DashboardTab } from '@/context/DashboardContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, setActiveTab, role, setRole } = useDashboard();

  const handleNavClick = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    if (pathname !== '/') {
      router.push('/');
    }
    onClose?.();
  };

  const navItems: { label: string; tab: DashboardTab; icon: any }[] = [
    { label: 'Dashboard', tab: 'dashboard', icon: LayoutDashboard },
    { label: 'Promise Ledger', tab: 'ledger', icon: Table2 },
    { label: 'Verification Center', tab: 'verification', icon: ShieldCheck },
    { label: 'Resolution & Disputes', tab: 'resolution', icon: Scale },
    { label: 'Payment Analytics', tab: 'analytics', icon: BarChart3 },
  ];

  const integrations = [
    { name: 'PayPal Orders v2', status: 'Connected' },
    { name: 'Gemini AI Verifier', status: 'Active (Demo data)' },
    { name: 'Audit Log Storage', status: 'Synced' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Rock-solid, fixed sidebar: strictly locked width, sticky on desktop */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 min-w-[16rem] max-w-[16rem] shrink-0 flex-col border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          boxSizing: 'border-box',
          contain: 'layout style',
        }}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center px-5 border-b border-slate-100">
          <Link href="/" onClick={() => setActiveTab('dashboard')} className="block select-none">
            <PayPalLogo height={22} variant="brand" />
          </Link>
        </div>

        {/* Navigation & Controls */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Switch Role Pill */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1.5 select-none">
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="h-3 w-3" />
                <span>Account Role</span>
              </span>
              <span className="capitalize font-bold text-[#0070BA] text-[10px]">
                {role}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-white p-1 border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setRole('buyer')}
                className={`rounded-md py-1.5 text-xs font-bold transition-colors duration-150 ${
                  role === 'buyer'
                    ? 'bg-[#0070BA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => setRole('seller')}
                className={`rounded-md py-1.5 text-xs font-bold transition-colors duration-150 ${
                  role === 'seller'
                    ? 'bg-[#0070BA] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Seller
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 shrink-0" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === '/' && activeTab === item.tab;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item.tab)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors duration-150 select-none text-left ${
                    isActive
                      ? 'bg-[#EBF3FC] text-[#0070BA] font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
                      isActive ? 'text-[#0070BA]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {/* Direct Create Link */}
            <Link
              href="/create"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors duration-150 select-none ${
                pathname === '/create'
                  ? 'bg-[#EBF3FC] text-[#0070BA] font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <PlusCircle
                className={`h-4 w-4 shrink-0 ${
                  pathname === '/create' ? 'text-[#0070BA]' : 'text-slate-400'
                }`}
              />
              <span className="truncate">Create Promise</span>
            </Link>

            {/* Merchant Hub & Settings Link (Goal 3) */}
            <Link
              href="/settings"
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors duration-150 select-none ${
                pathname === '/settings'
                  ? 'bg-[#EBF3FC] text-[#0070BA] font-bold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Settings
                className={`h-4 w-4 shrink-0 ${
                  pathname === '/settings' ? 'text-[#0070BA]' : 'text-slate-400'
                }`}
              />
              <span className="truncate">PayPal Merchant Hub</span>
            </Link>
          </nav>

          {/* Live System Integrations */}
          <div className="space-y-2 pt-2 border-t border-slate-100 shrink-0">
            <div className="flex items-center justify-between px-1 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                System Integrations
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
            </div>
            <div className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/50 p-2">
              {integrations.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs py-1 px-1.5"
                >
                  <span className="font-medium text-slate-600 text-[11px] truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60 shrink-0">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Trust Card */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-white">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <div className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0070BA] text-white">
                <Shield className="h-3.5 w-3.5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  PayPal Protection
                </h4>
                <p className="mt-0.5 text-[10px] text-slate-500 leading-tight">
                  Outcome verification and resolutions governed by human-reviewed policies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
