import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { proposeCandidate, getDraftState } from '@/lib/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'lead' || !session.leadId) {
      return NextResponse.json({ error: 'Only authorized team leads can propose candidates' }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { name, role, department, email, phone, skills, notes } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Candidate name is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const result = await proposeCandidate(
      {
        name,
        role,
        department,
        email,
        phone,
        skills,
        notes,
      },
      {
        id: session.leadId,
        name: session.name || session.email,
        email: session.email,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const state = await getDraftState();
    return NextResponse.json({ ...result, state }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    console.error('Propose error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit proposal';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
