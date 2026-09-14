"use client";

import { HintBubble } from "./hint-bubble";

interface TypingBubbleProps {
  /** Drives the whole thing: the element stays mounted so it can fade out. */
  isTyping: boolean;
}

/**
 * The small bubble at the foot of the conversation while the driver writes.
 *
 * The dots are three staggered runs of the same keyframe. Under
 * `prefers-reduced-motion` the animation is dropped entirely and the stagger
 * survives as three fixed opacities — still legible as "typing", with
 * nothing moving.
 */
const TypingBubble = ({ isTyping }: TypingBubbleProps): JSX.Element => (
  <HintBubble isOpen={isTyping} label="O motorista está digitando">
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground
      animate-typing-dot [animation-fill-mode:both]
      motion-reduce:animate-none motion-reduce:opacity-100"
    />
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground
      animate-typing-dot [animation-delay:200ms]
      [animation-fill-mode:both] motion-reduce:animate-none
      motion-reduce:opacity-70"
    />
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted-foreground
      animate-typing-dot [animation-delay:400ms]
      [animation-fill-mode:both] motion-reduce:animate-none
      motion-reduce:opacity-40"
    />
  </HintBubble>
);

export { TypingBubble };
