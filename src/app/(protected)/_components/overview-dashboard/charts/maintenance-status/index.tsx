import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { cn } from "@/lib/utils";

interface MaintenanceStat {
  name: string;
  value: number;
  color: string;
}

interface MaintenanceStatusProps {
  stats: MaintenanceStat[];
}

/**
 * The fleet's maintenance situation, which the API has always computed
 * (overdue by date or mileage, due within 30 days or never recorded, up to
 * date) and no screen showed.
 *
 * Keyed by the names the dashboard action gives the three numbers; an
 * unknown name still shows, under its own name.
 */
const STATUS_COPY: Record<
  string,
  { label: string; hint: string; order: number }
> = {
  Atrasado: {
    label: "Atrasada",
    hint: "Passou da data ou da quilometragem da revisão",
    order: 0,
  },
  "Manutenção Pendente": {
    label: "A vencer",
    hint: "Vence em até 30 dias ou ainda sem registro",
    order: 1,
  },
  "Recém Manutenido": {
    label: "Em dia",
    hint: "Próxima revisão depois de 30 dias",
    order: 2,
  },
};

function maintenanceStatusRows(stats: MaintenanceStat[]) {
  return stats
    .map((stat) => {
      const copy = STATUS_COPY[stat.name];

      return {
        key: stat.name,
        label: copy?.label ?? stat.name,
        hint: copy?.hint ?? "",
        order: copy?.order ?? Number.MAX_SAFE_INTEGER,
        value: stat.value,
        attention: copy?.order === 0 && stat.value > 0,
      };
    })
    .sort((a, b) => a.order - b.order);
}

const MaintenanceStatus = ({
  stats,
}: MaintenanceStatusProps): JSX.Element | null => {
  const rows = maintenanceStatusRows(stats);

  if (rows.length === 0) return null;

  return (
    <Card data-maintenance-status>
      <CardHeader>
        <CardTitle>Manutenção da frota</CardTitle>
        <CardDescription>
          Situação da próxima revisão de cada veículo, por data e por
          quilometragem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {rows.map((row) => (
            <div
              key={row.key}
              data-maintenance-row={row.label}
              className={cn(
                "min-w-0 rounded-lg border p-3",
                row.attention &&
                  "border-red-500/40 bg-red-500/5 dark:border-red-400/40",
              )}
            >
              <p className="truncate text-xs text-muted-foreground">
                {row.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {row.value}
              </p>
              {row.hint && (
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {row.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export { MaintenanceStatus, maintenanceStatusRows };
