import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resetDraftPicks } from '@/lib/blob';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const state = await resetDraftPicks();
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to reset draft' }, { status: 500 });
  }
}
