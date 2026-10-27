import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { setDraftLock } from '@/lib/blob';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { isLocked } = await req.json();
    const state = await setDraftLock(Boolean(isLocked));
    return NextResponse.json({ success: true, settings: state.settings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update lock';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
