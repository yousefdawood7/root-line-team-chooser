import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { autoDistributePool } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await autoDistributePool();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to auto-assign';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
