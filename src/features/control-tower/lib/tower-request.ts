import { classifyAccessError, type AccessError } from "@/lib/access-error";

/**
 * A refused or failed read of the tower, as something react-query can hold.
 *
 * The actions answer `{ success: false }` instead of throwing, and the panel
 * used to hand that object to react-query as data: a 403 or a 5xx on a poll
 * REPLACED the last good tower, the map went to "0 veículos" and the widgets
 * back to skeletons forever, with no message (UI-TWR-1). Thrown instead,
 * react-query keeps the previous data and exposes the error beside it.
 */
class TowerRequestError extends Error {
  readonly code: string | undefined;
  readonly status: number | undefined;

  constructor(message: string, code?: string, status?: number) {
    super(message);

    this.name = "TowerRequestError";
    this.code = code;
    this.status = status;
  }
}

interface Answer<T> {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
  status?: number;
}

/** The data of a successful answer; anything else is thrown. */
function unwrapAnswer<T>(answer: Answer<T>): T {
  if (answer.success && answer.data !== undefined) return answer.data;

  throw new TowerRequestError(
    answer.message || "Não foi possível carregar os dados.",
    answer.code,
    answer.status,
  );
}

/**
 * A refusal asking again cannot fix: the module is not hired, the profile
 * does not reach the screen, the company is inactive, the session is gone.
 * Retrying those only delays the message.
 */
const PERMANENT_CODES = new Set([
  "MODULE_NOT_ENABLED",
  "PERMISSION_DENIED",
  "TENANT_INACTIVE",
  "TENANT_ACCESS_DENIED",
  "DRIVER_CANNOT_VIEW_PANELS",
  "UNAUTHENTICATED",
]);

function isPermanentFailure(error: unknown): boolean {
  if (!(error instanceof TowerRequestError)) return false;

  if (error.code && PERMANENT_CODES.has(error.code)) return true;

  return error.status === 401 || error.status === 403 || error.status === 404;
}

/** react-query's `retry`: transient failures twice, permanent ones never. */
function retryTransient(failureCount: number, error: unknown): boolean {
  return !isPermanentFailure(error) && failureCount < 2;
}

interface FailureCopy {
  title: string;
  description: string;
}

/**
 * What the screen says for each refusal (decision 4.1). `surface` names what
 * failed to load ("a torre", "as rotas").
 */
function describeFailure(error: unknown, surface = "a torre"): FailureCopy {
  const code = error instanceof TowerRequestError ? error.code : undefined;

  if (code === "MODULE_NOT_ENABLED") {
    return {
      title: "Módulo Entregas não contratado",
      description:
        "A torre de controle e o monitoramento fazem parte do módulo Entregas, que não está habilitado para esta empresa.",
    };
  }

  if (code === "PERMISSION_DENIED") {
    return {
      title: "Sem permissão para ver a operação",
      description:
        "Seu perfil de acesso não inclui Gerenciar Entregas. Peça ao administrador da empresa para liberar.",
    };
  }

  // The route guard says TENANT_INACTIVE, the session check
  // AUTH_BUSINESS_INACTIVE: the same fact (decision 4.1).
  if (code === "TENANT_INACTIVE" || code === "AUTH_BUSINESS_INACTIVE") {
    return {
      title: "Empresa inativa",
      description:
        "Esta empresa está inativa. Fale com o suporte para reativá-la.",
    };
  }

  return {
    title: `Não foi possível carregar ${surface}`,
    description:
      error instanceof Error && error.message
        ? error.message
        : "Verifique a conexão e tente novamente.",
  };
}

/**
 * A 403 as the rest of the product reads it (decision 4.1), for the shared
 * AccessErrorState: module not hired, profile without the screen, company
 * inactive. Null for anything that is not a refusal.
 */
function accessErrorOf(error: unknown): AccessError | null {
  if (!(error instanceof TowerRequestError) || error.status !== 403)
    return null;

  return classifyAccessError(403, { code: error.code, message: error.message });
}

export {
  TowerRequestError,
  accessErrorOf,
  describeFailure,
  isPermanentFailure,
  retryTransient,
  unwrapAnswer,
};
