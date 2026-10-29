"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { PeriodSwitch } from "@/app/(protected)/_components/shared/period-switch";

interface ActivityPeriodSwitchProps {
  period: "7d" | "30d";
}

const PERIODS: Array<{ value: "7d" | "30d"; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

/**
 * Window for the cards only — the listing keeps its own paging, so changing
 * the period never moves the reader away from the page being read. The
 * control itself is shared with Entregas (shared/period-switch).
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
    <PeriodSwitch
      value={period}
      options={PERIODS}
      onChange={handleChangePeriod}
      label="Período das atividades"
      dataTutorial="activity-period"
    />
  );
};

export { ActivityPeriodSwitch };
