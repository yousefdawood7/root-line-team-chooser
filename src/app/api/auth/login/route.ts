import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSCODE,
  setSessionCookie,
} from '@/lib/auth';
import { getDraftState } from '@/lib/blob';
import { UserSession } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, isAdminLogin } = body;

    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Admin login flow
    if (isAdminLogin) {
      const isMasterAdmin =
        normalizedEmail === DEFAULT_ADMIN_EMAIL &&
        password === DEFAULT_ADMIN_PASSCODE;

      if (!isMasterAdmin) {
        return NextResponse.json(
          { error: 'Invalid admin credentials' },
          { status: 401 }
        );
      }

      const session: UserSession = {
        role: 'admin',
        email: normalizedEmail,
        name: 'Administrator',
      };

      await setSessionCookie(session);
      return NextResponse.json({ success: true, redirect: '/admin', session });
    }

    // 2. Team Lead login flow (Email Whitelist)
    const state = await getDraftState();
    const matchedLead = state.leads.find(
      (l) => l.email.toLowerCase() === normalizedEmail
    );

    if (!matchedLead) {
      return NextResponse.json(
        {
          error: `Email "${email}" is not authorized as a Team Lead. Please contact your administrator.`,
        },
        { status: 403 }
      );
    }

    const session: UserSession = {
      role: 'lead',
      email: matchedLead.email,
      leadId: matchedLead.id,
      name: matchedLead.name,
    };

    await setSessionCookie(session);
    return NextResponse.json({ success: true, redirect: '/draft', session });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}
