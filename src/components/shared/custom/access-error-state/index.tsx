import type { ReactNode } from "react";
import { Ban, PackageX, ShieldX, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/custom/empty-state";

import type { AccessErrorKind } from "@/lib/access-error";

interface AccessErrorStateProps {
  kind: AccessErrorKind;
  /** For the module state: the module as the plan screen names it. */
  moduleLabel?: string;
  /**
   * Whose company is refused. "master" reads "esta empresa" and expects the
   * way to enable the module as `action`; "company" is the session's own.
   */
  audience?: "company" | "master";
  /** The API's own sentence, shown for permission and tenant refusals. */
  message?: string | null;
  /** The one thing to do about it from here (MASTER: enable the module). */
  action?: ReactNode;
}

interface StateCopy {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
}

function copyFor({
  kind,
  moduleLabel = "Entregas",
  audience = "company",
  message,
}: AccessErrorStateProps): StateCopy {
  if (kind === "module-not-enabled") {
    return {
      icon: PackageX,
      title: `Módulo ${moduleLabel} não contratado`,
      description:
        audience === "master" ? (
          <>
            O módulo <strong>{moduleLabel}</strong> não está habilitado para
            esta empresa. Habilite-o em Módulos Contratados para ver e operar
            estas telas.
          </>
        ) : (
          <>
            O módulo <strong>{moduleLabel}</strong> não está habilitado para a
            sua empresa. Fale com o suporte para contratar.
          </>
        ),
    };
  }

  if (kind === "tenant-inactive") {
    return {
      icon: Ban,
      title: "Empresa desativada",
      // The API's sentence tells a company user to call their administrator;
      // the MASTER is the one who reactivates, so he gets where to do it.
      description:
        audience === "master"
          ? "Esta empresa está desativada. Reative o cadastro em Empresas para voltar a operar estas telas."
          : (message ??
            "Esta empresa está desativada. Fale com o administrador da empresa para reativar o acesso."),
    };
  }

  return {
    icon: ShieldX,
    title: "Sem permissão para esta seção",
    description:
      message ??
      "Seu perfil de acesso não inclui esta seção. Peça ao administrador da empresa para liberar o acesso.",
  };
}

/**
 * The three 403s, each said as what it is (decision 4.1).
 *
 * Universal on purpose, like EmptyState: a Server Component renders it with
 * plain props and the icon never crosses into the client. Pair it with
 * `readAccessError` / `classifyAccessError` from "@/lib/access-error".
 */
const AccessErrorState = (props: AccessErrorStateProps): JSX.Element => {
  const { icon, title, description } = copyFor(props);

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      action={props.action}
    />
  );
};

export { AccessErrorState };
export type { AccessErrorStateProps };
