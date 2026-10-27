import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseCandidateFile } from '@/lib/excel';
import { importCandidates } from '@/lib/blob';

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

    const candidates = parseCandidateFile(buffer, file.name);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidate rows could be found in the uploaded file.' },
        { status: 400 }
      );
    }

    const updatedState = await importCandidates(candidates, file.name);

    return NextResponse.json({
      success: true,
      count: candidates.length,
      settings: updatedState.settings,
      leads: updatedState.leads,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process file' }, { status: 500 });
  }
}
