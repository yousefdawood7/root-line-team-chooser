'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { UserSession, Lead } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Official Rootline Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 relative rounded-lg overflow-hidden border border-zinc-200 bg-zinc-950 flex items-center justify-center shrink-0">
            <Image
              src="/logo.svg"
              alt="Root Line"
              width={36}
              height={36}
              priority
              className="object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-zinc-950">
              Root Line
            </span>
            <Badge variant="outline" className="text-[11px] font-normal text-zinc-600">
              Team Chooser
            </Badge>
          </div>
        </Link>

        {/* Navigation & User Info */}
        <div className="flex items-center gap-3">
          {user?.role === 'admin' ? (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="default">
                <Link href="/admin" className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/draft">
                  Draft Board
                </Link>
              </Button>
            </div>
          ) : lead ? (
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium">
                <span className="text-zinc-500 mr-1.5">Picks:</span>
                <span className="font-semibold text-zinc-950">
                  {lead.pickedCount} / {lead.quota}
                </span>
              </Badge>
            </div>
          ) : null}

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-zinc-900 truncate max-w-[150px]">
                  {lead?.name || user.name || user.email}
                </p>
                <p className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                  {user.email}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                className="text-zinc-500 hover:text-zinc-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
