"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useListQuery } from "@/lib/search-params";

import { PeriodSwitch } from "@/app/(protected)/_components/shared/period-switch";

import {
  DELIVERY_PERIOD_LABELS,
  MAX_CUSTOM_PERIOD_DAYS,
  customRangeProblem,
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

/** Today in the browser, as the date input speaks it ("YYYY-MM-DD"). */
function todayKey(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * The period of the deliveries list (meeting of 14/10/2026): opens on Hoje,
 * with 7, 14 and 30 dias and a custom range of up to MAX_CUSTOM_PERIOD_DAYS.
 *
 * It lives in the URL like the table's filters (lib/period), through the
 * table's own list query, so a period chosen while a filter is on its way
 * never erases it. The cards above follow it (the server counts them with
 * it) and so does the export. A search keeps the period, except an exact id,
 * order, key or NF number, which the API looks up in every date — the line
 * under the presets says which happened.
 */
const DeliveriesPeriodFilter = ({
  periodMeta,
  disabled = false,
}: DeliveriesPeriodFilterProps): JSX.Element => {
  const { params, change } = useListQuery();

  const selection = readDeliveryPeriod(params);
  const search = params.get("search")?.trim() ?? "";

  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [problem, setProblem] = useState<string | null>(null);
  const [touched, setTouched] = useState<boolean>(false);

  const ignored = Boolean(search) && periodMeta?.applied === false;

  const choosePreset = (period: DeliveryPeriod) => {
    change((current) => writeDeliveryPeriod(current, { period }));
  };

  const openCustom = (open: boolean) => {
    setIsCustomOpen(open);

    if (!open) return;

    // Opens on the range in effect, or on today.
    setFrom(selection.from ?? todayKey());
    setTo(selection.to ?? todayKey());
    setProblem(null);
    setTouched(false);
  };

  // Live after the first look (decision 16.700): the message follows the
  // dates, and goes once they are right.
  const revalidate = (nextFrom: string, nextTo: string) => {
    if (touched) setProblem(customRangeProblem(nextFrom, nextTo));
  };

  const applyCustom = () => {
    const found = customRangeProblem(from, to);

    setTouched(true);
    setProblem(found);

    if (found) return;

    change((current) =>
      writeDeliveryPeriod(current, { period: "custom", from, to }),
    );
    setIsCustomOpen(false);
  };

  const customLabel =
    selection.period === "custom"
      ? deliveryPeriodLabel(selection)
      : DELIVERY_PERIOD_LABELS.custom;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <PeriodSwitch
        value={selection.period}
        options={PRESETS}
        onChange={choosePreset}
        label="Período das entregas"
        dataTutorial="deliveries-period"
        disabled={disabled}
        muted={ignored}
      >
        <Popover open={isCustomOpen} onOpenChange={openCustom}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={selection.period === "custom" ? "secondary" : "ghost"}
              className={cn(
                "h-8",
                selection.period === "custom" && "font-medium",
                selection.period === "custom" && ignored && "opacity-60",
              )}
              aria-pressed={selection.period === "custom"}
              disabled={disabled}
            >
              {customLabel}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-80 space-y-3">
            <p className="text-sm font-medium">Período personalizado</p>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="deliveries-period-from" className="text-xs">
                  De *
                </Label>
                <Input
                  id="deliveries-period-from"
                  type="date"
                  value={from}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={
                    problem ? "deliveries-period-problem" : undefined
                  }
                  onChange={(event) => {
                    setFrom(event.target.value);
                    revalidate(event.target.value, to);
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setProblem(customRangeProblem(from, to));
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="deliveries-period-to" className="text-xs">
                  Até *
                </Label>
                <Input
                  id="deliveries-period-to"
                  type="date"
                  value={to}
                  aria-invalid={problem ? true : undefined}
                  aria-describedby={
                    problem ? "deliveries-period-problem" : undefined
                  }
                  onChange={(event) => {
                    setTo(event.target.value);
                    revalidate(from, event.target.value);
                  }}
                  onBlur={() => {
                    setTouched(true);
                    setProblem(customRangeProblem(from, to));
                  }}
                />
              </div>
            </div>

            {problem ? (
              <p
                id="deliveries-period-problem"
                role="alert"
                className="text-xs text-red-600 dark:text-red-500"
              >
                {problem}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Até {MAX_CUSTOM_PERIOD_DAYS} dias, pela data de criação da
                entrega.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsCustomOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={applyCustom}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </PeriodSwitch>

      {search && (
        <p
          className="text-xs text-muted-foreground"
          data-period-search-hint
          aria-live="polite"
        >
          {ignored
            ? "A busca achou a entrega pelo identificador em todas as datas: o período foi ignorado."
            : "A busca procura no período escolhido. ID, pedido, chave ou número da NF-e exatos procuram em todas as datas."}
        </p>
      )}
    </div>
  );
};

export { DeliveriesPeriodFilter };
