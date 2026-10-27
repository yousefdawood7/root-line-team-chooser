import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate, Lead } from './types';

/**
 * Generate a styled corporate PDF roster document using jsPDF & jspdf-autotable
 */
export function generateRosterPDF(
  candidates: Candidate[] = [],
  leads: Lead[] = [],
  filterLeadId?: string | null
): { buffer: Uint8Array; filename: string } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const leadMap = new Map<string, Lead>();
  for (const l of leads) leadMap.set(l.id, l);

  const targetLead = filterLeadId ? leadMap.get(filterLeadId) : null;
  const leadsToProcess = targetLead ? [targetLead] : leads;

  const safeLeadName = targetLead
    ? targetLead.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'All_Teams';
  const filename = `RootLine_Team_${safeLeadName}.pdf`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  let currentY = margin;

  // Header Banner
  doc.setFillColor(24, 24, 27); // #18181b
  doc.rect(margin, currentY, pageWidth - margin * 2, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ROOT LINE', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CANDIDATE DRAFT & TEAM SELECTION REPORT', margin + 6, currentY + 13);

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.text(`DATE: ${dateStr}`, pageWidth - margin - 6, currentY + 7, { align: 'right' });
  doc.text('INTERNAL USE ONLY', pageWidth - margin - 6, currentY + 13, { align: 'right' });

  currentY += 24;

  // For each team lead: render metadata box and table
  leadsToProcess.forEach((lead, leadIdx) => {
    const squad = candidates.filter(
      (c) => c.assignedToLeadId === lead.id && c.approvalStatus !== 'pending'
    );

    // If multi-lead and not first, add a page break if space is tight
    if (leadIdx > 0 && currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    // Lead Summary Box
    doc.setFillColor(244, 244, 245); // zinc-100
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.rect(margin, currentY, pageWidth - margin * 2, 16, 'FD');

    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Team Lead: ${lead.name}`, margin + 5, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`Email: ${lead.email}`, margin + 5, currentY + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    const quotaPct = lead.quota > 0 ? Math.round((squad.length / lead.quota) * 100) : 0;
    doc.text(
      `Assigned: ${squad.length} / ${lead.quota} (${quotaPct}%)`,
      pageWidth - margin - 5,
      currentY + 6,
      { align: 'right' }
    );

    currentY += 20;

    // Table
    const tableRows = squad.map((member, idx) => [
      String(idx + 1),
      member.name,
      member.role || '—',
      member.department || '—',
      member.email || '—',
      member.phone || '—',
      (member.skills || []).slice(0, 3).join(', ') || '—',
    ]);

    if (tableRows.length === 0) {
      tableRows.push(['—', 'No candidates drafted yet', '—', '—', '—', '—', '—']);
    }

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Candidate Name', 'Role', 'Department', 'Email', 'Phone', 'Skills']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      styles: {
        fontSize: 7.5,
        textColor: [24, 24, 27],
        cellPadding: 2.5,
        lineColor: [228, 228, 231],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 38, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 34 },
        5: { cellWidth: 22 },
        6: { cellWidth: 'auto' },
      },
      didDrawPage: (data) => {
        currentY = data.cursor?.y ? data.cursor.y + 10 : margin;
      },
    });

    currentY += 6;
  });

  // Check if signature section fits or add new page
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin;
  }

  // Dual Signatures
  doc.setDrawColor(180, 180, 185);
  doc.setLineWidth(0.3);

  const sigColWidth = (pageWidth - margin * 2 - 20) / 2;
  const sigY = pageHeight - 35;

  // Sign Box 1
  doc.line(margin, sigY, margin + sigColWidth, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Team Lead Signature & Acceptance', margin, sigY + 4);
  doc.text('Date: _______________________', margin, sigY + 8);

  // Sign Box 2
  doc.line(margin + sigColWidth + 20, sigY, pageWidth - margin, sigY);
  doc.text('Root Line Administrator Authorization', margin + sigColWidth + 20, sigY + 4);
  doc.text('Date: _______________________', margin + sigColWidth + 20, sigY + 8);

  // Running Page Numbering
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 165);
    doc.text(
      `Root Line Team Chooser | Official Document | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return { buffer: new Uint8Array(arrayBuffer), filename };
}
