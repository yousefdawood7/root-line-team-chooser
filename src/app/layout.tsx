import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Root Line | Team Chooser',
  description: 'Team lead candidate selection platform',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased bg-white text-zinc-950">
      <body className="min-h-full flex flex-col bg-white text-zinc-950">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
