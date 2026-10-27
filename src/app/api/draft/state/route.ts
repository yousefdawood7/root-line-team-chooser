import { NextResponse } from 'next/server';
import { getDraftState } from '@/lib/blob';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = await getDraftState();
  return NextResponse.json(state);
}
