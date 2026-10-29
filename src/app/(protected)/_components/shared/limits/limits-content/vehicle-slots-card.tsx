"use client";

import { Car, Truck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import type { BusinessEntitlementsData } from "@/actions/business/entitlements";
import { cn } from "@/lib/utils";
import { vehicleSlotLevel, vehicleSlotPercent } from "@/lib/vehicle-slot-usage";

import { LimitStatusBadge } from "./limit-status-badge";
import {
  VEHICLE_SLOTS_NOTE,
  VEHICLE_SLOT_BADGES,
  registeredTotalSentence,
  vehicleSlotsSentence,
  vehicleStatusRows,
} from "./lib/vehicle-slots-copy";

interface PlanModule {
  module: string;
  enabled: boolean;
}

interface VehicleSlotsCardProps {
  entitlements: BusinessEntitlementsData | null;
  planStatus: "loading" | "ready" | "error";
  planModules: readonly PlanModule[] | null;
}

/**
 * The plan's vehicle slots (Limites de Uso), with the AI card's hierarchy:
 * the number against the contract, the bar, what is left, what counts, the
 * breakdown, and a footer. Only what the API answers: the contract, the
 * fleet by status and the rule that INACTIVE frees the slot.
 */
const VehicleSlotsCard = ({
  entitlements,
  planStatus,
  planModules,
}: VehicleSlotsCardProps): JSX.Element => {
  const limit = entitlements?.vehicle_limit ?? 0;
  const count = entitlements?.vehicle_count ?? 0;
  const hasLimit = Boolean(entitlements?.vehicle_limit_enabled) && limit > 0;

  const level = vehicleSlotLevel(count, hasLimit ? limit : 0);
  const badge = VEHICLE_SLOT_BADGES[level];

  const counts = entitlements?.vehicle_status_counts;
  const rows = vehicleStatusRows(counts, planModules);

  const total = counts
    ? counts.ACTIVE + counts.BLOCKED + counts.IN_ROUTE + counts.INACTIVE
    : count + (entitlements?.vehicle_inactive_count ?? 0);

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow"
      data-tutorial="vehicle-limit-card"
    >
      <CardHeader className="flex flex-col items-start gap-2 space-y-0 pb-2 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5 shrink-0 text-primary" />
            {/* Vehicles serve both modules, not only Frotas. */}
            Veículos
          </CardTitle>
          <CardDescription>
            Vagas do plano: veículos que ocupam vaga × contratados
          </CardDescription>
        </div>
        {planStatus === "ready" && (
          <LimitStatusBadge tone={badge.tone}>{badge.label}</LimitStatusBadge>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="space-y-4 pt-4">
        {planStatus === "loading" ? (
          // Not an error: the plan has not answered yet.
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label="Carregando as vagas do plano"
          >
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !entitlements ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os dados da frota.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Ocupando vaga</span>
                <span className="font-semibold text-lg tabular-nums">
                  {count.toLocaleString("pt-BR")}
                  {hasLimit && (
                    <span className="text-muted-foreground font-normal text-sm">
                      {" "}
                      / {limit.toLocaleString("pt-BR")}
                    </span>
                  )}
                </span>
              </div>

              {hasLimit && (
                <Progress
                  value={vehicleSlotPercent(count, limit)}
                  className="h-2.5"
                  indicatorClassName="bg-blue-600"
                  aria-label="Vagas do plano em uso"
                />
              )}

              <p
                className={cn(
                  "text-xs text-muted-foreground",
                  level === "over" && "text-red-700 dark:text-red-400",
                )}
                data-testid="vehicle-slots-sentence"
              >
                {vehicleSlotsSentence(count, hasLimit ? limit : 0)}
              </p>

              {/* What counts against the plan (occupiesFleetSlot on the
                  API): the self-service lever when the plan is full. */}
              <p
                className="text-xs text-muted-foreground"
                data-testid="vehicle-slots-note"
              >
                {VEHICLE_SLOTS_NOTE}
              </p>
            </div>

            {rows.length > 0 && (
              <ul
                className="space-y-1 text-xs"
                aria-label="Veículos por situação"
              >
                {rows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      {row.label}
                      <span>
                        {" "}
                        · {row.occupiesSlot ? "ocupa vaga" : "não ocupa vaga"}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {row.count.toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Car className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {registeredTotalSentence(
                    total,
                    counts ? undefined : entitlements.vehicle_inactive_count,
                  )}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { VehicleSlotsCard };
