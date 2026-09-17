"use client";

import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PackageX,
  Truck,
  UserCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

/**
 * What the operation is doing right now, on the screen everybody opens first.
 *
 * The cards above this one answer "how much of each thing exists this month",
 * which is the fleet question. A dispatcher opening the dashboard at seven in
 * the morning is asking something else entirely: what is still not on a
 * route, who is on the street, and what failed yesterday. Until now the
 * overview counted vehicles, drivers, parts and service orders and said
 * nothing at all about deliveries — the module the operation runs on.
 *
 * The numbers come from the same query the monitoring panel draws, so the two
 * screens cannot disagree about the same morning.
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

const OperationPanel = ({
  operation,
  basePath,
}: OperationPanelProps): JSX.Element => {
  /**
   * `attention` is not decoration. Deliveries with no route and failures
   * today are the two numbers somebody has to act on before lunch, and a row
   * of six identical grey tiles buries them among four that are merely
   * informative.
   */
  const tiles = [
    {
      key: "unassigned",
      label: "Sem rota",
      hint: "Aguardando designação",
      value: operation.unassigned,
      icon: Clock,
      attention: operation.unassigned > 0,
    },
    {
      key: "designated",
      label: "Designadas",
      hint: "Com motorista, não iniciadas",
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
      hint: "Não entregues no dia",
      value: operation.failedToday,
      icon: PackageX,
      attention: operation.failedToday > 0,
    },
    {
      key: "occurrencesToday",
      label: "Ocorrências hoje",
      hint: "Relatadas pelo motorista",
      value: operation.occurrencesToday,
      icon: AlertTriangle,
      attention: operation.occurrencesToday > 0,
    },
  ];

  return (
    <Card className="shadow-md mt-6" data-operation-panel>
      <CardHeader>
        <div
          className="flex flex-col gap-3
          sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1 min-w-0">
            <CardTitle>Operação de hoje</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              O que está em andamento agora, em entregas.
            </p>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`${basePath}/deliveries`}>Abrir entregas</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="grid grid-cols-2 gap-3
          sm:grid-cols-3 lg:grid-cols-6"
        >
          {tiles.map((tile) => {
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
                      tile.attention && "text-amber-600 dark:text-amber-400",
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
                  dispatch desk, and a hover is not an explanation on a phone.
                */}
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {tile.hint}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export { OperationPanel };
export type { DeliveryOperation };
