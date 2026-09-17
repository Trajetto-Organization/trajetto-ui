import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "There is nothing here", said the same way everywhere.
 *
 * No `"use client"` here, deliberately. There is nothing in this component
 * that needs a browser — no state, no effect, no handler — so the directive
 * bought nothing and cost something specific: it made this file a CLIENT
 * BOUNDARY, and `icon` is a `LucideIcon`, which is a function. A Server
 * Component rendering `<EmptyState icon={Building2} />` was therefore asking
 * React to serialise a function into the RSC payload, and React refused:
 * "Functions cannot be passed directly to Client Components".
 *
 * That is why /admin/entregas and /admin/rotas died and /dashboard did not.
 * The branch that renders this one is the branch that asks a master WHICH
 * COMPANY to look at, and a company user is never asked — so the same
 * component, the same prop, the same file, and only one of the two trees ever
 * executed the line.
 *
 * Without the directive this is universal: it renders on the server for a
 * server caller (the icon never crosses anything) and compiles into the
 * client bundle for a client caller. The alternative — keeping it client and
 * inventing `iconKey="building"` — would have added a second lookup table to
 * maintain, changed forty-nine call sites, and left the next component with a
 * `LucideIcon` prop to rediscover all of this.
 *
 * The product had a dashed box in forty-nine places and no two were alike:
 * `h-72` here, `h-64` there, `h-32` in a dialog; an icon at 10, at 12, or
 * none; one line of muted text in some, a heading and a sentence in others.
 * The worst of them said only "Nenhum comprovante esperando revisão." inside
 * three hundred pixels of empty box — which tells the user what is missing and
 * nothing about what would put something there.
 *
 * So the shape is fixed and the CONTENT is required to answer both questions:
 * `title` is what is not there, `description` is what makes it appear. An
 * `action` when the user can do that thing from here.
 */
interface EmptyStateProps {
  icon: LucideIcon;

  /** What is not here, in the user's words. */
  title: string;

  /** What would put something here. Skipped only when it is truly obvious. */
  description?: ReactNode;

  /** The one thing to do about it, when there is one. */
  action?: ReactNode;

  /**
   * `panel` fills the space a list would have taken; `inline` is for a column
   * beside something else, where a tall box would unbalance the layout.
   */
  size?: "panel" | "inline";

  className?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  size = "panel",
  className,
}: EmptyStateProps): JSX.Element => (
  <div
    /* A handle for the test that checks every empty box is the same box. */
    data-empty-state
    className={cn(
      `flex flex-col items-center justify-center gap-2 rounded-lg border
      border-dashed px-6 text-center`,
      size === "panel" ? "min-h-64 py-16" : "py-10",
      className,
    )}
  >
    <Icon
      className={cn(
        "text-muted-foreground/50",
        size === "panel" ? "h-10 w-10" : "h-5 w-5",
      )}
      aria-hidden="true"
    />

    <p className="text-sm font-medium">{title}</p>

    {description && (
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    )}

    {action && <div className="mt-2">{action}</div>}
  </div>
);

export { EmptyState };
