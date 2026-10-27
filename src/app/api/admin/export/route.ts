import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDraftState } from '@/lib/blob';
import { generateExportWorkbook } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId');

    const state = await getDraftState();
    const { buffer, filename } = generateExportWorkbook(
      state.candidates || [],
      state.leads || [],
      leadId
    );

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('Export Excel error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
