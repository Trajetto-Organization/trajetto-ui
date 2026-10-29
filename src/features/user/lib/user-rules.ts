/**
 * The user screens' pure rules, shared by the server content, the client
 * components and their tests. No directive and no hooks: both graphs import
 * it.
 */

type ActorRole = "MASTER" | "BUSINESS_ADMIN" | "BUSINESS_USER";

/** The roles a company user can hold (a MASTER is not a company user). */
type ListedRole = "BUSINESS_ADMIN" | "BUSINESS_USER";

const ROLE_LABELS: Record<ListedRole, string> = {
  BUSINESS_ADMIN: "Administrador",
  BUSINESS_USER: "Usuário",
};

/** The access facet's values, as the API names them. */
const ACCESS_LABELS = {
  active: "Liberado",
  revoked: "Revogado",
} as const;

const TWO_FACTOR_LABELS = {
  enabled: "Habilitada",
  disabled: "Desabilitada",
} as const;

interface FacetCount {
  value: string;
  label?: string;
  count: number;
}

/** The NDJSON meta line's `searchMeta` of GET /user/list-user. */
interface UserListSearchMeta {
  total?: number;
  active?: number;
  revoked?: number;
  twoFactor?: number;
  twoFactorTotal?: number;
  emailVerified?: number;
  facets?: Record<string, FacetCount[]>;
}

/**
 * The cards' numbers, from the server's `searchMeta` only (decision 8.8):
 * counted over the whole company under the other filters. The old cards
 * counted "ativos", "2FA" and "e-mail verificado" among the ten rows on
 * screen and set them beside the company's total. Undefined when the API did
 * not send them, so a card says "—" instead of a confident zero.
 */
function userStatsData(
  searchMeta: UserListSearchMeta | undefined,
  listTotal: number | undefined,
) {
  return {
    totalUsers: searchMeta?.total,
    activeUsers: searchMeta?.active,
    twoFactor: searchMeta?.twoFactor,
    twoFactorTotal: searchMeta?.twoFactorTotal,
    emailVerified: searchMeta?.emailVerified,
    // The verified count is taken under every filter: its share is over the
    // list the pager counts, not over the card total.
    listTotal: searchMeta ? listTotal : undefined,
  };
}

/** What the form edits, as the form holds it (strings; "" = none). */
interface UserFormValues {
  email: string;
  name: string;
  role: string;
  businessId: string;
  profileAccessId: string;
  driverId: string;
}

interface UserRecordForForm {
  email: string;
  name: string;
  role: string;
  businessId?: string | null;
  profileAccessId?: string | null;
  driverId?: string | null;
}

function userFormValuesOf(user: UserRecordForForm | undefined): UserFormValues {
  return {
    email: user?.email ?? "",
    name: user?.name ?? "",
    role: user?.role ?? "",
    businessId: user?.businessId ?? "",
    profileAccessId: user?.profileAccessId ?? "",
    driverId: user?.driverId ?? "",
  };
}

/** A company user is a login of a driver, or staff with an access profile. */
type UserType = "employee" | "driver";

function userTypeOf(values: Pick<UserFormValues, "driverId">): UserType {
  return values.driverId ? "driver" : "employee";
}

/**
 * The role the form sends. A Motorista is always a plain user: the dialog
 * asks the level only of a Colaborador (decision 16.62), so a driver created
 * before a level was picked, or an administrator switched to Motorista, goes
 * out as BUSINESS_USER.
 */
function effectiveRole(role: string, userType: UserType): string {
  return userType === "driver" ? "BUSINESS_USER" : role;
}

/**
 * Spaces around a value are no change. A different case in the e-mail is:
 * it is a new stored value, although the API finds the address either way.
 */
function normalized(value: string | undefined): string {
  return (value ?? "").trim();
}

/**
 * Which fields the person changed (decision 2.5: Save stays disabled until
 * something did). The API compares the same way, so sending the whole form
 * back unchanged is never a change there either (USR-EDIT-1).
 */
