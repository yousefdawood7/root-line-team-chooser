'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: isAdminMode ? password : '',
          isAdminLogin: isAdminMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      router.push(data.redirect || (isAdminMode ? '/admin' : '/draft'));
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-zinc-50/50">
      <div className="w-full max-w-sm">
        {/* Logo & Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.18)] items-center justify-center mb-3">
            <Image
              src="/logo.svg"
              alt="Rootline"
              width={56}
              height={56}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950">
            Rootline
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Team Chooser Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-zinc-200 shadow-sm bg-white">
          <CardHeader className="pb-4">
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 rounded-lg bg-zinc-100 p-1 mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(false);
                  setError(null);
                }}
                className={`text-xs font-semibold py-1.5 rounded-md transition cursor-pointer ${
                  !isAdminMode
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Team Lead
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdminMode(true);
                  setError(null);
                }}
                className={`text-xs font-semibold py-1.5 rounded-md transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAdminMode
                    ? 'bg-white text-zinc-950 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>

            <CardTitle className="text-base font-semibold">
              {isAdminMode ? 'Administrator Sign In' : 'Team Lead Sign In'}
            </CardTitle>
            <CardDescription className="text-xs">
              {isAdminMode
                ? 'Sign in with your admin credentials to manage teams.'
                : 'Enter your authorized email to access the draft board.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700">
                  Email
                </label>
                <Input
                  type="email"
                  required
                  placeholder={isAdminMode ? 'admin@rootline.com' : 'lead@rootline.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                />
              </div>

              {isAdminMode && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700">
                    Password
                  </label>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
