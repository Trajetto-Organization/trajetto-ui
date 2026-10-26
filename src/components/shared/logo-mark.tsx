import Image from "next/image";

import { cn } from "@/lib/utils";

import mark from "@/assets/logo/trajetto-mark.svg";

/** Intrinsic ratio of the cropped mark (trajetto-mark.svg viewBox). */
export const LOGO_MARK_RATIO = 618 / 317;

export interface LogoMarkProps {
  /** Rendered width in CSS px; height follows the ratio. CSS in className may override the width (height stays auto). */
  width: number;
  /** Above-the-fold uses only: eager, fetchpriority=high, preload. */
  priority?: boolean;
  /** Decorative by default: every current call site has the word "Trajetto" next to it, or is a backdrop. */
  alt?: string;
  className?: string;
}

/**
 * The Trajetto mark, drawn from one cropped vector file loaded directly by the
 * browser (`unoptimized`: no srcset, never /_next/image). No placeholder and
 * no fade: the width/height attributes plus `aspect-[618/317] h-auto` reserve
 * the box, and the ~1 KB file is preloaded by the header, login and sidebar,
 * so every other use is a memory-cache hit. Never pass size-* or h-* classes.
 */
const LogoMark = ({
  width,
  priority = false,
  alt = "",
  className,
}: LogoMarkProps): JSX.Element => (
  <Image
    src={mark}
    alt={alt}
    aria-hidden={alt === "" ? true : undefined}
    width={width}
    height={Math.round(width / LOGO_MARK_RATIO)}
    priority={priority}
    unoptimized
    draggable={false}
    className={cn(
      "block aspect-[618/317] h-auto max-w-none shrink-0 select-none",
      className,
    )}
  />
);

export { LogoMark };
