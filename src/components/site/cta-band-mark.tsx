import { LogoMark } from "@/components/shared/logo-mark";
import { cn } from "@/lib/utils";

/** The brand mark behind the dark closing band.
 *
 *  - From 1200px: the approved composition (the old 1024px canvas at min(620px,70%)
 *    bleeding 8% off the right edge, re-expressed for the cropped mark). Below 1200px
 *    that large mark sat behind the heading (measured at 900, 1024, 1099, 1100).
 *  - 640-1199px: the whole mark, never cropped, in the bottom-right corner beside the
 *    button row. Every band has the same two buttons (about 419px wide in one row) and a
 *    left padding of clamp(24px,6vw,80px), which is 6vw in this range, so the free width
 *    right of the buttons is 100% - 6vw - 419px. The width leaves a 21px gap to the
 *    buttons and caps at 220px, so its top stays below the paragraph.
 *  - Below 640px: hidden. The buttons stack and fill the band, so any watermark would sit
 *    under them or be cropped into unreadable stripes. */
const CtaBandMark = (): JSX.Element => (
  <LogoMark
    width={374}
    className={cn(
      "pointer-events-none absolute opacity-90",
      "right-[calc(-8%_+_min(129.6px,14.6%))] top-1/2 w-[min(374px,42.2%)] -translate-y-[41.5%]",
      "max-[1199px]:bottom-4 max-[1199px]:right-5 max-[1199px]:top-auto max-[1199px]:w-[clamp(96px,calc(100%_-_6vw_-_460px),220px)] max-[1199px]:translate-y-0 max-[1199px]:opacity-60",
      "max-[639px]:hidden",
    )}
  />
);

export { CtaBandMark };
