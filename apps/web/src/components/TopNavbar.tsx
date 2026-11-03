'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Bell, Plus, Menu, ChevronDown } from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';
import { useDashboard } from '@/context/DashboardContext';

interface TopNavbarProps {
  onToggleSidebar?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export function TopNavbar({
  onToggleSidebar,
  searchValue = '',
  onSearchChange,
}: TopNavbarProps) {
  const { role } = useDashboard();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left side: Hamburger + Logo on mobile */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="lg:hidden">
          <PayPalLogo height={20} />
        </div>
      </div>

      {/* Center: Global Search Bar with functional ⌘K shortcut */}
      <div className="hidden sm:flex flex-1 max-w-xl mx-4 lg:mx-8">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search promises, PayPal order IDs, or keywords... (Press ⌘K or Ctrl+K)"
            className="w-full rounded-lg border border-slate-300 bg-slate-50/50 py-1.5 pl-9 pr-12 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#0070BA] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070BA] transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd
              onClick={() => searchInputRef.current?.focus()}
              className="hidden md:inline-flex items-center cursor-pointer rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors shadow-2xs"
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Sandbox Escrow Pill */}
        <div className="hidden md:flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0070BA] border border-blue-200/80">
          <span className="h-2 w-2 rounded-full bg-[#0070BA] animate-pulse" />
          <span>Sandbox Escrow</span>
        </div>

        {/* Quick Create Action */}
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070BA] hover:bg-[#003087] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Promise</span>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0070BA]" />
          </span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#003087] to-[#0070BA] text-white font-bold text-xs shadow-xs">
            {role === 'buyer' ? 'BY' : 'SL'}
          </div>
          <div className="hidden text-left xl:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {role === 'buyer' ? 'Aditya Shinde' : 'Merchant Partner'}
            </p>
            <p className="text-[10px] font-medium text-slate-500 capitalize">
              {role} Account
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
