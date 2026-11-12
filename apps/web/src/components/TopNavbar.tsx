'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Bell, Plus, Menu, ChevronDown, ShieldCheck, UserCheck, LogOut, LogIn } from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';
import { useAuth, UserRole } from '@/context/AuthContext';
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
  const { user, role, switchRole, logout, isAuthenticated } = useAuth();
  const { setRole } = useDashboard();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleRoleSelect = async (newRole: UserRole) => {
    await switchRole(newRole);
    setRole(newRole === 'BUYER' ? 'buyer' : 'seller');
    setProfileOpen(false);
  };

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : 'US';
  };

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
            placeholder="Search promises, PayPal order IDs, or merchants..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-12 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#0070BA] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0070BA] transition-all"
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
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Mobile Search Toggle */}
        <button
          type="button"
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="sm:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Toggle search"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Environment Status Badge */}
        <div className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PayPal Sandbox</span>
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
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 pointer-events-none">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0070BA]" />
          </span>
        </div>

        {/* User Profile & Role Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-90 transition select-none"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#003087] to-[#0070BA] text-white font-bold text-xs shadow-xs">
              {getInitials(user?.email || 'AD')}
            </div>
            <div className="hidden text-left xl:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">
                {role === 'ADMIN'
                  ? 'Administrator'
                  : role === 'SELLER'
                  ? 'Merchant'
                  : role === 'REVIEWER'
                  ? 'Arbitrator'
                  : 'Buyer'}
              </p>
              <p className="text-[10px] font-semibold text-[#0070BA] tracking-wide">
                {role === 'ADMIN' ? 'Platform Admin' : `${role.charAt(0) + role.slice(1).toLowerCase()} Portal`}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white py-2 shadow-2xl ring-1 ring-black/5 z-50">
              {/* Account Overview Header */}
              <div className="px-4 py-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">
                    {role === 'ADMIN'
                      ? 'Administrator'
                      : role === 'SELLER'
                      ? 'Merchant Partner'
                      : role === 'REVIEWER'
                      ? 'Dispute Arbitrator'
                      : 'Buyer'}
                  </p>
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0070BA] border border-blue-200">
                    {role === 'REVIEWER' ? 'Arbitrator' : role}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                  {user?.email || 'admin@promisepay.example'}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>PromisePay Enterprise Organization</span>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="px-3 py-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Account Role
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Live Permissions</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['BUYER', 'SELLER', 'REVIEWER', 'ADMIN'] as UserRole[]).map((r) => {
                    const isSelected = role === r;
                    const label =
                      r === 'REVIEWER'
                        ? 'Arbitrator'
                        : r === 'ADMIN'
                        ? 'Administrator'
                        : r.charAt(0) + r.slice(1).toLowerCase();
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleRoleSelect(r)}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition ${
                          isSelected
                            ? 'bg-[#0070BA] text-white shadow-xs'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <span className="text-white text-xs font-bold">&#10003;</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Links */}
              <div className="py-1 text-xs">
                <Link
                  href="/login"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <LogIn className="h-4 w-4 text-slate-400" />
                  <span>Sign In with Another Account</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  <span>Register New Organization</span>
                </Link>
                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Input Drawer */}
      {mobileSearchOpen && (
        <div className="sm:hidden absolute top-16 left-0 w-full bg-white border-b border-slate-200 px-4 py-2.5 z-40 shadow-md flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 h-4 w-4 my-auto text-slate-400" />
            <input
              autoFocus
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search promises, order IDs..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0070BA] focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1"
          >
            Cancel
          </button>
        </div>
      )}
    </header>
  );
}
