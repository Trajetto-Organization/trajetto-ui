import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { disconnectSocket } from "@/socket";

import { clearSessionState } from "@/lib/clear-session-state";

import { toast } from "sonner";

type MessageType = "error" | "success";

interface MessageInfo {
  text: string;
  type: MessageType;
}

const messages: Record<string, MessageInfo> = {
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
  service_unavailable: {
    text: "Não foi possível confirmar sua sessão com o servidor. Verifique sua conexão e faça login novamente.",
    type: "error",
  },
  logout: {
    text: "Você saiu da sua conta com sucesso!",
    type: "success",
  },
};

type MessageKey = keyof typeof messages;

/**
 * Empties the previous session out of this tab, on arrival at the login page.
 *
 * Here, and only here, because this page is where every way out of the app
 * funnels: the logout button (`redirect("/login?reason=logout")`), a forced
 * logout (`window.location.href`), and the middleware's own redirect when a
 * token cannot be renewed.
 *
 * It cannot be done on the way out instead. Clearing while the protected
 * layout is still mounted only tells its live observers to refetch, and they
 * still hold a valid cookie — the cache would refill with exactly the data
 * being cleared, moments before the redirect. By the time this page mounts the
 * cookies are gone and nothing is observing.
 *
 * Unconditional on purpose. The toast effect below runs behind two guards (a
 * recognised `reason`, and a navigation that is not a reload), and arriving
 * without either of those is still arriving logged out.
 */
function useClearPreviousSession() {
  const hasClearedRef = useRef(false);

  useEffect(() => {
    if (hasClearedRef.current) return;
    hasClearedRef.current = true;

    // The socket singleton survives a soft navigation the same way the cache
    // does, so it is dropped on the same trigger rather than inside the toast
    // branches. It is a no-op when there was never a connection.
    disconnectSocket();
    clearSessionState();
  }, []);
}

function useLoginMessages() {
  const searchParams = useSearchParams();
  const hasShownRef = useRef(false);

  useClearPreviousSession();

  useEffect(() => {
    const reason = searchParams.get("reason");

    if (!reason || !(reason in messages)) return;
    if (hasShownRef.current) return;

    // Client-triggered redirects (logout button, security checks) set this
    // flag before redirecting. On refresh the flag is already consumed.
    const hasPendingToast = sessionStorage.getItem("pending_login_toast");

    if (hasPendingToast) {
      sessionStorage.removeItem("pending_login_toast");
    } else {
      // Fallback for server-triggered redirects (middleware token refresh failure)
      // These cause full page loads where performance.navigation.type is reliable
      const navEntries = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];

      if (navEntries.length > 0 && navEntries[0].type === "reload") return;
    }

    hasShownRef.current = true;

    const key = reason as MessageKey;
    const { text, type } = messages[key];

    // Only the message is decided here now. Tearing the session down moved to
    // useClearPreviousSession, which runs whether or not a `reason` arrived —
    // these two branches used to be the only thing calling logout(), so a user
    // landing on /login without a recognised reason, or reloading the page,
    // kept their role and permissions in localStorage.
    if (type === "success") {
      if (key === "logout") toast.success(text);
    } else {
      toast.error(text);
    }
  }, [searchParams]);
}

export { useLoginMessages };
