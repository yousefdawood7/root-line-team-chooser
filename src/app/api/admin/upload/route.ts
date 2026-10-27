import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseCandidateFile } from '@/lib/excel';
import { importCandidates } from '@/lib/blob';
import { ColumnMapping } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const mappingRaw = formData.get('mapping') as string | null;
    const sessionTitle = formData.get('sessionTitle') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let mapping: ColumnMapping | undefined;
    if (mappingRaw) {
      try {
        mapping = JSON.parse(mappingRaw) as ColumnMapping;
      } catch {
        // use default heuristic if mapping parsing fails
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const candidates = parseCandidateFile(buffer, file.name, mapping);

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidate rows could be found in the uploaded file.' },
        { status: 400 }
      );
    }

    const updatedState = await importCandidates(
      candidates,
      file.name,
      sessionTitle || undefined
    );

    return NextResponse.json({
      success: true,
      count: candidates.length,
      settings: updatedState.settings,
      leads: updatedState.leads,
    });
  } catch (error: unknown) {
    console.error('File upload error:', error);
    const message = error instanceof Error ? error.message : 'Failed to process file';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
