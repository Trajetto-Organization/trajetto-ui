import { cn } from "@/lib/utils";

import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "./vehicle-marker";

interface VehicleLegendProps {
  className?: string;
}

/**
 * What each truck colour means. The markers also carry the status in their
 * accessible name, but a sighted user needs the key on screen: without it the
 * five statuses are told apart by colour alone (WCAG 1.4.1). The swatches read
 * the marker's own palette, so the two cannot drift.
 */
const VehicleLegend = ({ className }: VehicleLegendProps): JSX.Element => (
  <ul
    aria-label="Legenda das cores dos veículos"
    className={cn(
      "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
      className,
    )}
  >
    {STATUS_ORDER.map((status) => (
      <li key={status} className="flex items-center gap-1.5 whitespace-nowrap">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full ring-1 ring-background"
          style={{ backgroundColor: STATUS_COLOR[status].fill }}
        />
        {STATUS_LABEL[status]}
      </li>
    ))}
  </ul>
);

export { VehicleLegend };
