"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "There is nothing here", said the same way everywhere.
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
