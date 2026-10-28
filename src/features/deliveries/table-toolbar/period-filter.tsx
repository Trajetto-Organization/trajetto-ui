"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayKeyIn } from "@/lib/date-key";

import { useListQuery } from "@/lib/search-params";

import { PeriodSwitch } from "@/app/(protected)/_components/shared/period-switch";
import { DateRangePicker } from "@/app/(protected)/_components/shared/custom/date-range-picker";

import {
  DELIVERY_PERIOD_LABELS,
  MAX_CUSTOM_PERIOD_DAYS,
  companyTodayFrom,
  customRangeProblem,
  customRangeSeed,
  deliveryPeriodLabel,
  readDeliveryPeriod,
  writeDeliveryPeriod,
  type DeliveryListPeriodMeta,
  type DeliveryPeriod,
} from "../lib/period";

const PRESETS: Array<{ value: DeliveryPeriod; label: string }> = (
  ["today", "7d", "14d", "30d"] as const
).map((value) => ({ value, label: DELIVERY_PERIOD_LABELS[value] }));

interface DeliveriesPeriodFilterProps {
  /** The listing's `searchMeta.period`: whether the API applied the period. */
  periodMeta?: DeliveryListPeriodMeta | null;
  disabled?: boolean;
}

/**
 * The period of the deliveries list (meeting of 14/10/2026): opens on Hoje,
 * with 7, 14 and 30 dias and a custom range of up to MAX_CUSTOM_PERIOD_DAYS.
 *
 * It lives in the URL like the table's filters (lib/period), through the
 * table's own list query, so a period chosen while a filter is on its way
 * never erases it. The cards above follow it (the server counts them with
 * it) and so does the export. It sits at the right end of the toolbar,
 * beside Visualizar (DataTableToolbarEnd); what a search does to it is said
 * under the toolbar (DeliveriesPeriodSearchHint).
 *
 * The custom range is the shared range picker, opened on the range in
 * effect — or on the preset's window as the API answered it, in the
 * company's days rather than the browser's. While a preset is in effect the
 * days after the company's today are off; a custom range in effect does not
 * say which day that is, and the API answers a future day with nothing.
 */
const DeliveriesPeriodFilter = ({
  periodMeta,
  disabled = false,
}: DeliveriesPeriodFilterProps): JSX.Element => {
  const { params, change } = useListQuery();

  const selection = readDeliveryPeriod(params);
  const search = params.get("search")?.trim() ?? "";

  const ignored = Boolean(search) && periodMeta?.applied === false;
  const custom = selection.period === "custom";

  const choosePreset = (period: DeliveryPeriod) => {
    change((current) => writeDeliveryPeriod(current, { period }));
  };

  const companyToday = companyTodayFrom(selection, periodMeta);

  return (
    <PeriodSwitch
      value={selection.period}
      options={PRESETS}
      onChange={choosePreset}
      label="Período das entregas"
      dataTutorial="deliveries-period"
      disabled={disabled}
      muted={ignored}
    >
      <DateRangePicker
        label="Período personalizado"
        title="Período personalizado"
        initialRange={customRangeSeed(
          selection,
          periodMeta,
          companyToday ?? dayKeyIn(new Date()),
        )}
        maxDate={companyToday}
        validate={customRangeProblem}
        hint={`Até ${MAX_CUSTOM_PERIOD_DAYS} dias, pela data de criação da entrega.`}
        onApply={({ from, to }) =>
          change((current) =>
            writeDeliveryPeriod(current, { period: "custom", from, to }),
          )
        }
      >
        <Button
          type="button"
          size="sm"
          variant={custom ? "secondary" : "ghost"}
          className={cn(
            "h-8",
            custom && "font-medium tabular-nums",
            custom && ignored && "opacity-60",
          )}
          aria-pressed={custom}
          disabled={disabled}
        >
          {custom
            ? deliveryPeriodLabel(selection)
            : DELIVERY_PERIOD_LABELS.custom}
        </Button>
      </DateRangePicker>
    </PeriodSwitch>
  );
};

/**
 * What a search does to the period, on its own line under the toolbar: a
 * search keeps the period, except an exact id, order, key or NF number,
 * which the API looks up in every date.
 */
const DeliveriesPeriodSearchHint = ({
  periodMeta,
}: Pick<DeliveriesPeriodFilterProps, "periodMeta">): JSX.Element | null => {
  const { params } = useListQuery();

  const search = params.get("search")?.trim() ?? "";

  if (!search) return null;

  const ignored = periodMeta?.applied === false;

  return (
    <p
      className="w-full text-xs text-muted-foreground"
      data-period-search-hint
      aria-live="polite"
    >
      {ignored
        ? "A busca achou a entrega pelo identificador em todas as datas: o período foi ignorado."
        : "A busca procura no período escolhido. ID, pedido, chave ou número da NF-e exatos procuram em todas as datas."}
    </p>
  );
};

export { DeliveriesPeriodFilter, DeliveriesPeriodSearchHint };
