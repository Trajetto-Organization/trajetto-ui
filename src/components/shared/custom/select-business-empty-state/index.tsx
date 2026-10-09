import type { LucideIcon } from "lucide-react";
import { Building2 } from "lucide-react";

import { EmptyState } from "@/components/shared/custom/empty-state";

/**
 * "Selecione uma empresa", said the same way on every screen that has the
 * company selector at the top (decision 3.7).
 *
 * Entregas, Rotas, Torre and Integrações drew an icon, a title and a sentence;
 * Kanban drew one grey line in a box of its own and Limites de Uso a lightning
 * bolt over a single line — the same situation in three shapes. Only for the
 * page-level selector: a dialog that asks for a company (creating an access
 * profile, say) is a form field, not this.
 *
 * No `"use client"`, like EmptyState: a Server Component can pass the icon
 * without serialising a function across a client boundary.
 */
interface SelectBusinessEmptyStateProps {
  /** The module's own icon; the building when the module has none. */
  icon?: LucideIcon;

  /**
   * What this screen shows once a company is chosen — never a repeat of the
   * title ("Selecione uma empresa para…" says nothing the title did not).
   */
  description: string;

  className?: string;
}

const SELECT_BUSINESS_TITLE = "Selecione uma empresa";

const SelectBusinessEmptyState = ({
  icon = Building2,
  description,
  className,
}: SelectBusinessEmptyStateProps): JSX.Element => (
  <EmptyState
    icon={icon}
    title={SELECT_BUSINESS_TITLE}
    description={description}
    className={className}
  />
);

export { SelectBusinessEmptyState, SELECT_BUSINESS_TITLE };
