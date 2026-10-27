import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { approveProposal, getDraftState, rejectProposal } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const state = await getDraftState();
  const pending = state.candidates.filter((c) => c.approvalStatus === 'pending');
  return NextResponse.json(pending);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { candidateId, action } = await req.json();

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    if (action === 'approve') {
      const res = await approveProposal(candidateId);
      if (!res.success) throw new Error(res.error);
      return NextResponse.json(res);
    } else if (action === 'reject') {
      const res = await rejectProposal(candidateId);
      if (!res.success) throw new Error(res.error);
      return NextResponse.json(res);
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process proposal' }, { status: 500 });
  }
}
