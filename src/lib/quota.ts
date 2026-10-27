import { Lead, Candidate } from './types';

export interface QuotaCalculationResult {
  leads: Lead[];
  totalCandidates: number;
  baseQuota: number;
  remainder: number;
  hasCappedPicks: boolean;
  cappedLeadsCount: number;
}

/**
 * Distributes candidate quotas fairly among leads with Pick-Preservation & Grandfathering Protection.
 *
 * Rules:
 * 1. Leads with `customQuota` have their manual override strictly respected.
 * 2. Grandfathering floor: If a lead already legitimately picked more candidates than the newly
 *    calculated standard quota (e.g. because new leads were added late), their quota NEVER drops
 *    below their existing `pickedCount`. Their picks are preserved and their quota is locked at their picks.
 * 3. The remaining unassigned candidates are divided evenly among all remaining leads that have room to grow.
 * 4. Remainder candidates (+1 bonus) are distributed among the flexible leads.
 * 5. Total quotas never exceed the total candidate count.
 */
export function recalculateQuotas(
  leads: Lead[],
  candidates: Candidate[]
): Lead[] {
  if (leads.length === 0) return [];

  // Approved candidates count (pending proposals do not count toward quota pool)
  const approvedCandidates = candidates.filter((c) => c.approvalStatus !== 'pending');
  const totalCandidates = approvedCandidates.length;

  // Calculate actual picked count for each lead
  const pickedCounts = new Map<string, number>();
  for (const c of approvedCandidates) {
    if (c.assignedToLeadId) {
      pickedCounts.set(c.assignedToLeadId, (pickedCounts.get(c.assignedToLeadId) || 0) + 1);
    }
  }

  // Iterative water-filling algorithm to handle grandfathered floors and custom quotas
  const assignedQuotas = new Map<string, number>();
  const isFixed = new Set<string>();

  // 1. First, lock in leads with customQuota overrides
  for (const lead of leads) {
    if (lead.customQuota !== undefined && lead.customQuota !== null) {
      assignedQuotas.set(lead.id, lead.customQuota);
      isFixed.add(lead.id);
    }
  }

  // 2. Iteratively identify leads whose existing picks exceed the fair share of remaining candidates
  let changed = true;
  while (changed) {
    changed = false;
    const flexibleLeads = leads.filter((l) => !isFixed.has(l.id));
    if (flexibleLeads.length === 0) break;

    const lockedTotal = Array.from(assignedQuotas.values()).reduce((sum, q) => sum + q, 0);
    const remainingForFlexible = Math.max(0, totalCandidates - lockedTotal);
    const avgQuota = Math.floor(remainingForFlexible / flexibleLeads.length);

    // If any flexible lead has already picked MORE than the average fair share,
    // lock their quota at their pickedCount (grandfather floor) so their picks are never discarded
    for (const lead of flexibleLeads) {
      const picks = pickedCounts.get(lead.id) || 0;
      if (picks > avgQuota) {
        assignedQuotas.set(lead.id, picks);
        isFixed.add(lead.id);
        changed = true;
        break; // re-run distribution with updated locked pool
      }
    }
  }

  // 3. Distribute remaining candidates among truly flexible leads
  const flexibleLeads = leads.filter((l) => !isFixed.has(l.id));
  if (flexibleLeads.length > 0) {
    const lockedTotal = Array.from(assignedQuotas.values()).reduce((sum, q) => sum + q, 0);
    const remainingForFlexible = Math.max(0, totalCandidates - lockedTotal);
    const baseQuota = Math.floor(remainingForFlexible / flexibleLeads.length);
    const remainder = remainingForFlexible % flexibleLeads.length;

    // Pick random indices among flexibleLeads for the remainder bonus
    const bonusIndices = new Set<number>();
    if (remainder > 0) {
      const available = flexibleLeads.map((_, i) => i);
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }
      for (let i = 0; i < remainder; i++) {
        bonusIndices.add(available[i]);
      }
    }

    flexibleLeads.forEach((lead, idx) => {
      const hasBonus = bonusIndices.has(idx);
      assignedQuotas.set(lead.id, baseQuota + (hasBonus ? 1 : 0));
    });
  }

  return leads.map((lead) => {
    const quota = assignedQuotas.get(lead.id) ?? lead.quota ?? 0;
    const pickedCount = pickedCounts.get(lead.id) || 0;

    return {
      ...lead,
      quota,
      pickedCount,
    };
  });
}

/**
 * Helper to compute quota preview when adding a new lead or inspecting current division
 */
export function getQuotaProjection(
  leads: Lead[],
  candidates: Candidate[],
  newLeadWillBeAdded = false
): {
  totalCandidates: number;
  leadCount: number;
  autoQuota: number;
  remainder: number;
  hasCappedLeads: boolean;
  cappedLeadNames: string[];
} {
  const approvedCandidates = candidates.filter((c) => c.approvalStatus !== 'pending');
  const totalCandidates = approvedCandidates.length;

  const testLeads: Lead[] = newLeadWillBeAdded
    ? [
        ...leads,
        {
          id: 'temp_lead',
          email: 'temp@lead.com',
          name: 'New Lead',
          quota: 0,
          pickedCount: 0,
          createdAt: new Date().toISOString(),
        },
      ]
    : leads;

  const recalculated = recalculateQuotas(testLeads, approvedCandidates);

  const cappedLeadNames: string[] = [];
  for (const l of recalculated) {
    if (l.id !== 'temp_lead' && l.customQuota == null) {
      // If pickedCount equals quota and quota > normal base, it was grandfathered
      const picks = l.pickedCount || 0;
      if (picks > 0 && picks === l.quota) {
        cappedLeadNames.push(l.name);
      }
    }
  }

  const normalLeads = recalculated.filter((l) => l.customQuota == null);
  const minAuto = normalLeads.length > 0 ? Math.min(...normalLeads.map((l) => l.quota)) : 0;
  const maxAuto = normalLeads.length > 0 ? Math.max(...normalLeads.map((l) => l.quota)) : 0;

  return {
    totalCandidates,
    leadCount: testLeads.length,
    autoQuota: minAuto,
    remainder: maxAuto > minAuto ? 1 : 0,
    hasCappedLeads: cappedLeadNames.length > 0,
    cappedLeadNames,
  };
}
