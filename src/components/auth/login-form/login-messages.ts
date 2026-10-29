/**
 * What the login page says when a session ended, keyed by `?reason=`.
 *
 * Every forced logout (lib/force-logout ForceLogoutReason) reaches the
 * middleware as `?error=<reason>&force_logout=true` and lands here as
 * `?reason=<reason>`; a reason missing from this record shows no message at
 * all. tests/unitaires/login-messages.test.ts keeps the two lists together.
 *
 * No directive and no imports: the hook reads it and the tests import it.
 */
type MessageType = "error" | "success";

interface MessageInfo {
  text: string;
  type: MessageType;
}

const LOGIN_MESSAGES: Record<string, MessageInfo> = {
  session_expired: {
    text: "Sua sessão expirou. Faça login novamente.",
    type: "error",
  },
  session_not_renewed: {
    text: "Não foi possível renovar sua sessão. Faça login novamente.",
    type: "error",
  },
  no_user_permission: {
    text: "Usuário sem perfil de acesso ou permissões configuradas! Por favor, contate o administrador.",
    type: "error",
  },
  user_revoked: {
    text: "Seu acesso foi revogado! Para acessar a plataforma novamente, por favor contate o administrador.",
    type: "error",
  },
  // The company itself was switched off (AUTH_BUSINESS_INACTIVE /
  // TENANT_INACTIVE): nothing about this person's own access changed.
  business_inactive: {
    text: "Esta empresa está desativada. Para acessar a plataforma novamente, entre em contato com o administrador.",
    type: "error",
  },
  // AUTH_BRANCH_INACTIVE: the driver's branch, not the account.
  branch_inactive: {
    text: "A filial do seu cadastro de motorista está desativada. Para acessar a plataforma novamente, entre em contato com o administrador.",
    type: "error",
  },
  driver_inactive: {
    text: "Seu cadastro como motorista está inativo! Para acessar a plataforma novamente, por favor contate o administrador.",
    type: "error",
  },
  access_denied: {
    text: "Sua conta foi excluída ou não está autorizada. Por favor, entre em contato com o administrador.",
    type: "error",
  },
  permissions_changed: {
    text: "Suas permissões de acesso foram atualizadas. Por favor, faça login novamente para continuar.",
    type: "error",
  },
  // The API's 'role_changed' (decision 4.6): role, company or linked driver
  // changed, and the session was ended on purpose, not expired.
  role_changed: {
    text: "Seu acesso foi alterado por um administrador. Entre novamente.",
    type: "error",
  },
  service_unavailable: {
    text: "Não foi possível confirmar sua sessão com o servidor. Verifique sua conexão e faça login novamente.",
    type: "error",
  },
  logout: {
    text: "Você saiu da sua conta com sucesso!",
    type: "success",
  },
};

/**
 * The message for a `?reason=`, or null. Own keys only: the reason comes from
 * the URL, and `"constructor" in LOGIN_MESSAGES` is true for a plain object.
 */
function loginMessageFor(reason: string | null): MessageInfo | null {
  if (
    !reason ||
    !Object.prototype.hasOwnProperty.call(LOGIN_MESSAGES, reason)
  ) {
    return null;
  }

  return LOGIN_MESSAGES[reason];
}

export { LOGIN_MESSAGES, loginMessageFor };
export type { MessageInfo, MessageType };
