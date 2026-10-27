import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { inspectCandidateFile } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inspection = inspectCandidateFile(buffer, file.name);

    const now = new Date();
    const dateFormatted = now.toISOString().slice(0, 16).replace('T', ' ');
    const defaultTitle = `Root Line Draft - ${dateFormatted}`;

    return NextResponse.json({
      success: true,
      filename: file.name,
      defaultTitle,
      ...inspection,
    });
  } catch (error: unknown) {
    console.error('File preview error:', error);
    const message = error instanceof Error ? error.message : 'Failed to inspect file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
