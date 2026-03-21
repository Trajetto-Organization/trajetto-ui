"use client";

import { ChartArea } from "./area-chart";
import { ChartBar } from "./bar-chart";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

import type { ChartsProps } from "../shared/common.types";

const Charts = ({ dashboardData, userRole }: ChartsProps): JSX.Element => {
  if (userRole === "BUSINESS_USER") {
    return (
      <Alert className="my-8">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-center py-8">
          <div className="space-y-2">
            <p className="font-medium">Análise Gráfica Restrita</p>
            <p className="text-muted-foreground">
              Você não possui permissão para visualizar os gráficos analíticos.
              Entre em contato com o administrador para solicitar acesso.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <ChartArea
        activityTrends={dashboardData.activityTrends}
        userRole={userRole}
      />

      <div className="grid grid-cols-1">
        <ChartBar maintenanceCosts={dashboardData.maintenanceCosts} />
      </div>
    </div>
  );
};

export { Charts };
