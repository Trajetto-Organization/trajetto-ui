"use client";

import type { ReactNode } from "react";

import { Loader, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

/**
 * The three-dot menu at the end of a table row.
 *
 * Written once because it had stopped being one thing: most modules opened a
 * 160px menu of bare labels, the newest two put an icon on the right, one of
 * them was 230px wide, and the tooltip that explains a disabled action was
 * copy-pasted — with its wrapper `<div>`, which is not decoration — into every
 * file that needed it. The row menu is the most-used control in the product;
 * it cannot be a different control in each module.
 *
 * Sized by its own content above a 160px floor, rather than pinned to a
 * number. A fixed width either truncates a long label or leaves a gulf
 * between a short one and its icon, and both were happening.
 */
interface RowActionsProps {
  /**
   * What the menu acts on, e.g. `a rota 12`. Reaches the screen reader as
   * "Abrir menu de ações de a rota 12", which is why it is a phrase and not
   * an id.
   */
  entity: string;

  /** Spins the trigger while an action the menu started is still running. */
  isBusy?: boolean;

  children: ReactNode;
}

const RowActions = ({
  entity,
  isBusy = false,
  children,
}: RowActionsProps): JSX.Element => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
      >
        {isBusy ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <MoreHorizontal className="h-4 w-4" />
        )}
        <span className="sr-only">{`Abrir menu de ações de ${entity}`}</span>
      </Button>
    </DropdownMenuTrigger>

    {/* Anchored to the right edge of the trigger: the menu is the last column,
        and aligning it left would push it off the table. */}
    <DropdownMenuContent align="end" className="min-w-[160px] max-w-[280px]">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

interface RowActionItemProps {
  label: string;

  /** Right-aligned, 16px, and every item in a menu either has one or none. */
  icon: ReactNode;

  /**
   * Why this action cannot be used right now, or `null` when it can.
   *
   * A blocked action is DISABLED and explained, never hidden. Hiding it
   * leaves the user with no way to find out what is missing, and "why can't I
   * release this one?" is the question these menus exist to answer.
   */
  blockedReason?: string | null;

  /** Red label and icon. For cancelling and deleting, nothing else. */
  destructive?: boolean;

  onSelect: () => void;
}

const RowActionItem = ({
  label,
  icon,
  blockedReason = null,
  destructive = false,
  onSelect,
}: RowActionItemProps): JSX.Element => {
  const item = (
    <DropdownMenuItem
      className={cn(
        "flex cursor-pointer items-center justify-between gap-6",
        destructive &&
          "text-red-600 focus:text-red-600 dark:text-red-500 dark:focus:text-red-500",
      )}
      disabled={blockedReason !== null}
      onSelect={onSelect}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
    </DropdownMenuItem>
  );

  if (blockedReason === null) return item;

  return (
    <TooltipProvider>
      <Tooltip>
        {/*
         * The wrapper is load-bearing. A disabled item fires no pointer
         * events, so a tooltip anchored to the item itself never opens — and
         * the explanation is the entire point of leaving the action visible.
         */}
        <TooltipTrigger asChild>
          <div>{item}</div>
        </TooltipTrigger>

        <TooltipContent className="max-w-sm">
          <p>{blockedReason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/** Re-exported so a module never reaches past the primitive for one divider. */
const RowActionSeparator = DropdownMenuSeparator;

export { RowActions, RowActionItem, RowActionSeparator };
