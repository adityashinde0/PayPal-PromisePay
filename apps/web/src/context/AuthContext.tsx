'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type UserRole = 'BUYER' | 'SELLER' | 'REVIEWER' | 'ADMIN';

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, targetRole?: UserRole) => Promise<void>;
  signup: (email: string, password: string, role: UserRole, fullName?: string) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load persisted session on initial render
    try {
      const storedToken = localStorage.getItem('promisepay_auth_token');
      const storedUser = localStorage.getItem('promisepay_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else {
        // Default to demo admin session
        const defaultUser: UserProfile = {
          userId: 'usr_admin_dev',
          email: 'admin@promisepay.example',
          role: 'ADMIN',
          organizationId: '00000000-0000-0000-0000-000000000001',
        };
        setUser(defaultUser);
        setToken('test_token_admin');
        localStorage.setItem('promisepay_auth_token', 'test_token_admin');
        localStorage.setItem('promisepay_user', JSON.stringify(defaultUser));
      }
    } catch {
      // Storage unavailable or server-side render
    }
  }, []);

  const login = async (email: string, password = 'password123', targetRole?: UserRole) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: targetRole }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to log in' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('promisepay_auth_token', data.token);
    localStorage.setItem('promisepay_user', JSON.stringify(data.user));
  };

  const signup = async (email: string, password: string, role: UserRole, fullName?: string) => {
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, fullName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to sign up' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('promisepay_auth_token', data.token);
    localStorage.setItem('promisepay_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('promisepay_auth_token');
    localStorage.removeItem('promisepay_user');
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      const activeToken = token || localStorage.getItem('promisepay_auth_token') || 'test_token_admin';
      const res = await fetch(`${API_BASE}/api/auth/switch-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ targetRole: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('promisepay_auth_token', data.token);
        localStorage.setItem('promisepay_user', JSON.stringify(data.user));
        return;
      }
    } catch {
      // Fallback local update
    }

    const updated: UserProfile = {
      ...user,
      role: newRole,
    };
    const demoToken = `test_token_${newRole.toLowerCase()}`;
    setUser(updated);
    setToken(demoToken);
    localStorage.setItem('promisepay_auth_token', demoToken);
    localStorage.setItem('promisepay_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'BUYER',
        token,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

