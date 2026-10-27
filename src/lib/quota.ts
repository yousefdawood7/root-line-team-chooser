import { Lead, Candidate } from './types';

/**
 * Distributes candidate quotas equally among leads.
 * If totalCandidates % leads.length !== 0, distributes the remainder randomly among the leads.
 * Leads with customQuota will have their custom quota respected.
 */
export function recalculateQuotas(
  leads: Lead[],
  candidates: Candidate[]
): Lead[] {
  if (leads.length === 0) return [];

  const totalCandidates = candidates.length;

  // Calculate actual picked count for each lead
  const pickedCounts = new Map<string, number>();
  for (const c of candidates) {
    if (c.assignedToLeadId) {
      pickedCounts.set(c.assignedToLeadId, (pickedCounts.get(c.assignedToLeadId) || 0) + 1);
    }
  }

  // Count leads without custom overrides
  const leadsWithoutCustom = leads.filter(l => l.customQuota === undefined || l.customQuota === null);
  const totalCustomQuota = leads
    .filter(l => l.customQuota !== undefined && l.customQuota !== null)
    .reduce((sum, l) => sum + (l.customQuota ?? 0), 0);

  const remainingCandidatesToDistribute = Math.max(0, totalCandidates - totalCustomQuota);

  let baseQuota = 0;
  let remainder = 0;

  if (leadsWithoutCustom.length > 0) {
    baseQuota = Math.floor(remainingCandidatesToDistribute / leadsWithoutCustom.length);
    remainder = remainingCandidatesToDistribute % leadsWithoutCustom.length;
  }

  // Pick random indices among leadsWithoutCustom to receive the +1 remainder
  const bonusIndices = new Set<number>();
  if (remainder > 0 && leadsWithoutCustom.length > 0) {
    // Generate array of indices
    const available = leadsWithoutCustom.map((_, i) => i);
    // Shuffle
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (let i = 0; i < remainder; i++) {
      bonusIndices.add(available[i]);
    }
  }

  let unassignedIndex = 0;
  return leads.map((lead) => {
    let quota = lead.quota;
    if (lead.customQuota !== undefined && lead.customQuota !== null) {
      quota = lead.customQuota;
    } else {
      const hasBonus = bonusIndices.has(unassignedIndex);
      quota = baseQuota + (hasBonus ? 1 : 0);
      unassignedIndex++;
    }

    return {
      ...lead,
      quota,
      pickedCount: pickedCounts.get(lead.id) || 0,
    };
  });
}
