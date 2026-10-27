import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { releaseCandidate } from '@/lib/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const result = await releaseCandidate(candidateId, {
      id: session.leadId,
      email: session.email,
      isAdmin: session.role === 'admin',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Release error:', error);
    return NextResponse.json({ error: error.message || 'Failed to release candidate' }, { status: 500 });
  }
}
