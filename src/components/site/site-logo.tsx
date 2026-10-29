import { DocumentLink } from "@/components/shared/document-link";
import { LogoMark } from "@/components/shared/logo-mark";
import { cn } from "@/lib/utils";

/**
 * The mark plus "Trajetto", as the design draws it: the cropped vector mark
 * at 34x17, then the word, which is real text and names the link. The header
 * preloads the mark (`priority`, the default) so every other use on the page
 * is a cache hit; the footer passes `priority={false}`.
 */
const SiteLogo = ({
  className,
  onClick,
  priority = true,
}: {
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}) => (
  <DocumentLink
    href="/"
    onClick={onClick}
    className={cn(
      "relative flex items-center gap-2.5 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-site-ink/40",
      className,
    )}
  >
    <LogoMark width={34} priority={priority} />
    <span className="font-site-display text-xl font-medium tracking-[-.02em]">
      Trajetto
    </span>
  </DocumentLink>
);

export { SiteLogo };
