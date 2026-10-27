import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateDraftSettings } from '@/lib/blob';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await req.json();
    const state = await updateDraftSettings(body);
    return NextResponse.json({ success: true, settings: state.settings, state }, { headers: NO_CACHE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
