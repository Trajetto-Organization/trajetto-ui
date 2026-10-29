import { permissionLabels, permissions } from "@/lib/permissions";
import { permissionKeysInPlan } from "@/lib/route-access";

import type { UserRole } from "@/app/(protected)/_components/shared/common.types";

/**
 * The permission screens' pure rules, shared by the server content, the
 * client components and their tests. No directive and no hooks: both graphs
 * import it.
 */

/** The read/write facets' values, as the API names them. */
const FLAG_LABELS = {
  enabled: "Habilitada",
  disabled: "Desabilitada",
} as const;

interface FacetCount {
  value: string;
  label?: string;
  count: number;
}

/** The NDJSON meta line's `searchMeta` of GET /permission/list-permission. */
interface PermissionListSearchMeta {
  /** Every filter but write, so Com escrita + Só leitura = Total. */
  total?: number;
  writable?: number;
  readOnly?: number;
  facets?: Record<string, FacetCount[]>;
}

/**
 * The cards' numbers, from the server's `searchMeta` only (decision 8.8):
 * counted over the whole company under the other filters. Undefined when the
 * API did not send them, so a card says "—" instead of a confident zero.
 */
function permissionStatsData(searchMeta: PermissionListSearchMeta | undefined) {
  return {
    totalPermissions: searchMeta?.total,
    writable: searchMeta?.writable,
    readOnly: searchMeta?.readOnly,
  };
}

interface PlanContext {
  role: UserRole | null | undefined;
  enabledModules?: readonly string[] | null;
}

/**
 * The resources a permission can grant in this company's plan, labelled, in
 * the canonical order. Without a plan context every key is listed (the old
 * behaviour, kept for callers with no session). `currentKey` stays listed so
 * editing a permission never blanks its own value.
 */
function resourceOptions(
  plan?: PlanContext,
  currentKey?: string,
): Array<{ value: string; label: string }> {
  const all = Object.values(permissions);
  const keys = plan
    ? permissionKeysInPlan(all, plan, currentKey ? [currentKey] : [])
    : all;

  return keys.map((key) => ({ value: key, label: permissionLabels[key] }));
}

/**
 * The "Recurso" filter's labels: the plan's keys, plus any key the company
 * still has rows for (the server counts them), so old rows stay filterable.
 */
function resourceFacetLabels(
  plan: PlanContext,
  keysWithRows: readonly string[],
): Record<string, string> {
  return Object.fromEntries(
    permissionKeysInPlan(Object.values(permissions), plan, keysWithRows).map(
      (key) => [key, permissionLabels[key]],
    ),
  );
}

/** "Veículos" for a known key; the raw key for one this build does not know. */
function resourceLabel(key: string): string {
  return (permissionLabels as Record<string, string>)[key] ?? key;
}

/** What the form edits, as the form holds it. */
interface PermissionFormValues {
  action: string;
  permissionKey: string;
  profileAccessId: string;
  canRead: boolean;
  canWrite: boolean;
}

interface PermissionRecordForForm {
  action: string;
  permissionKey: string;
  profileAccessId: string;
  canRead: boolean;
  canWrite: boolean;
}

function permissionFormValuesOf(
  permission: PermissionRecordForForm | undefined,
): PermissionFormValues {
  return {
    action: permission?.action ?? "",
    permissionKey: permission?.permissionKey ?? "",
    profileAccessId: permission?.profileAccessId ?? "",
    // A new permission starts with read, which every permission needs.
    canRead: permission?.canRead ?? true,
    canWrite: permission?.canWrite ?? false,
  };
}

/**
 * Writing without reading grants nothing (the API refuses it, and its gate
 * reads such a row as no access): unticking read unticks write.
 */
function withReadRule(values: PermissionFormValues): PermissionFormValues {
  return values.canRead ? values : { ...values, canWrite: false };
}

/**
 * Which fields the person changed (decision 2.5: Save stays disabled until
 * something did). Spaces around the name are no change.
 */
function changedPermissionFields(
  original: PermissionFormValues,
  current: PermissionFormValues,
): Array<keyof PermissionFormValues> {
  const next = withReadRule(current);

  return (Object.keys(original) as Array<keyof PermissionFormValues>).filter(
    (field) =>
      field === "action"
        ? original.action.trim() !== next.action.trim()
        : original[field] !== next[field],
  );
}

/**
 * The form's own check before anything is sent: the same rule the API
 * applies to create, update and bulk (read is mandatory).
 */
function permissionFormIssue(values: PermissionFormValues): {
  field: "canRead" | "profileAccessId" | "permissionKey";
  message: string;
} | null {
  if (!values.profileAccessId) {
    return {
      field: "profileAccessId",
      message: "Selecione o perfil de acesso.",
    };
  }

  if (!values.permissionKey) {
    return { field: "permissionKey", message: "Selecione a permissão." };
  }

  if (!values.canRead) {
    return {
      field: "canRead",
      message:
        "Selecione a opção Leitura (caso deseje, marque também Escrita).",
    };
  }

  return null;
}

export {
  FLAG_LABELS,
  changedPermissionFields,
  permissionFormIssue,
  permissionFormValuesOf,
  permissionStatsData,
  resourceLabel,
  resourceFacetLabels,
  resourceOptions,
  withReadRule,
  type PermissionFormValues,
  type PermissionListSearchMeta,
};
