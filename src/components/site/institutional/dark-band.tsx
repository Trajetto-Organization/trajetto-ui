import { cn } from "@/lib/utils";

/**
 * The faint 56px grid of the design's dark bands (Sobre · Diferenciais,
 * Orçamento · O que oferecemos), fading out from the centre. Decorative.
 */
const DarkGrid = ({ className }: { className?: string }): JSX.Element => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 opacity-50",
      "bg-[linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[length:56px_56px]",
      "[mask-image:radial-gradient(70%_70%_at_50%_40%,#000,transparent)]",
      className,
    )}
  />
);

/** Text colours on the dark bands, the same in both themes (AA on #0b0b10 / #121218). */
const DARK_BAND = {
  ink: "text-[#f3f3f6]",
  body: "text-[#a8aab5]",
  soft: "text-[#d4d5dc]",
} as const;

export { DARK_BAND, DarkGrid };
