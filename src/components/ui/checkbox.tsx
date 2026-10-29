"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      /**
       * The box stays 16px; the thing a finger has to hit is 24px.
       *
       * WCAG 2.5.8 asks for a 24x24 target, and a 16x16 checkbox misses it by
       * a third. Growing the box would change every form and every table row,
       * so the clickable area grows instead: the pseudo-element is part of
       * this element for hit-testing. `-inset-1.5` and not `-inset-1`: the
       * inset is measured from the padding box, so the 1px border on each
       * side eats into it and 4px per side landed at 22. Nothing moves on
       * screen either way.
       */
      "relative before:absolute before:-inset-1.5 before:content-['']",
      "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("flex items-center justify-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
