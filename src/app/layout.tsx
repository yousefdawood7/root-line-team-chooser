import type { Metadata } from 'next';
import './globals.css';

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
      </body>
    </html>
  );
}
