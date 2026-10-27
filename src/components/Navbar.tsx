'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, LogOut, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { UserSession, Lead } from '@/lib/types';

interface NavbarProps {
  user?: UserSession | null;
  lead?: Lead | null;
  isLocked?: boolean;
}

export function Navbar({ user, lead, isLocked }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-200 bg-clip-text text-transparent">
                Root Line
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                Team Chooser
              </span>
            </div>
            {isLocked && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold tracking-wide uppercase">
                Draft Paused by Admin
              </span>
            )}
          </div>
        </div>

        {/* Navigation & User Info */}
        <div className="flex items-center gap-3">
          {user?.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Dashboard
              </Link>
              <Link
                href="/draft"
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Draft Board
              </Link>
            </div>
          ) : lead ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">Picks Claimed:</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {lead.pickedCount} / {lead.quota}
                </span>
                {lead.pickedCount >= lead.quota && lead.quota > 0 && (
                  <span className="inline-flex items-center text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                    Complete
                  </span>
                )}
              </div>
            </div>
          ) : null}

          {/* User profile pill */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {lead?.name || user.name || user.email}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                  {user.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
