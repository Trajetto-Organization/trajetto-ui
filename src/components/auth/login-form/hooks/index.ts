import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";
import { disconnectSocket } from "@/socket";

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

function useLoginMessages() {
  const searchParams = useSearchParams();
  const hasShownRef = useRef(false);

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

    if (type === "success") {
      if (key === "logout") {
        toast.success(text);
        disconnectSocket();

        useAuthStore.getState().logout();
      }
    } else {
      toast.error(text);
      disconnectSocket();

      useAuthStore.getState().logout();
    }
  }, [searchParams]);
}

export { useLoginMessages };
