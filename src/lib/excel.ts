import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Candidate, Lead } from './types';

// Helper to normalize column header
function cleanHeader(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '');
}

/**
 * Parse an Excel or CSV file buffer into Candidate records
 */
export function parseCandidateFile(
  buffer: Buffer | Uint8Array,
  filename: string
): Candidate[] {
  const isCsv = filename.toLowerCase().endsWith('.csv');
  let rows: Record<string, any>[] = [];

  if (isCsv) {
    const text = Buffer.from(buffer).toString('utf-8');
    const parsed = Papa.parse<Record<string, any>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    rows = parsed.data;
  } else {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  }

  return rows
    .filter((row) => Object.values(row).some((val) => String(val).trim() !== ''))
    .map((row, index) => {
      let name = '';
      let email = '';
      let phone = '';
      let role = '';
      let department = '';
      let experience = '';
      let notes = '';
      const skills: string[] = [];

      for (const [key, value] of Object.entries(row)) {
        const cleaned = cleanHeader(key);
        const strVal = String(value ?? '').trim();
        if (!strVal) continue;

        if (!name && (cleaned.includes('name') || cleaned.includes('person') || cleaned.includes('student') || cleaned.includes('candidate'))) {
          name = strVal;
        } else if (!email && cleaned.includes('mail')) {
          email = strVal;
        } else if (!phone && (cleaned.includes('phone') || cleaned.includes('mobile') || cleaned.includes('tel') || cleaned.includes('cell'))) {
          phone = strVal;
        } else if (!role && (cleaned.includes('role') || cleaned.includes('position') || cleaned.includes('title') || cleaned.includes('track') || cleaned.includes('job'))) {
          role = strVal;
        } else if (!department && (cleaned.includes('department') || cleaned.includes('dept') || cleaned.includes('team') || cleaned.includes('group'))) {
          department = strVal;
        } else if (!experience && (cleaned.includes('experience') || cleaned.includes('exp') || cleaned.includes('years') || cleaned.includes('level') || cleaned.includes('seniority'))) {
          experience = strVal;
        } else if (cleaned.includes('skill') || cleaned.includes('tech') || cleaned.includes('stack')) {
          strVal.split(/[,;|]+/).forEach((s) => {
            const trimmed = s.trim();
            if (trimmed && !skills.includes(trimmed)) skills.push(trimmed);
          });
        } else if (!notes && (cleaned.includes('note') || cleaned.includes('bio') || cleaned.includes('about') || cleaned.includes('comment'))) {
          notes = strVal;
        }
      }

      // Fallback name if none detected
      if (!name) {
        const firstNonEmptyVal = Object.values(row).find((v) => String(v).trim().length > 0);
        name = firstNonEmptyVal ? String(firstNonEmptyVal) : `Candidate #${index + 1}`;
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
      };
    });
}

/**
 * Generate an Excel file with the full roster & lead assignments
 */
export function generateExportWorkbook(candidates: Candidate[], leads: Lead[]): Uint8Array {
  const leadMap = new Map<string, Lead>();
  for (const l of leads) leadMap.set(l.id, l);

  const exportRows = candidates.map((c, idx) => {
    const lead = c.assignedToLeadId ? leadMap.get(c.assignedToLeadId) : null;
    return {
      '#': idx + 1,
      'Candidate Name': c.name,
      'Status': c.assignedToLeadId ? 'Assigned' : 'Unassigned',
      'Assigned Team Lead': lead ? lead.name : 'None',
      'Team Lead Email': lead ? lead.email : 'None',
      'Assigned At': c.assignedAt ? new Date(c.assignedAt).toLocaleString() : '',
      'Role': c.role || '',
      'Email': c.email || '',
      'Phone': c.phone || '',
      'Department': c.department || '',
      'Experience': c.experience || '',
      'Skills': (c.skills || []).join(', '),
      'Notes': c.notes || '',
      ...c.rawDetails,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Team Assignments');

  // Also add a summary sheet per Team Lead
  const summaryRows = leads.map((lead) => {
    const teamMembers = candidates.filter((c) => c.assignedToLeadId === lead.id);
    return {
      'Team Lead': lead.name,
      'Email': lead.email,
      'Quota': lead.quota,
      'Picks Claimed': teamMembers.length,
      'Remaining Quota': Math.max(0, lead.quota - teamMembers.length),
      'Members': teamMembers.map((m) => m.name).join(', '),
    };
  });
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Leads Summary');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Uint8Array(buf);
}
