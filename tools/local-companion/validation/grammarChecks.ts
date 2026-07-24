// validation/grammarChecks.ts
// Grammar-note contradiction engine. Dispatches on `ContradictionRule.kind`
// and applies the rule generically. The POS tokens, forbidden properties,
// category terms, and reason templates all live in the profile; this module
// is pure matching mechanics.
//
// Each rule emits AT MOST ONE rejection — enough to signal the defect class
// without spamming the drop log. The rule order in the profile determines
// which contradiction surfaces first for a multi-defect note.

import type {
  Rejection,
  RejectionCode,
  ContradictionRule,
  LanguageProfile,
} from './types';

/** Maps an exclusive-category name to its structured rejection code. Future
 *  categories extend this lookup; the engine itself stays untouched. */
const EXCLUSIVE_CATEGORY_CODE: Record<string, RejectionCode> = {
  tense: 'GRAMMAR_MULTI_TENSE',
  person: 'GRAMMAR_MULTI_PERSON',
};

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`\${${key}}`, value);
  }
  return out;
}

function applyRule(
  rule: ContradictionRule,
  noteLower: string,
): Rejection | null {
  const has = (term: string) => noteLower.includes(term);
  const hasAny = (terms: readonly string[]) => terms.some(has);

  if (rule.kind === 'pos-prop') {
    if (!has(rule.posToken)) return null;
    if (rule.unlessHas && hasAny(rule.unlessHas)) return null;
    const matchedProp = rule.forbiddenProps.find(has);
    if (!matchedProp) return null;
    return {
      code: 'GRAMMAR_POS_PROP_CONTRADICTION',
      reason: substitute(rule.reasonTemplate, {
        pos: rule.posToken,
        prop: matchedProp,
      }),
      severity: 'reject',
    };
  }

  if (rule.kind === 'pos-combo') {
    if (!has(rule.posToken)) return null;
    if (rule.unlessHas && hasAny(rule.unlessHas)) return null;
    const everyCategoryHit = rule.requiresOneFromEach.every(hasAny);
    if (!everyCategoryHit) return null;
    return {
      code: 'GRAMMAR_POS_COMBO_CONTRADICTION',
      reason: rule.reason,
      severity: 'reject',
    };
  }

  // exclusive-category
  const matched = rule.terms.filter(has);
  if (matched.length < 2) return null;
  const code = EXCLUSIVE_CATEGORY_CODE[rule.category] ?? 'GRAMMAR_POS_PROP_CONTRADICTION';
  return {
    code,
    reason: substitute(rule.reasonTemplate, { matched: matched.join(', ') }),
    severity: 'reject',
  };
}

/** Profile-driven grammar-note check. Walks the profile's contradictionRules
 *  in order and collects one rejection per firing rule. Returns [] when the
 *  profile has no rules configured. */
export function checkGrammarNote(
  grammaticalNote: string,
  profile: LanguageProfile,
): Rejection[] {
  if (profile.contradictionRules.length === 0) return [];
  const noteLower = (grammaticalNote ?? '').toLowerCase();
  if (noteLower.trim().length === 0) return [];

  const rejections: Rejection[] = [];
  for (const rule of profile.contradictionRules) {
    const r = applyRule(rule, noteLower);
    if (r) rejections.push(r);
  }
  return rejections;
}