function changedUserFields(
  original: UserFormValues,
  current: UserFormValues,
): Array<keyof UserFormValues> {
  const effective = effectiveLinks(current);

  return (Object.keys(original) as Array<keyof UserFormValues>).filter(
    (field) => normalized(effective[field]) !== normalized(original[field]),
  );
}

/** An administrator carries neither a profile nor a driver. */
function effectiveLinks(values: UserFormValues): UserFormValues {
  if (values.role === "BUSINESS_ADMIN") {
    return { ...values, profileAccessId: "", driverId: "" };
  }

  return values;
}

/**
 * Whether saving these values ends the person's sessions (decision 4.6,
 * mirrored from the API's planUserUpdate): a new role, company or driver
 * link. Renaming, a new e-mail or another profile do not. The company no
 * longer changes from this form (decision 16.62). The dialog says so
 * before the person saves.
 */
function editEndsSessions(
  original: UserFormValues,
  current: UserFormValues,
): boolean {
  const changed = changedUserFields(original, current);

  return (
    changed.includes("role") ||
    changed.includes("businessId") ||
    changed.includes("driverId")
  );
}

/** The roles the actor may give (and edit): never above their own. */
function roleOptionsFor(actorRole: ActorRole | null | undefined) {
  const roles: ListedRole[] =
    actorRole === "BUSINESS_USER"
      ? ["BUSINESS_USER"]
      : ["BUSINESS_ADMIN", "BUSINESS_USER"];

  return roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
}

/**
 * Why the actor may not revoke or restore this person's access, or null.
 * The API's route admits only MASTERs and administrators.
 */
function revokeBlockedReason(
  actorRole: ActorRole | null | undefined,
): string | null {
  if (actorRole === "MASTER" || actorRole === "BUSINESS_ADMIN") return null;

  return "Só administradores podem revogar ou restaurar o acesso de um usuário.";
}

/**
 * The form's validation, before anything is sent: the same rules the API
 * applies (both schemas say the same sentences).
 */
function userLinkIssue(
  values: UserFormValues,
  userType: UserType,
): {
  field: "profileAccessId" | "driverId";
  message: string;
} | null {
  if (values.role !== "BUSINESS_USER") return null;

  if (userType === "driver" && !values.driverId) {
    return { field: "driverId", message: "Selecione um motorista." };
  }

  if (userType === "employee" && !values.profileAccessId) {
    return {
      field: "profileAccessId",
      message: "Selecione um perfil de acesso.",
    };
  }

  return null;
}

/** What the master form edits: a master has no role choice, company or link. */
interface MasterFormValues {
  email: string;
  name: string;
}

function masterFormValuesOf(
  master: Pick<UserRecordForForm, "email" | "name"> | undefined,
): MasterFormValues {
  return { email: master?.email ?? "", name: master?.name ?? "" };
}

/**
 * Which master fields changed (decision 2.5). Asking for a password link is
 * a change of its own, so the dialog enables Save for it too.
 */
function changedMasterFields(
  original: MasterFormValues,
  current: MasterFormValues,
): Array<keyof MasterFormValues> {
  return (Object.keys(original) as Array<keyof MasterFormValues>).filter(
    (field) => normalized(current[field]) !== normalized(original[field]),
  );
}

export {
  ACCESS_LABELS,
  changedMasterFields,
  masterFormValuesOf,
  type MasterFormValues,
  ROLE_LABELS,
  TWO_FACTOR_LABELS,
  changedUserFields,
  editEndsSessions,
  effectiveLinks,
  effectiveRole,
  revokeBlockedReason,
  roleOptionsFor,
  userFormValuesOf,
  userLinkIssue,
  userStatsData,
  userTypeOf,
  type ActorRole,
  type ListedRole,
  type UserFormValues,
  type UserListSearchMeta,
  type UserType,
};
