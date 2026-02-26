import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { toast } from "sonner";
import { disconnectSocket } from "@/socket";

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
};

type MessageKey = keyof typeof messages;

function useLoginMessages() {
  const searchParams = useSearchParams();

  const router = useRouter();
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const error = searchParams.get("error");

    if (error && error in messages) {
      const { text, type } = messages[error as MessageKey];

      if (type === "error") {
        toast.error(text);
        disconnectSocket();
      } else {
        toast.success(text);
      }
    }
  }, [searchParams, router]);
}

export { useLoginMessages };
