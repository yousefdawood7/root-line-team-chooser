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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset draft';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
