import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { UserSession } from './types';

const COOKIE_NAME = 'rootline_session';
const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'rootline-team-chooser-super-secret-key-2026'
);

export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@rootline.com').toLowerCase().trim();
export const DEFAULT_ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'admin123';

/**
 * Sign JWT token for the user session (Edge & Node compatible)
 */
export async function signSession(session: UserSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verify JWT token (Edge & Node compatible)
 */
export async function verifySession(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

/**
 * Read current session from cookies
 */
export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySession(token);
  } catch {
    return null;
  }
}

/**
 * Save session to HTTP-only cookie
 */
export async function setSessionCookie(session: UserSession) {
  const cookieStore = await cookies();
  const token = await signSession(session);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      expires: new Date(0),
      path: '/',
    });
    cookieStore.delete(COOKIE_NAME);
  } catch (err) {
    console.error('Error clearing cookie:', err);
  }
}
