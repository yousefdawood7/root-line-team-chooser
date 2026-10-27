import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState, removeLead, upsertLead } from '@/lib/blob';

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
  return NextResponse.json(state.leads, { headers: NO_CACHE_HEADERS });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const body = await req.json();
    const { email, name, customQuota } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updatedState = await upsertLead({
      email,
      name,
      customQuota: customQuota === '' || customQuota === null || customQuota === undefined ? null : Number(customQuota),
    });

    return NextResponse.json(
      { success: true, leads: updatedState.leads, state: updatedState },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update lead';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: NO_CACHE_HEADERS });
  }

  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('id');

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const updatedState = await removeLead(leadId);
    return NextResponse.json(
      { success: true, leads: updatedState.leads, state: updatedState },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete lead';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
