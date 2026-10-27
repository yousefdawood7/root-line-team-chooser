import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { approveProposal, getDraftState, rejectProposal } from '@/lib/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  const state = await getDraftState();
  const pending = state.candidates.filter((c) => c.approvalStatus === 'pending');
  return NextResponse.json(pending, { headers: NO_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const { candidateId, action } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (action === 'approve') {
      const res = await approveProposal(candidateId);
      if (!res.success) throw new Error(res.error);
      const state = await getDraftState();
      return NextResponse.json({ ...res, state }, { headers: NO_CACHE_HEADERS });
    } else if (action === 'reject') {
      const res = await rejectProposal(candidateId);
      if (!res.success) throw new Error(res.error);
      const state = await getDraftState();
      return NextResponse.json({ ...res, state }, { headers: NO_CACHE_HEADERS });
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400, headers: NO_CACHE_HEADERS });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process proposal';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
