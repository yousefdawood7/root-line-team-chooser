import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { Candidate, ColumnMapping, Lead } from './types';

function cleanHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
}

function isTimestampOrDateHeader(header: string): boolean {
  const h = cleanHeader(header);
  return (
    h.includes('timestamp') ||
    h.includes('date') ||
    h.includes('time') ||
    h.includes('created') ||
    h.includes('submitted')
  );
}

function extractRawRows(
  buffer: Buffer | Uint8Array,
  filename: string
): Record<string, unknown>[] {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  if (isCsv) {
    const text = Buffer.from(buffer).toString('utf-8');
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return parsed.data;
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}

/**
 * Inspect an uploaded spreadsheet and return headers, preview rows, and suggested mapping.
 */
export function inspectCandidateFile(
  buffer: Buffer | Uint8Array,
  filename: string
): {
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  suggestedMapping: ColumnMapping;
} {
  const rawRows = extractRawRows(buffer, filename).filter((row) =>
    Object.values(row).some((val) => String(val).trim() !== '')
  );

  const headers: string[] = [];
  if (rawRows.length > 0) {
    for (const key of Object.keys(rawRows[0])) {
      if (key && !headers.includes(key)) {
        headers.push(key);
      }
    }
  }

  // Suggest mapping based on intelligent heuristics
  let titleCol = '';
  let roleCol = '';
  let departmentCol = '';
  let emailCol = '';
  let phoneCol = '';
  let experienceCol = '';
  let skillsCol = '';
  let notesCol = '';

  for (const h of headers) {
    const cleaned = cleanHeader(h);
    const isTimestamp = isTimestampOrDateHeader(h);

    if (
      !titleCol &&
      !isTimestamp &&
      (cleaned.includes('name') ||
        cleaned.includes('fullname') ||
        cleaned.includes('candidatename') ||
        cleaned.includes('student') ||
        cleaned.includes('person') ||
        cleaned.includes('applicant'))
    ) {
      titleCol = h;
    } else if (!emailCol && cleaned.includes('mail')) {
      emailCol = h;
    } else if (
      !phoneCol &&
      (cleaned.includes('phone') || cleaned.includes('mobile') || cleaned.includes('tel') || cleaned.includes('cell'))
    ) {
      phoneCol = h;
    } else if (
      !roleCol &&
      (cleaned.includes('role') || cleaned.includes('position') || cleaned.includes('title') || cleaned.includes('track') || cleaned.includes('job'))
    ) {
      roleCol = h;
    } else if (
      !departmentCol &&
      (cleaned.includes('department') || cleaned.includes('dept') || cleaned.includes('team') || cleaned.includes('group'))
    ) {
      departmentCol = h;
    } else if (
      !experienceCol &&
      (cleaned.includes('experience') || cleaned.includes('exp') || cleaned.includes('years') || cleaned.includes('level') || cleaned.includes('seniority'))
    ) {
      experienceCol = h;
    } else if (
      !skillsCol &&
      (cleaned.includes('skill') || cleaned.includes('tech') || cleaned.includes('stack'))
    ) {
      skillsCol = h;
    } else if (
      !notesCol &&
      (cleaned.includes('note') || cleaned.includes('bio') || cleaned.includes('about') || cleaned.includes('comment'))
    ) {
      notesCol = h;
    }
  }

  // If no name column was found, pick the first non-timestamp column as default candidate title
  if (!titleCol) {
    const fallbackCol = headers.find((h) => !isTimestampOrDateHeader(h));
    titleCol = fallbackCol || headers[0] || '';
  }

  return {
    headers,
    previewRows: rawRows.slice(0, 3),
    totalRows: rawRows.length,
    suggestedMapping: {
      titleCol,
      roleCol: roleCol || undefined,
      departmentCol: departmentCol || undefined,
      emailCol: emailCol || undefined,
      phoneCol: phoneCol || undefined,
      experienceCol: experienceCol || undefined,
      skillsCol: skillsCol || undefined,
      notesCol: notesCol || undefined,
    },
  };
}

/**
 * Parse an Excel or CSV file buffer into Candidate records with optional explicit column mapping
 */
export function parseCandidateFile(
  buffer: Buffer | Uint8Array,
  filename: string,
  mapping?: ColumnMapping
): Candidate[] {
  const rows = extractRawRows(buffer, filename).filter((row) =>
    Object.values(row).some((val) => String(val).trim() !== '')
  );

  return rows.map((row, index) => {
    let name = '';
    let email = '';
    let phone = '';
    let role = '';
    let department = '';
    let experience = '';
    let notes = '';
    const skills: string[] = [];

    if (mapping) {
      // 1. Explicit Column Mapping provided by user
      if (mapping.titleCol && row[mapping.titleCol] !== undefined) {
        name = String(row[mapping.titleCol] ?? '').trim();
      }
      if (mapping.roleCol && row[mapping.roleCol] !== undefined) {
        role = String(row[mapping.roleCol] ?? '').trim();
      }
      if (mapping.departmentCol && row[mapping.departmentCol] !== undefined) {
        department = String(row[mapping.departmentCol] ?? '').trim();
      }
      if (mapping.emailCol && row[mapping.emailCol] !== undefined) {
        email = String(row[mapping.emailCol] ?? '').trim();
      }
      if (mapping.phoneCol && row[mapping.phoneCol] !== undefined) {
        phone = String(row[mapping.phoneCol] ?? '').trim();
      }
      if (mapping.experienceCol && row[mapping.experienceCol] !== undefined) {
        experience = String(row[mapping.experienceCol] ?? '').trim();
      }
      if (mapping.skillsCol && row[mapping.skillsCol] !== undefined) {
        const rawSkills = String(row[mapping.skillsCol] ?? '').trim();
        rawSkills.split(/[,;|]+/).forEach((s) => {
          const trimmed = s.trim();
          if (trimmed && !skills.includes(trimmed)) skills.push(trimmed);
        });
      }
      if (mapping.notesCol && row[mapping.notesCol] !== undefined) {
        notes = String(row[mapping.notesCol] ?? '').trim();
      }
    } else {
      // 2. Intelligent Auto-Detection Heuristic (ignoring timestamps)
      for (const [key, value] of Object.entries(row)) {
        const cleaned = cleanHeader(key);
        const strVal = String(value ?? '').trim();
        if (!strVal) continue;
        const isTimestamp = isTimestampOrDateHeader(key);

        if (
          !name &&
          !isTimestamp &&
          (cleaned.includes('name') ||
            cleaned.includes('person') ||
            cleaned.includes('student') ||
            cleaned.includes('candidate') ||
            cleaned.includes('applicant'))
        ) {
          name = strVal;
        } else if (!email && cleaned.includes('mail')) {
          email = strVal;
        } else if (
          !phone &&
          (cleaned.includes('phone') || cleaned.includes('mobile') || cleaned.includes('tel') || cleaned.includes('cell'))
        ) {
          phone = strVal;
        } else if (
          !role &&
          (cleaned.includes('role') || cleaned.includes('position') || cleaned.includes('title') || cleaned.includes('track') || cleaned.includes('job'))
        ) {
          role = strVal;
        } else if (
          !department &&
          (cleaned.includes('department') || cleaned.includes('dept') || cleaned.includes('team') || cleaned.includes('group'))
        ) {
          department = strVal;
        } else if (
          !experience &&
          (cleaned.includes('experience') || cleaned.includes('exp') || cleaned.includes('years') || cleaned.includes('level') || cleaned.includes('seniority'))
        ) {
          experience = strVal;
        } else if (cleaned.includes('skill') || cleaned.includes('tech') || cleaned.includes('stack')) {
          strVal.split(/[,;|]+/).forEach((s) => {
            const trimmed = s.trim();
            if (trimmed && !skills.includes(trimmed)) skills.push(trimmed);
          });
        } else if (
          !notes &&
          (cleaned.includes('note') || cleaned.includes('bio') || cleaned.includes('about') || cleaned.includes('comment'))
        ) {
          notes = strVal;
        }
      }
    }

    // Safety fallback: if no name found, look for first non-timestamp column value
    if (!name) {
      for (const [k, v] of Object.entries(row)) {
        if (!isTimestampOrDateHeader(k) && String(v).trim().length > 0) {
          name = String(v).trim();
          break;
        }
      }
    }

    if (!name) {
      name = `Candidate #${index + 1}`;
    }

    const id = `cand_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      id,
      name,
      email: email || undefined,
      phone: phone || undefined,
      role: role || undefined,
      department: department || undefined,
      experience: experience || undefined,
      skills: skills.length > 0 ? skills : undefined,
      notes: notes || undefined,
      rawDetails: row,
      assignedToLeadId: null,
      assignedToLeadName: null,
      assignedToLeadEmail: null,
      assignedAt: null,
      approvalStatus: 'approved',
    };
  });
}

/**
 * Generate a beautifully styled corporate Excel file with the roster & lead assignments using ExcelJS.
 */
export async function generateExportWorkbook(
  candidates: Candidate[] = [],
  leads: Lead[] = [],
  filterLeadId?: string | null
): Promise<{ buffer: Uint8Array; filename: string }> {
  const leadMap = new Map<string, Lead>();
  for (const l of leads) leadMap.set(l.id, l);

  const targetLead = filterLeadId ? leadMap.get(filterLeadId) : null;

  const targetCandidates = targetLead
    ? candidates.filter((c) => c.assignedToLeadId === targetLead.id)
    : candidates;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Rootline Team Chooser';
  wb.created = new Date();

  const safeSheetName = (
    targetLead
      ? `${targetLead.name.replace(/[^\w\s-]/g, '').slice(0, 20)} Squad`
      : 'All Team Assignments'
  ).slice(0, 31);

  const ws = wb.addWorksheet(safeSheetName, {
    views: [{ showGridLines: true }],
  });

  // Title Row (Row 1)
  const titleRow = ws.addRow(['ROOTLINE — CANDIDATE DRAFT & TEAM SELECTION REPORT']);
  titleRow.height = 28;
  titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF18181B' } };
  titleRow.getCell(1).alignment = { vertical: 'middle' };

  // Subtitle Row (Row 2)
  const dateStr = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const teamLabel = targetLead ? `Team: ${targetLead.name} (${targetLead.email})` : 'All Teams';
  const subtitleRow = ws.addRow([`Generated: ${dateStr}  |  ${teamLabel}  |  Total Candidates: ${targetCandidates.length}`]);
  subtitleRow.height = 18;
  subtitleRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF71717A' } };
  subtitleRow.getCell(1).alignment = { vertical: 'middle' };

  // Blank spacer row (Row 3)
  const spacerRow = ws.addRow([]);
  spacerRow.height = 10;

  // Table Headers (Row 4)
  const headers = [
    '#',
    'Candidate Name',
    'Status',
    'Team Lead',
    'Team Lead Email',
    'Assigned Date',
    'Role',
    'Email',
    'Phone',
    'Department',
    'Experience',
    'Skills',
    'Notes',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 24;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
    left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
    bottom: { style: 'medium', color: { argb: 'FF18181B' } },
    right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
  };

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF18181B' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 1 ? 'center' : 'left',
      wrapText: false,
    };
    cell.border = thinBorder;
  });

  const cellBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE4E4E7' } },
    left: { style: 'thin', color: { argb: 'FFE4E4E7' } },
    bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } },
    right: { style: 'thin', color: { argb: 'FFE4E4E7' } },
  };

  if (targetCandidates.length === 0) {
    const emptyRow = ws.addRow(['—', 'No candidates in this roster', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—', '—']);
    emptyRow.height = 20;
    emptyRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF71717A' } };
      cell.border = cellBorder;
      cell.alignment = { vertical: 'middle' };
    });
  } else {
    targetCandidates.forEach((c, idx) => {
      const lead = c.assignedToLeadId ? leadMap.get(c.assignedToLeadId) : null;
      const rowData = [
        idx + 1,
        c.name,
        c.assignedToLeadId ? 'Assigned' : 'Unassigned',
        lead ? lead.name : 'Unassigned',
        lead ? lead.email : '',
        c.assignedAt ? new Date(c.assignedAt).toLocaleString() : '',
        c.role || '',
        c.email || '',
        c.phone || '',
        c.department || '',
        c.experience || '',
        (c.skills || []).join(', '),
        c.notes || '',
      ];

      const row = ws.addRow(rowData);
      row.height = 20;

      const isEven = idx % 2 === 1;
      const rowBgColor = isEven ? 'FFF9FAFB' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Arial',
          size: 9.5,
          color: { argb: 'FF18181B' },
          bold: colNumber === 2,
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };
        cell.border = cellBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 ? 'center' : 'left',
          wrapText: colNumber === 12 || colNumber === 13,
        };
      });
    });
  }

  // Auto-resize columns to fit content
  ws.columns.forEach((col, colIdx) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber <= 3) return;
      const cellVal = cell.value ? String(cell.value) : '';
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });

    const minWidths: Record<number, number> = {
      1: 6,   // #
      2: 24,  // Candidate Name
      3: 14,  // Status
      4: 20,  // Team Lead
      5: 24,  // Team Lead Email
      6: 20,  // Assigned Date
      7: 18,  // Role
      8: 24,  // Email
      9: 16,  // Phone
      10: 16, // Department
      11: 14, // Experience
      12: 30, // Skills
      13: 30, // Notes
    };

    const minWidth = minWidths[colIdx + 1] || 12;
    col.width = Math.max(minWidth, Math.min(50, maxLen + 3));
  });

  // If no single lead was filtered and leads exist, generate a styled Summary sheet
  if (!targetLead && leads.length > 0) {
    const summaryWs = wb.addWorksheet('Summary', {
      views: [{ showGridLines: true }],
    });

    const sTitleRow = summaryWs.addRow(['ROOTLINE — TEAM LEADS QUOTA & SQUAD SUMMARY']);
    sTitleRow.height = 28;
    sTitleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF18181B' } };
    sTitleRow.getCell(1).alignment = { vertical: 'middle' };

    const sSubtitleRow = summaryWs.addRow([`Report Generated: ${dateStr}  |  Total Teams: ${leads.length}`]);
    sSubtitleRow.height = 18;
    sSubtitleRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF71717A' } };
    sSubtitleRow.getCell(1).alignment = { vertical: 'middle' };

    summaryWs.addRow([]).height = 10;

    const sHeaders = [
      'Team Lead',
      'Email',
      'Quota',
      'Candidates Claimed',
      'Remaining Slots',
      'Progress',
      'Team Members',
    ];
    const sHeaderRow = summaryWs.addRow(sHeaders);
    sHeaderRow.height = 24;

    sHeaderRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF18181B' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber >= 3 && colNumber <= 6 ? 'center' : 'left',
      };
      cell.border = thinBorder;
    });

    leads.forEach((lead, lIdx) => {
      const squad = candidates.filter((c) => c.assignedToLeadId === lead.id);
      const claimed = squad.length;
      const remaining = Math.max(0, lead.quota - claimed);
      const pct = lead.quota > 0 ? `${Math.round((claimed / lead.quota) * 100)}%` : '0%';

      const row = summaryWs.addRow([
        lead.name,
        lead.email,
        lead.quota,
        claimed,
        remaining,
        pct,
        squad.map((m) => m.name).join(', ') || 'None',
      ]);
      row.height = 20;

      const isEven = lIdx % 2 === 1;
      const rowBgColor = isEven ? 'FFF9FAFB' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF18181B' }, bold: colNumber === 1 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };
        cell.border = cellBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber >= 3 && colNumber <= 6 ? 'center' : 'left',
        };
      });
    });

    summaryWs.columns.forEach((col, cIdx) => {
      let maxLen = 0;
      col.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber <= 3) return;
        const cellVal = cell.value ? String(cell.value) : '';
        if (cellVal.length > maxLen) {
          maxLen = cellVal.length;
        }
      });
      const minW = [22, 26, 12, 18, 16, 14, 40][cIdx] || 15;
      summaryWs.getColumn(cIdx + 1).width = Math.max(minW, Math.min(60, maxLen + 3));
    });
  }

  const safeLeadName = targetLead
    ? targetLead.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || `Lead_${targetLead.id}`
    : 'All_Teams';
  const filename = `RootLine_Team_${safeLeadName}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: new Uint8Array(buffer), filename };
}
