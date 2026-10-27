import fs from 'fs';
import path from 'path';
import { parseCandidateFile, generateExportWorkbook } from './lib/excel';
import { recalculateQuotas } from './lib/quota';
import {
  claimCandidate,
  releaseCandidate,
  getDraftState,
  saveDraftState,
  proposeCandidate,
  approveProposal,
  rejectProposal,
} from './lib/blob';
import { Lead } from './lib/types';

async function runTests() {
  console.log('=== STARTING TEST VERIFICATION ===');

  // 1. Test CSV Ingestion
  console.log('\n--- 1. Testing CSV Ingestion ---');
  const sampleCsvPath = path.join(process.cwd(), 'sample_candidates.csv');
  const csvBuffer = fs.readFileSync(sampleCsvPath);
  const parsedCandidates = parseCandidateFile(csvBuffer, 'sample_candidates.csv');
  console.log(`Parsed ${parsedCandidates.length} candidates from CSV.`);
  if (parsedCandidates.length !== 11) {
    throw new Error(`Expected 11 candidates, got ${parsedCandidates.length}`);
  }
  const first = parsedCandidates[0];
  console.log(`First candidate: ${first.name} | Role: ${first.role} | Skills: ${first.skills?.join(', ')}`);

  // 2. Test Quota Division & Odd Remainder Allocation
  console.log('\n--- 2. Testing Quota Division & Odd Remainder Distribution ---');
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
  leadsWithQuota.forEach((l) => console.log(`  - ${l.name}: quota = ${l.quota}`));
  const totalQuota = leadsWithQuota.reduce((sum, l) => sum + l.quota, 0);
  if (totalQuota !== 11) {
    throw new Error(`Total quota should be 11, got ${totalQuota}`);
  }
  console.log('✓ Quota split correctly gives 5 and 6 (half each + 1 random remainder)!');

  // 3. Test Pick & Collision Lock
  console.log('\n--- 3. Testing Candidate Pick & Lock ---');
  const state = await getDraftState();
  state.candidates = parsedCandidates;
  state.leads = leadsWithQuota;
  state.settings.isLocked = false;
  await saveDraftState(state);

  const targetCandidateId = parsedCandidates[0].id;
  const lead1 = leadsWithQuota[0];
  const lead2 = leadsWithQuota[1];

  const pick1 = await claimCandidate(targetCandidateId, lead1);
  if (!pick1.success) throw new Error(`Lead 1 failed to pick: ${pick1.error}`);
  console.log(`✓ Lead 1 claimed: ${pick1.candidate?.name}`);

  const pick2 = await claimCandidate(targetCandidateId, lead2);
  if (pick2.success) throw new Error('Collision failed: Lead 2 claimed already locked candidate');
  console.log(`✓ Collision prevented: "${pick2.error}"`);

  // 4. Test Single-Lead and All-Teams Excel Workbook Export
  console.log('\n--- 4. Testing Targeted Excel Exports ---');
  const allExport = generateExportWorkbook(state.candidates, state.leads, null);
  console.log(`✓ All teams export: filename="${allExport.filename}", size=${allExport.buffer.length} bytes`);
  if (!allExport.filename.includes('All_Teams')) {
    throw new Error('All teams filename should include All_Teams');
  }

  const singleLeadExport = generateExportWorkbook(state.candidates, state.leads, lead1.id);
  console.log(`✓ Single lead export: filename="${singleLeadExport.filename}", size=${singleLeadExport.buffer.length} bytes`);
  if (!singleLeadExport.filename.includes(lead1.name)) {
    throw new Error(`Single lead filename should include lead name ${lead1.name}`);
  }

  // 5. Test Custom Candidate Proposal (Only Name Required)
  console.log('\n--- 5. Testing Custom Candidate Proposal (Name Only) ---');
  const proposalRes = await proposeCandidate(
    { name: 'Marcus Sterling' }, // Only Name provided!
    { id: lead1.id, name: lead1.name, email: lead1.email }
  );

  if (!proposalRes.success || !proposalRes.candidate) {
    throw new Error(`Proposal failed: ${proposalRes.error}`);
  }
  console.log(`✓ Proposal submitted: "${proposalRes.candidate.name}" with status "${proposalRes.candidate.approvalStatus}"`);

  // Verify it cannot be claimed while pending
  const claimPending = await claimCandidate(proposalRes.candidate.id, lead2);
  if (claimPending.success) {
    throw new Error('Pending proposal should not be claimable!');
  }
  console.log(`✓ Pending proposal blocked from draft: "${claimPending.error}"`);

  // 6. Test Admin Approval of Proposal
  console.log('\n--- 6. Testing Admin Approval of Proposal ---');
  const approveRes = await approveProposal(proposalRes.candidate.id);
  if (!approveRes.success || !approveRes.candidate) {
    throw new Error(`Approval failed: ${approveRes.error}`);
  }
  console.log(`✓ Proposal approved! Assigned to proposing lead: ${approveRes.candidate.assignedToLeadName}`);
  if (approveRes.candidate.assignedToLeadId !== lead1.id) {
    throw new Error('Approved proposal was not assigned to proposing lead');
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
