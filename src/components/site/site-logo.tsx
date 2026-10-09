import Image from "next/image";

import { DocumentLink } from "@/components/shared/document-link";
import { cn } from "@/lib/utils";

import trajettoLogo from "@/assets/logo/trajetto-logo.png";

/**
 * The mark plus "Trajetto", as the design draws it: the 1024px logo file is
 * mostly empty canvas, so it is shown at 56.6px inside a 34x18 window that
 * crops the mark. The word is real text and names the link.
 */
const SiteLogo = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => (
  <DocumentLink
    href="/"
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-2.5 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
      className,
    )}
  >
    <span
      aria-hidden
      className="relative block h-[18px] w-[34px] overflow-hidden"
    >
      <Image
        src={trajettoLogo}
        alt=""
        width={57}
        height={57}
        priority
        className="absolute left-[-10.8px] top-[-21px] size-[56.6px] max-w-none"
      />
    </span>
    <span className="font-site-display text-xl font-medium tracking-[-.02em]">
      Trajetto
    </span>
  </DocumentLink>
);

export { SiteLogo };
