import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { releaseCandidate, getDraftState } from '@/lib/blob';

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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const result = await releaseCandidate(candidateId, {
      id: session.leadId,
      email: session.email,
      isAdmin: session.role === 'admin',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const state = await getDraftState();
    return NextResponse.json({ success: true, state }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    console.error('Release error:', error);
    const message = error instanceof Error ? error.message : 'Failed to release candidate';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
