import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect /admin and /draft routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/draft')) {
    const token = req.cookies.get('rootline_session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role-specific check
    if (pathname.startsWith('/admin') && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/draft', req.url));
    }
  }

  // If already logged in, redirect /login to destination
  if (pathname === '/login') {
    const token = req.cookies.get('rootline_session')?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        return NextResponse.redirect(
          new URL(session.role === 'admin' ? '/admin' : '/draft', req.url)
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/draft/:path*', '/login'],
};
