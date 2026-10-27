import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState } from '@/lib/blob';
import { generateExportWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const state = await getDraftState();
  const fileBytes = generateExportWorkbook(state.candidates, state.leads);

  const filename = `team_assignments_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(fileBytes), {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
}
