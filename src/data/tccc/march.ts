import type { MarchLetter } from '@/engine/types';
import { ALL_TCCC_RULES } from './rules';

/**
 * Maps MARCH letters to TCCC rule IDs that opted into a MARCH category.
 * Phase of care remains independent — not every rule is listed here.
 */
export function getTcccRuleIdsForMarch(letter: MarchLetter): string[] {
  return ALL_TCCC_RULES.filter((rule) => rule.march === letter).map((rule) => rule.id);
}

export const MARCH_TCCC_RULE_IDS: Record<MarchLetter, string[]> = {
  M: getTcccRuleIdsForMarch('M'),
  A: getTcccRuleIdsForMarch('A'),
  R: getTcccRuleIdsForMarch('R'),
  C: getTcccRuleIdsForMarch('C'),
  H: getTcccRuleIdsForMarch('H'),
};
