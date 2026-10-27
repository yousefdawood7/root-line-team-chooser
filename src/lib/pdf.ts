import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { render as shapeText } from 'bidi-shaper';
import { AMIRI_FONT_BASE64 } from '@/lib/fonts/amiri';
import { Candidate, Lead } from './types';

/**
 * Format string with bidi shaping if it contains Arabic characters.
 */
function formatBidi(text?: string | null): string {
  if (!text) return '';
  const str = String(text);
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
  if (!hasArabic) return str;
  try {
    return shapeText(str);
  } catch {
    return str;
  }
}

/**
 * Generate a styled corporate PDF roster document using jsPDF & jspdf-autotable
 * with full Arabic unicode shaping support and optimized table padding.
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

  // Register Amiri TrueType font for Arabic and Latin text
  doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold');
  doc.setFont('Amiri', 'normal');

  const leadMap = new Map<string, Lead>();
  for (const l of leads) leadMap.set(l.id, l);

  const targetLead = filterLeadId ? leadMap.get(filterLeadId) : null;
  const leadsToProcess = targetLead ? [targetLead] : leads;

  const safeLeadName = targetLead
    ? targetLead.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || `Lead_${targetLead.id}`
    : 'All_Teams';
  const filename = `RootLine_Team_${safeLeadName}.pdf`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8; // Reduced margin from 14mm to 8mm to widen columns

  let currentY = margin;

  // Header Banner
  doc.setFillColor(24, 24, 27); // #18181b
  doc.rect(margin, currentY, pageWidth - margin * 2, 16, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Amiri', 'bold');
  doc.setFontSize(11);
  doc.text('ROOTLINE', margin + 5, currentY + 6.5);

  doc.setFont('Amiri', 'normal');
  doc.setFontSize(8);
  doc.text('CANDIDATE DRAFT & TEAM SELECTION REPORT', margin + 5, currentY + 12);

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(7.5);
  doc.text(`DATE: ${dateStr}`, pageWidth - margin - 5, currentY + 6.5, { align: 'right' });
  doc.text('INTERNAL USE ONLY', pageWidth - margin - 5, currentY + 12, { align: 'right' });

  currentY += 21;

  // For each team lead: render metadata box and table
  leadsToProcess.forEach((lead, leadIdx) => {
    const squad = candidates.filter(
      (c) => c.assignedToLeadId === lead.id && c.approvalStatus !== 'pending'
    );

    // If multi-lead and not first, add a page break if space is tight
    if (leadIdx > 0 && currentY > pageHeight - 55) {
      doc.addPage();
      currentY = margin;
    }

    // Lead Summary Box
    doc.setFillColor(244, 244, 245); // zinc-100
    doc.setDrawColor(228, 228, 231); // zinc-200
    doc.rect(margin, currentY, pageWidth - margin * 2, 15, 'FD');

    doc.setTextColor(24, 24, 27);
    doc.setFont('Amiri', 'bold');
    doc.setFontSize(9.5);
    doc.text(formatBidi(`Team Lead: ${lead.name}`), margin + 4, currentY + 5.5);

    doc.setFont('Amiri', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`Email: ${lead.email}`, margin + 4, currentY + 10.5);

    doc.setFont('Amiri', 'bold');
    doc.setTextColor(24, 24, 27);
    const quotaPct = lead.quota > 0 ? Math.round((squad.length / lead.quota) * 100) : 0;
    doc.text(
      `Assigned: ${squad.length} / ${lead.quota} (${quotaPct}%)`,
      pageWidth - margin - 4,
      currentY + 5.5,
      { align: 'right' }
    );

    currentY += 18;

    // Table with shaped Arabic text and reduced padding
    const tableRows = squad.map((member, idx) => [
      String(idx + 1),
      formatBidi(member.name),
      formatBidi(member.role || '—'),
      formatBidi(member.department || '—'),
      member.email || '—',
      member.phone || '—',
      formatBidi((member.skills || []).slice(0, 3).join(', ')) || '—',
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
        font: 'Amiri',
        fontStyle: 'bold',
        fillColor: [24, 24, 27],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        cellPadding: { top: 1.5, right: 1.2, bottom: 1.5, left: 1.2 },
        halign: 'left',
      },
      styles: {
        font: 'Amiri',
        fontStyle: 'normal',
        fontSize: 7.5,
        textColor: [24, 24, 27],
        cellPadding: { top: 1.2, right: 1.2, bottom: 1.2, left: 1.2 },
        lineColor: [228, 228, 231],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 38 },
        2: { cellWidth: 26 },
        3: { cellWidth: 22 },
        4: { cellWidth: 42 },
        5: { cellWidth: 24 },
        6: { cellWidth: 'auto' },
      },
      didDrawPage: (data) => {
        currentY = data.cursor?.y ? data.cursor.y + 8 : margin;
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
  const sigY = pageHeight - 32;

  // Sign Box 1
  doc.line(margin, sigY, margin + sigColWidth, sigY);
  doc.setFont('Amiri', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Team Lead Signature & Acceptance', margin, sigY + 4);
  doc.text('Date: _______________________', margin, sigY + 8);

  // Sign Box 2
  doc.line(margin + sigColWidth + 20, sigY, pageWidth - margin, sigY);
  doc.text('Rootline Administrator Authorization', margin + sigColWidth + 20, sigY + 4);
  doc.text('Date: _______________________', margin + sigColWidth + 20, sigY + 8);

  // Running Page Numbering
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Amiri', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 165);
    doc.text(
      `Rootline Team Chooser | Official Document | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const arrayBuffer = doc.output('arraybuffer');
  return { buffer: new Uint8Array(arrayBuffer), filename };
}
