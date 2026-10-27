import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.email) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const state = await getDraftState();
    const currentLead =
      session.role === 'lead' && Array.isArray(state?.leads)
        ? state.leads.find(
            (l) =>
              l.id === session.leadId ||
              (l.email && l.email.toLowerCase() === session.email.toLowerCase())
          )
        : null;

    return NextResponse.json({
      authenticated: true,
      user: session,
      lead: currentLead || null,
    });
  } catch (err: any) {
    console.error('Error in /api/auth/me:', err);
    return NextResponse.json({ authenticated: false, error: err.message }, { status: 200 });
  }
}
