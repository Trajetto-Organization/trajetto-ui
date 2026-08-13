import { create } from "zustand";
import { disconnectSocket } from "@/socket";

/**
 * Every way a session can end against the user's will.
 *
 * Kept as one vocabulary because the same reason travels through three places
 * that used to spell it out separately: the query string the login page reads,
 * the copy on the overlay, and the socket event. Adding a reason in one place
 * and forgetting another is how a user ends up staring at a generic "sessão
 * expirou" after being deliberately blocked by an administrator.
 */
type ForceLogoutReason =
  | "session_expired"
  | "user_revoked"
  | "driver_inactive"
  | "access_denied"
  | "permissions_changed"
  | "no_user_permission"
  | "service_unavailable";

interface ForceLogoutCopy {
  title: string;
  description: string;
}

/**
 * What the overlay says while the redirect is in flight.
 *
 * Deliberately not the same text as the login toast. This one is written in the
 * present — it explains what is happening right now, during the wait. The
 * authoritative message, the one that says what to do about it, appears
 * afterwards on the login page.
 */
const REASON_TO_COPY: Record<ForceLogoutReason, ForceLogoutCopy> = {
  session_expired: {
    title: "Encerrando sua sessão",
    description: "Sua sessão expirou. Redirecionando para o login…",
  },
  user_revoked: {
    title: "Seu acesso foi revogado",
    description: "Um administrador bloqueou seu acesso. Redirecionando…",
  },
  driver_inactive: {
    title: "Seu cadastro foi inativado",
    description: "Seu cadastro como motorista está inativo. Redirecionando…",
  },
  access_denied: {
    title: "Acesso não autorizado",
    description: "Encerrando sua sessão com segurança. Redirecionando…",
  },
  permissions_changed: {
    title: "Suas permissões mudaram",
    description: "Você precisa entrar novamente. Redirecionando…",
  },
  no_user_permission: {
    title: "Perfil de acesso não configurado",
    description: "Encerrando sua sessão. Redirecionando para o login…",
  },
  service_unavailable: {
    title: "Conexão perdida",
    description:
      "Não foi possível confirmar sua sessão com o servidor. Redirecionando…",
  },
};

// Long enough for the overlay to register as a state rather than a flash, short
// enough that nobody feels held. The redirect itself is what ends it, so on a
// slow navigation the overlay simply stays up longer — which is the point.
const REDIRECT_DELAY_MS = 400;

interface ForceLogoutState {
  reason: ForceLogoutReason | null;
  setReason: (reason: ForceLogoutReason) => void;
}

/**
 * Holds the reason while the redirect is in flight, so the overlay can render.
 *
 * A store rather than component state because the kick is triggered from places
 * that are not the component tree — a socket handler, a fetch failure inside a
 * hook — and all of them need to raise the same overlay.
 */
const useForceLogoutStore = create<ForceLogoutState>((set) => ({
  reason: null,
  setReason: (reason) => set({ reason }),
}));

/**
 * Ends the session and sends the user to the login page.
 *
 * The order matters. The overlay goes up first so the user sees an intentional
 * state instead of a dashboard that has quietly stopped working; the socket is
 * closed so no further events arrive against a session that is already gone;
 * and the navigation is a hard one, because `force_logout=true` is what makes
 * the middleware clear the cookies — a soft navigation would leave `tkey` in
 * place and bounce the user straight back in.
 */
function forceLogout(reason: ForceLogoutReason): void {
  const { reason: current, setReason } = useForceLogoutStore.getState();

  // Already leaving. A second call would restart the timer and could redirect
  // with a different reason than the one on screen.
  if (current) return;
  setReason(reason);

  // Read by the login page to show the authoritative message once it lands.
  sessionStorage.setItem("pending_login_toast", "true");
  disconnectSocket();

  setTimeout(() => {
    window.location.href = `/login?error=${reason}&force_logout=true`;
  }, REDIRECT_DELAY_MS);
}

export { forceLogout, useForceLogoutStore, REASON_TO_COPY };
export type { ForceLogoutReason, ForceLogoutCopy };
