import * as XLSX from 'xlsx';
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
 * Generate an Excel file with the roster & lead assignments.
 */
export function generateExportWorkbook(
  candidates: Candidate[] = [],
  leads: Lead[] = [],
  filterLeadId?: string | null
): { buffer: Uint8Array; filename: string } {
  const leadMap = new Map<string, Lead>();
  for (const l of leads) leadMap.set(l.id, l);

  const targetLead = filterLeadId ? leadMap.get(filterLeadId) : null;

  const targetCandidates = targetLead
    ? candidates.filter((c) => c.assignedToLeadId === targetLead.id)
    : candidates;

  let exportRows: Record<string, unknown>[] = [];

  if (targetCandidates.length === 0) {
    exportRows = [
      {
        Status: 'No candidates in this roster',
        'Team Lead': targetLead ? targetLead.name : 'All',
        'Export Date': new Date().toLocaleString(),
      },
    ];
  } else {
    exportRows = targetCandidates.map((c, idx) => {
      const lead = c.assignedToLeadId ? leadMap.get(c.assignedToLeadId) : null;
      return {
        '#': idx + 1,
        'Candidate Name': c.name,
        Status: c.assignedToLeadId ? 'Assigned' : 'Unassigned',
        'Team Lead': lead ? lead.name : 'Unassigned',
        'Team Lead Email': lead ? lead.email : '',
        'Assigned Date': c.assignedAt ? new Date(c.assignedAt).toLocaleString() : '',
        Role: c.role || '',
        Email: c.email || '',
        Phone: c.phone || '',
        Department: c.department || '',
        Experience: c.experience || '',
        Skills: (c.skills || []).join(', '),
        Notes: c.notes || '',
        ...(c.rawDetails || {}),
      };
    });
  }

  const wb = XLSX.utils.book_new();
  const safeSheetName = (
    targetLead
      ? `${targetLead.name.replace(/[^\w\s-]/g, '').slice(0, 20)} Squad`
      : 'All Team Assignments'
  ).slice(0, 31);

  const ws = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  if (!targetLead && leads.length > 0) {
    const summaryRows = leads.map((lead) => {
      const teamMembers = candidates.filter((c) => c.assignedToLeadId === lead.id);
      return {
        'Team Lead': lead.name,
        Email: lead.email,
        Quota: lead.quota,
        'Candidates Claimed': teamMembers.length,
        'Remaining Slots': Math.max(0, lead.quota - teamMembers.length),
        'Team Members': teamMembers.map((m) => m.name).join(', '),
      };
    });
    const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  }

  const safeLeadName = targetLead
    ? targetLead.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'All_Teams';
  const filename = `RootLine_Team_${safeLeadName}.xlsx`;

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return { buffer: new Uint8Array(buf), filename };
}
