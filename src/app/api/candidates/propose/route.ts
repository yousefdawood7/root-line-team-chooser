import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { proposeCandidate } from '@/lib/blob';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'lead' || !session.leadId) {
      return NextResponse.json({ error: 'Only authorized team leads can propose candidates' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, department, email, phone, skills, notes } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 });
    }

    const result = await proposeCandidate(
      {
        name,
        role,
        department,
        email,
        phone,
        skills,
        notes,
      },
      {
        id: session.leadId,
        name: session.name || session.email,
        email: session.email,
      }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Propose error:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit proposal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
