import { CHECKLIST_CONDITION_LABELS } from "../server-table";

/**
 * "Condição geral" as the create and edit forms offer it, from the same
 * labels the table, its filter and the details dialog show. Each form kept
 * its own copy: creating said "Reprovado", editing said "Rejeitado", and the
 * table's filter — "Reprovado" — did not match what the edit form had shown.
 */
const OVERALL_CONDITION_OPTIONS = (
  Object.entries(CHECKLIST_CONDITION_LABELS) as [
    keyof typeof CHECKLIST_CONDITION_LABELS,
    string,
  ][]
).map(([value, label]) => ({ value, label }));

export { OVERALL_CONDITION_OPTIONS };
