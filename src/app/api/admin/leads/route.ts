import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState, removeLead, upsertLead } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const state = await getDraftState();
  return NextResponse.json(state.leads);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, name, customQuota } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const updatedState = await upsertLead({
      email,
      name,
      customQuota: customQuota === '' || customQuota === null || customQuota === undefined ? null : Number(customQuota),
    });

    return NextResponse.json({ success: true, leads: updatedState.leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('id');

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const updatedState = await removeLead(leadId);
    return NextResponse.json({ success: true, leads: updatedState.leads });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
