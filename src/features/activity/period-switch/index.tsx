"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivityPeriodSwitchProps {
  period: "7d" | "30d";
}

const PERIODS: Array<{ value: "7d" | "30d"; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

/**
 * Window for the cards only — the listing keeps its own paging, so changing
 * the period never moves the reader away from the page being read.
 */
const ActivityPeriodSwitch = ({
  period,
}: ActivityPeriodSwitchProps): JSX.Element => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChangePeriod = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("period", value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2" data-tutorial="activity-period">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />

      <div className="flex items-center gap-1">
        {PERIODS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={period === option.value ? "secondary" : "ghost"}
            className={cn("h-8", period === option.value && "font-medium")}
            onClick={() => handleChangePeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export { ActivityPeriodSwitch };
