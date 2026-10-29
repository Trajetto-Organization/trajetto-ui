"use client";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageX,
  Truck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/**
 * What the operation is doing, on the screen everybody opens first.
 *
 * Two kinds of number, and the panel says which is which (DLVP-OPS-2):
 * "Agora" is the dispatcher's queue without a driver (of any date), what is
 * waiting on today's routes and what is on the street. "Hoje" is what the
 * company's day produced, in the company's own time zone: deliveries
 * finished, failures, and what drivers reported. Before, "Sem rota" sat next
 * to "Entregues hoje" and read as today's number while it was the backlog of
 * every day. Each tile's hint names its own window.
 *
 * "Designadas" is the control tower's day (decision 7.1, DLV-MON-3): PENDING
 * on a route of today or on one still running. Tomorrow's routes, yesterday's
 * that never left and deliveries with a driver but no route are not today's
 * load, so the group does not claim to show "everything open" — that list is
 * in Entregas.
 *
 * The numbers come from the same read the monitoring panel and the tower
 * draw, so the screens cannot disagree about the same morning.
 */

interface DeliveryOperation {
  unassigned: number;
  designated: number;
  inRoute: number;
  deliveredToday: number;
  failedToday: number;
  occurrencesToday: number;
}

interface OperationPanelProps {
  operation: DeliveryOperation;

  /** `/dashboard` or `/admin`, so the links follow the surface. */
  basePath: string;
}

interface OperationTile {
  key: keyof DeliveryOperation;
  label: string;
  hint: string;
  value: number;
  icon: LucideIcon;
  attention: boolean;
}

interface OperationGroup {
  key: "now" | "today";
  title: string;
  description: string;
  tiles: OperationTile[];
}

/**
 * `attention` is not decoration: the backlog without a route and the day's
 * failures and reports are what somebody has to act on before lunch.
 */
function operationGroups(operation: DeliveryOperation): OperationGroup[] {
  return [
    {
      key: "now",
      title: "Agora",
      description: "Fila sem motorista e rotas de hoje, neste momento",
      tiles: [
        {
          key: "unassigned",
          label: "Sem rota",
          hint: "Pendentes sem motorista, de qualquer data",
          value: operation.unassigned,
          icon: Clock,
          attention: operation.unassigned > 0,
        },
        {
          key: "designated",
          label: "Designadas",
          hint: "Nas rotas de hoje, ainda não saíram",
          value: operation.designated,
          icon: UserCheck,
          attention: false,
        },
        {
          key: "inRoute",
          label: "Em rota",
          hint: "Na rua agora",
          value: operation.inRoute,
          icon: Truck,
          attention: false,
        },
      ],
    },
    {
      key: "today",
      title: "Hoje",
      description: "O que o dia produziu, no fuso da empresa",
      tiles: [
        {
          key: "deliveredToday",
          label: "Entregues hoje",
          hint: "Concluídas no dia",
          value: operation.deliveredToday,
          icon: CheckCircle2,
          attention: false,
        },
        {
          key: "failedToday",
          label: "Insucessos hoje",
          hint: "Falha registrada no dia, ainda sem entrega",
          value: operation.failedToday,
          icon: PackageX,
          attention: operation.failedToday > 0,
        },
        {
          key: "occurrencesToday",
          label: "Ocorrências hoje",
          hint: "Relatadas pelo motorista no dia",
          value: operation.occurrencesToday,
          icon: AlertTriangle,
          attention: operation.occurrencesToday > 0,
        },
      ],
    },
  ];
}

const OperationPanel = ({
  operation,
  basePath,
}: OperationPanelProps): JSX.Element => {
  const groups = operationGroups(operation);

  return (
    <Card
      className="shadow-md mt-6"
      data-operation-panel
      data-tutorial="operation-panel"
    >
      <CardHeader>
        <div
          className="flex flex-col gap-3
          sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1 min-w-0">
            <CardTitle>Operação de hoje</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              A fila sem motorista, as rotas de hoje e o que o dia já produziu,
              em entregas.
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`${basePath}/deliveries`}>Abrir entregas</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.key}
              data-operation-group={group.key}
              aria-labelledby={`operation-group-${group.key}`}
              className="min-w-0"
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <h3
                  id={`operation-group-${group.key}`}
                  className="text-sm font-semibold"
                >
                  {group.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {group.description}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.tiles.map((tile) => {
                  const Icon = tile.icon;

                  return (
                    <div
                      key={tile.key}
                      data-tile={tile.key}
                      className={cn(
                        "rounded-lg border p-3 min-w-0",
                        tile.attention &&
                          "border-amber-500/40 bg-amber-500/5 dark:border-amber-400/40",
                      )}
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            tile.attention &&
                              "text-amber-600 dark:text-amber-400",
                          )}
                        />
                        <span className="truncate text-xs">{tile.label}</span>
                      </div>

                      <p className="mt-2 text-2xl font-semibold tabular-nums">
                        {tile.value}
                      </p>

                      {/*
                        The tile's own sentence, not a tooltip: "Designadas" and
                        "Em rota" are the same word to anyone who has not run a
                        dispatch desk, and a hover is not an explanation on a
                        phone.
                      */}
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {tile.hint}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export { OperationPanel, operationGroups };
export type { DeliveryOperation };
