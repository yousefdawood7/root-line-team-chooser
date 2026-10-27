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
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand with Official Rootline Logo */}
        <Link href="/" className="flex items-center gap-2.5">
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
              <Button asChild size="sm" variant="default" className="h-8 text-xs">
                <Link href="/admin" className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              </Button>
              <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                <Link href="/draft">
                  Draft Board
                </Link>
              </Button>
            </div>
          ) : lead ? (
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="secondary" className="px-3 py-1 font-medium text-xs">
                <span className="text-zinc-500 mr-1.5">Picks:</span>
                <span className="font-semibold text-zinc-950">
                  {lead.pickedCount} / {lead.quota}
                </span>
              </Badge>
            </div>
          ) : null}

          {/* User profile & Prominent Logout Button */}
          {user && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200">
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-zinc-900 truncate max-w-[130px]">
                  {lead?.name || user.name || user.email}
                </p>
                <p className="text-[10px] text-zinc-500 truncate max-w-[130px]">
                  {user.email}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                title="Log out of account"
                className="h-8 text-xs px-2.5 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 border-zinc-200 flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="font-medium">Log Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
