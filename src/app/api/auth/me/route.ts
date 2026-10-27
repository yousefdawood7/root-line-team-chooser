import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const state = await getDraftState();
  const currentLead =
    session.role === 'lead'
      ? state.leads.find(
          (l) =>
            l.id === session.leadId ||
            l.email.toLowerCase() === session.email.toLowerCase()
        )
      : null;

  return NextResponse.json({
    authenticated: true,
    user: session,
    lead: currentLead,
  });
}
