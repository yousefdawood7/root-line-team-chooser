import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { claimCandidate } from '@/lib/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'lead' || !session.leadId) {
      return NextResponse.json({ error: 'Only authorized team leads can pick candidates' }, { status: 403 });
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const result = await claimCandidate(candidateId, {
      id: session.leadId,
      email: session.email,
      name: session.name || session.email,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Pick error:', error);
    const message = error instanceof Error ? error.message : 'Failed to pick candidate';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
