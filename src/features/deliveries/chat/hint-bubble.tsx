"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HintBubbleProps {
  /** Drives the whole thing: the element stays mounted so it can fade out. */
  isOpen: boolean;

  /**
   * What a screen reader is told the bubble means. The dots and the bars
   * inside say nothing on their own.
   */
  label: string;

  children: ReactNode;
}

/**
 * The bubble at the foot of the conversation that says what the driver is
 * doing right now — writing, or recording a voice note.
 *
 * It is always in the tree and collapses to zero height instead of
 * unmounting: a bubble that pops in and out cannot be animated on the way
 * out, and this way the height change is a transition the reader's scroll
 * position simply grows under, rather than a jump.
 *
 * The shell is shared by both hints on purpose. They are two different
 * animations because they mean two different things, but they are the same
 * bubble in the same place, and the open/close transition drifting between
 * them would read as two unrelated features.
 */
const HintBubble = ({
  isOpen,
  label,
  children,
}: HintBubbleProps): JSX.Element => (
  <div
    className={cn(
      "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
      "motion-reduce:transition-none",
      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
    )}
    aria-hidden={!isOpen}
  >
    <div className="overflow-hidden">
      <div className="flex justify-start pt-1.5">
        <div
          className="flex items-center gap-1 rounded-2xl rounded-bl-md
          bg-muted px-3.5 py-3 shadow-sm"
          role="status"
          aria-label={label}
        >
          {children}
        </div>
      </div>
    </div>
  </div>
);

export { HintBubble };
