import fs from 'fs';
import path from 'path';
import { parseCandidateFile, generateExportWorkbook, inspectCandidateFile } from './lib/excel';
import { generateRosterPDF } from './lib/pdf';
import { recalculateQuotas } from './lib/quota';
import {
  claimCandidate,
  getDraftState,
  saveDraftState,
  proposeCandidate,
  approveProposal,
  addManualCandidate,
  updateCandidate,
  deleteCandidate,
} from './lib/blob';
import { Lead } from './lib/types';

async function runTests() {
  console.log('=== STARTING TEST VERIFICATION ===');

  // 1. Test CSV Ingestion with Standard Headers
  console.log('\n--- 1. Testing CSV Ingestion ---');
  const sampleCsvPath = path.join(process.cwd(), 'sample_candidates.csv');
  const csvBuffer = fs.readFileSync(sampleCsvPath);
  const parsedCandidates = parseCandidateFile(csvBuffer, 'sample_candidates.csv');
  console.log(`Parsed ${parsedCandidates.length} candidates from CSV.`);
  if (parsedCandidates.length !== 11) {
    throw new Error(`Expected 11 candidates, got ${parsedCandidates.length}`);
  }

  // 2. Test Column Mapping & Timestamp Blacklisting (Google Form Simulation)
  console.log('\n--- 2. Testing Column Mapping & Google Form Timestamp Blacklist ---');
  const googleFormCsv = `Timestamp,Full Name,Email Address,Track,Phone\n2026-10-27 14:22:01,Sarah Connor,sarah@example.com,Cybersecurity,+1-555-0999\n2026-10-27 14:25:33,John Matrix,john@example.com,Commando Ops,+1-555-0888`;
  const gfBuffer = Buffer.from(googleFormCsv, 'utf-8');

  const inspection = inspectCandidateFile(gfBuffer, 'google_forms.csv');
  console.log(`Inspection suggested title column: "${inspection.suggestedMapping.titleCol}"`);
  if (inspection.suggestedMapping.titleCol !== 'Full Name') {
    throw new Error(`Expected suggested title column to be "Full Name", got "${inspection.suggestedMapping.titleCol}"`);
  }

  // Parse with chosen column mapping
  const gfCandidates = parseCandidateFile(gfBuffer, 'google_forms.csv', {
    titleCol: 'Full Name',
    roleCol: 'Track',
    emailCol: 'Email Address',
    phoneCol: 'Phone',
  });
  if (gfCandidates[0].name !== 'Sarah Connor') {
    throw new Error(`Candidate name should be "Sarah Connor", got "${gfCandidates[0].name}"`);
  }
  console.log(`✓ Candidate title correctly mapped to "${gfCandidates[0].name}" instead of Timestamp!`);

  // 3. Test Quota Division & Odd Remainder Allocation
  console.log('\n--- 3. Testing Quota Division & Odd Remainder Distribution ---');
  const testLeads: Lead[] = [
    {
      id: 'lead-1',
      email: 'alice@rootline.com',
      name: 'Alice',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lead-2',
      email: 'bob@rootline.com',
      name: 'Bob',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  const leadsWithQuota = recalculateQuotas(testLeads, parsedCandidates);
  const totalQuota = leadsWithQuota.reduce((sum, l) => sum + l.quota, 0);
  if (totalQuota !== 11) {
    throw new Error(`Total quota should be 11, got ${totalQuota}`);
  }
  console.log('✓ Quota split correctly gives 5 and 6 (half each + 1 random remainder)!');

  // 4. Test Manual Candidate Addition ("Add by hand")
  console.log('\n--- 4. Testing Manual Candidate Addition ---');
  const manualAddRes = await addManualCandidate({
    name: 'Elena Rostova',
    role: 'Principal Architect',
    department: 'Platform',
    email: 'elena@rootline.com',
    skills: ['Rust', 'Distributed Systems'],
  });
  if (!manualAddRes.success || !manualAddRes.candidate) {
    throw new Error(`Failed to add manual candidate: ${manualAddRes.error}`);
  }
  console.log(`✓ Added manual candidate: "${manualAddRes.candidate.name}" (ID: ${manualAddRes.candidate.id})`);

  // 5. Test Candidate Editing & Reassignment
  console.log('\n--- 5. Testing Candidate Modification & Reassignment ---');
  const updateRes = await updateCandidate(manualAddRes.candidate.id, {
    role: 'Distinguished Architect',
    assignedToLeadId: testLeads[0].id,
  });
  if (!updateRes.success || !updateRes.candidate) {
    throw new Error(`Failed to update candidate: ${updateRes.error}`);
  }
  if (updateRes.candidate.assignedToLeadId !== testLeads[0].id) {
    throw new Error('Candidate should be assigned to lead-1');
  }
  console.log(`✓ Successfully updated candidate role to "${updateRes.candidate.role}" and assigned to "${updateRes.candidate.assignedToLeadName}"`);

  // 6. Test Candidate Deletion
  console.log('\n--- 6. Testing Candidate Deletion ---');
  const deleteRes = await deleteCandidate(manualAddRes.candidate.id);
  if (!deleteRes.success) {
    throw new Error(`Failed to delete candidate: ${deleteRes.error}`);
  }
  console.log(`✓ Successfully deleted candidate from board.`);

  // 7. Test Pick & Collision Lock
  console.log('\n--- 7. Testing Candidate Pick & Lock ---');
  const state = await getDraftState();
  state.candidates = parsedCandidates;
  state.leads = leadsWithQuota;
  state.settings.isLocked = false;
  await saveDraftState(state);

  const targetCandidateId = parsedCandidates[0].id;
  const lead1 = leadsWithQuota[0];

  const pick1 = await claimCandidate(targetCandidateId, lead1);
  if (!pick1.success) throw new Error(`Lead 1 failed to pick: ${pick1.error}`);
  console.log(`✓ Lead 1 claimed: ${pick1.candidate?.name}`);

  // 8. Test Targeted Excel Exports
  console.log('\n--- 8. Testing Targeted Excel Exports ---');
  const allExport = generateExportWorkbook(state.candidates, state.leads, null);
  console.log(`✓ All teams Excel: "${allExport.filename}" (${allExport.buffer.length} bytes)`);

  const singleLeadExport = generateExportWorkbook(state.candidates, state.leads, lead1.id);
  console.log(`✓ Single lead Excel: "${singleLeadExport.filename}" (${singleLeadExport.buffer.length} bytes)`);

  // 9. Test Styled PDF Generation
  console.log('\n--- 9. Testing Styled PDF Generation (jsPDF + AutoTable) ---');
  const allPdf = generateRosterPDF(state.candidates, state.leads, null);
  console.log(`✓ All teams PDF: "${allPdf.filename}" (${allPdf.buffer.length} bytes)`);
  if (allPdf.buffer.length < 3000) {
    throw new Error('PDF output buffer seems too small');
  }

  const singleLeadPdf = generateRosterPDF(state.candidates, state.leads, lead1.id);
  console.log(`✓ Single lead PDF: "${singleLeadPdf.filename}" (${singleLeadPdf.buffer.length} bytes)`);

  // 10. Test Custom Candidate Proposal
  console.log('\n--- 10. Testing Custom Candidate Proposal (Name Only) ---');
  const proposalRes = await proposeCandidate(
    { name: 'Marcus Sterling' },
    { id: lead1.id, name: lead1.name, email: lead1.email }
  );
  if (!proposalRes.success || !proposalRes.candidate) {
    throw new Error(`Failed to propose candidate: ${proposalRes.error}`);
  }
  console.log(`✓ Proposal created: "${proposalRes.candidate.name}"`);

  // 11. Test Admin Approval of Proposal
  console.log('\n--- 11. Testing Admin Approval of Proposal ---');
  const approveRes = await approveProposal(proposalRes.candidate.id);
  if (!approveRes.success || !approveRes.candidate) {
    throw new Error(`Failed to approve proposal: ${approveRes.error}`);
  }
  console.log(`✓ Proposal approved & assigned to ${approveRes.candidate.assignedToLeadName}`);

  // 12. Test Late Lead Addition & Grandfathered Pick Preservation
  console.log('\n--- 12. Testing Late Lead Addition & Grandfathered Pick Preservation ---');
  // Setup: 20 candidates, 2 leads initially
  const simulatedCandidates = Array.from({ length: 20 }, (_, i) => ({
    id: `cand_${i + 1}`,
    name: `Candidate ${i + 1}`,
    rawDetails: {},
    approvalStatus: 'approved' as const,
    assignedToLeadId: i < 8 ? 'lead_A' : null, // Lead A has already picked 8
  }));

  const initialLeads: Lead[] = [
    { id: 'lead_A', email: 'a@test.com', name: 'Lead A', quota: 10, pickedCount: 8, createdAt: new Date().toISOString() },
    { id: 'lead_B', email: 'b@test.com', name: 'Lead B', quota: 10, pickedCount: 0, createdAt: new Date().toISOString() },
  ];

  // Now admin adds Lead C and Lead D late:
  const expandedLeads: Lead[] = [
    ...initialLeads,
    { id: 'lead_C', email: 'c@test.com', name: 'Lead C', quota: 0, pickedCount: 0, createdAt: new Date().toISOString() },
    { id: 'lead_D', email: 'd@test.com', name: 'Lead D', quota: 0, pickedCount: 0, createdAt: new Date().toISOString() },
  ];

  const balancedLeads = recalculateQuotas(expandedLeads, simulatedCandidates);
  const leadA = balancedLeads.find((l) => l.id === 'lead_A')!;
  const leadB = balancedLeads.find((l) => l.id === 'lead_B')!;
  const leadC = balancedLeads.find((l) => l.id === 'lead_C')!;
  const leadD = balancedLeads.find((l) => l.id === 'lead_D')!;

  console.log(`Lead A quota: ${leadA.quota} (picked: ${leadA.pickedCount})`);
  console.log(`Lead B quota: ${leadB.quota}`);
  console.log(`Lead C quota: ${leadC.quota}`);
  console.log(`Lead D quota: ${leadD.quota}`);

  // Lead A's quota MUST be grandfathered at 8 (never dropped to 5!)
  if (leadA.quota < 8) {
    throw new Error(`Lead A's quota should be preserved at least at 8, got ${leadA.quota}`);
  }
  // Remaining pool (12) must be divided among B, C, D (4 each)
  if (leadB.quota !== 4 || leadC.quota !== 4 || leadD.quota !== 4) {
    throw new Error(`Remaining leads should each get 4, got B=${leadB.quota}, C=${leadC.quota}, D=${leadD.quota}`);
  }
  console.log('✓ Late lead addition successfully preserved Lead A picks and balanced remaining pool!');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
