import fs from 'fs';
import path from 'path';
import { parseCandidateFile, generateExportWorkbook } from './lib/excel';
import { recalculateQuotas } from './lib/quota';
import { claimCandidate, releaseCandidate, getDraftState, saveDraftState } from './lib/blob';
import { Lead } from './lib/types';

async function runTests() {
  console.log('=== STARTING TEST VERIFICATION ===');

  // 1. Test CSV Parsing
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
  if (first.name !== 'Alex Johnson') {
    throw new Error(`Expected Alex Johnson, got ${first.name}`);
  }

  // 2. Test Quota Division (Even & Odd remainder)
  console.log('\n--- 2. Testing Quota Division & Odd Remainder Distribution ---');
  const testLeads: Lead[] = [
    {
      id: 'lead-1',
      email: 'lead1@rootline.com',
      name: 'Alice',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'lead-2',
      email: 'lead2@rootline.com',
      name: 'Bob',
      quota: 0,
      pickedCount: 0,
      createdAt: new Date().toISOString(),
    },
  ];

  // 11 candidates / 2 leads => 5 each, with 1 remainder => one lead has 6, other has 5. Total = 11.
  const leadsWithQuota = recalculateQuotas(testLeads, parsedCandidates);
  console.log('Calculated quotas for 11 candidates between 2 leads:');
  leadsWithQuota.forEach((l) => console.log(`  - ${l.name}: quota = ${l.quota}`));

  const totalQuotaAssigned = leadsWithQuota.reduce((sum, l) => sum + l.quota, 0);
  if (totalQuotaAssigned !== 11) {
    throw new Error(`Total quota should be 11, got ${totalQuotaAssigned}`);
  }
  const quotas = leadsWithQuota.map((l) => l.quota).sort();
  if (quotas[0] !== 5 || quotas[1] !== 6) {
    throw new Error(`Expected quotas [5, 6], got [${quotas.join(', ')}]`);
  }
  console.log('✓ Quota split correctly gives 5 and 6 (half each + 1 random remainder)!');

  // 3. Test State Picking & Concurrency Lock
  console.log('\n--- 3. Testing Candidate Pick & Lock ---');
  // Initialize test state
  const state = await getDraftState();
  state.candidates = parsedCandidates;
  state.leads = leadsWithQuota;
  state.settings.isLocked = false;
  await saveDraftState(state);

  const targetCandidateId = parsedCandidates[0].id;
  const lead1 = leadsWithQuota[0];
  const lead2 = leadsWithQuota[1];

  // Lead 1 picks candidate
  const pick1 = await claimCandidate(targetCandidateId, lead1);
  if (!pick1.success) {
    throw new Error(`Lead 1 failed to pick: ${pick1.error}`);
  }
  console.log(`✓ Lead 1 successfully claimed candidate: ${pick1.candidate?.name}`);

  // Lead 2 tries to pick the SAME candidate (should fail immediately)
  const pick2 = await claimCandidate(targetCandidateId, lead2);
  if (pick2.success) {
    throw new Error('Collision failed: Lead 2 was able to claim an already locked candidate!');
  }
  console.log(`✓ Collision prevented: "${pick2.error}"`);

  // 4. Test Excel Export Generation
  console.log('\n--- 4. Testing Excel Workbook Export Generation ---');
  const exportBytes = generateExportWorkbook(state.candidates, state.leads);
  console.log(`✓ Generated Excel export binary size: ${exportBytes.length} bytes`);
  if (exportBytes.length < 1000) {
    throw new Error('Export binary seems too small');
  }

  // 5. Test Release
  console.log('\n--- 5. Testing Candidate Release ---');
  const releaseRes = await releaseCandidate(targetCandidateId, {
    id: lead1.id,
    email: lead1.email,
    isAdmin: false,
  });
  if (!releaseRes.success) {
    throw new Error(`Failed to release: ${releaseRes.error}`);
  }
  console.log('✓ Candidate successfully released back to pool.');

  // Now Lead 2 can pick them
  const pick3 = await claimCandidate(targetCandidateId, lead2);
  if (!pick3.success) {
    throw new Error(`Lead 2 should be able to pick now: ${pick3.error}`);
  }
  console.log(`✓ Lead 2 claimed previously released candidate.`);

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
