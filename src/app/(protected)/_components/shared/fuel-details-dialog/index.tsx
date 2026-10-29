import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Car,
  User,
  Building2,
  MapPin,
  Fuel as FuelIcon,
  Calendar,
  DollarSign,
  Gauge,
  FileText,
  TrendingUp,
} from "lucide-react";

import { FuelInfoAlert } from "./fuel-info-alert";
import { useFuelTechnicalDetails } from "./hooks/use-fuel-technical-details";

import type { FuelDetailsDialogProps } from "./shared/common.types";
import type { InfoItem } from "./fuel-details-dialog.types";

import { AIVerificationSection } from "./ai-verification-section";
import {
  formatToBrazilianCurrency,
  formatNotificationDate,
} from "@/lib/format-values";
import { formatPricePerLiter } from "@/features/fuel/lib/price";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

const FuelDetailsDialog = ({
  fuelData,
  isOpen,
  onOpenChange,
}: FuelDetailsDialogProps): JSX.Element => {
  const {
    vehicleData,
    isLoading,
    previousFuelData,
    isLoadingPreviousFuel,
    liters,
    pricePerLiter,
  } = useFuelTechnicalDetails(fuelData, isOpen);

  const technicalInformationData = [
    { technicalData: `ID: ${fuelData.id}` },
    {
      technicalData: `Criado: ${formatNotificationDate(fuelData.created_at, "pt-BR")}`,
    },
    { technicalData: `Veículo ID: ${fuelData.vehicleId}` },
    {
      technicalData: `Atualizado: ${formatNotificationDate(fuelData.updated_at, "pt-BR")}`,
    },
  ];

  const fuelInfoItems: InfoItem[] = [
    {
      icon: Calendar,
      label: "Data",
      content: (
        <Badge variant="outline">
          {/* A picked day: an API client's "YYYY-MM-DD" is 00:00 UTC, which the
              browser's zone read as the day before (API: pickedDayKey). */}
          {formatPickedDay(fuelData.refueling_date)}
        </Badge>
      ),
    },
    {
      icon: FuelIcon,
      label: "Litros",
      content: (
        <Badge variant="secondary">
          {fuelData.liters_amount.toFixed(3).replace(".", ",")}L
        </Badge>
      ),
    },
    {
      icon: DollarSign,
      label: "Preço por litro",
      content: (
        // Decimal(10,3), as the pump shows it: money formatting read 5.899
        // as "R$ 5,90". The unit keeps it apart from the Total beside it.
        <Badge variant="secondary">
          {formatPricePerLiter(fuelData.price_per_liter)}/L
        </Badge>
      ),
    },
    {
      icon: DollarSign,
      label: "Total",
      content: (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 
          hover:bg-green-300 hover:text-green-950"
        >
          {formatToBrazilianCurrency(fuelData.total_amount)}
        </Badge>
      ),
    },
    {
      icon: Gauge,
      label: "Quilometragem",
      content: (
        <Badge variant="outline">
          {fuelData.current_mileage.toLocaleString("pt-BR")} km
        </Badge>
      ),
    },
  ];

  const relatedInfoItems: InfoItem[] = [
    {
      icon: Car,
      label: "Veículo",
      content: (
        <div className="flex gap-2 items-center">
          <Badge variant="outline">
            {fuelData.vehicle?.description || "N/A"}
          </Badge>
          {fuelData.vehicle?.license_plate && (
            <span className="text-xs text-muted-foreground">
              Placa: {fuelData.vehicle.license_plate}
            </span>
          )}
        </div>
      ),
    },
    {
      icon: User,
      label: "Motorista",
      content: (
        <div className="flex gap-2 items-center">
          <Badge variant="outline">{fuelData.driver?.name || "N/A"}</Badge>
          {fuelData.driver?.cnh && (
            <span className="text-xs text-muted-foreground">
              CNH: {fuelData.driver.cnh}
            </span>
          )}
        </div>
      ),
    },
    {
      icon: FuelIcon,
      label: "Combustível",
      content: (
        <Badge variant="outline">
          {fuelData.fuelType?.description || "N/A"}
        </Badge>
      ),
    },
    {
      icon: MapPin,
      label: "Filial",
      content: (
        <Badge variant="outline">
          {fuelData.branch?.corporate_reason || "N/A"}
        </Badge>
      ),
    },
  ];

  if (fuelData.business?.corporate_reason) {
    relatedInfoItems.push({
      icon: Building2,
      label: "Empresa",
      content: (
        <Badge variant="outline">{fuelData.business.corporate_reason}</Badge>
      ),
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Abastecimento</DialogTitle>
          <DialogDescription>
            Informações completas e análise de eficiência do abastecimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div
            className="grid grid-cols-1 
            md:grid-cols-2 gap-4"
          >
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FuelIcon className="h-4 w-4" />
                Dados do Abastecimento
              </h3>

              <div className="space-y-3">
                {fuelInfoItems.map(({ icon: Icon, label, content }, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}:</span>
                    {content}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informações Relacionadas
              </h3>

              <div className="space-y-3">
                {relatedInfoItems.map(({ icon: Icon, label, content }, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}:</span>
                    {content}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Observations */}
          {fuelData.notes && (
            <>
              <div>
                <h3
                  className="font-semibold flex 
                  items-center gap-2 mb-3"
                >
                  <FileText className="h-4 w-4" />
                  Observações
                </h3>
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-sm">{fuelData.notes}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* AI Verification */}
          <AIVerificationSection fuelData={fuelData} />
          <Separator />

          {/* Efficiency Analysis */}
          <div>
            <h3
              className="font-semibold flex 
              items-center gap-2 mb-3"
            >
              <TrendingUp className="h-4 w-4" />
              Análise de Eficiência
            </h3>

            {isLoading || isLoadingPreviousFuel ? (
              <div
                className="animate-pulse bg-muted/30 h-32
                rounded-md flex items-center justify-center"
              >
                <span className="text-sm text-muted-foreground">
                  Carregando dados de eficiência...
                </span>
              </div>
            ) : vehicleData ? (
              <FuelInfoAlert
                liters={liters}
                pricePerLiter={pricePerLiter}
                currentMileage={fuelData.current_mileage}
                vehicleKmPerLiter={vehicleData.km_per_liter}
                lastFuelMileage={previousFuelData?.current_mileage}
              />
            ) : (
              <div
                className="bg-yellow-50 dark:bg-yellow-900/20 
                border border-yellow-200 rounded-md p-4"
              >
                <p
                  className="text-sm text-yellow-700 
                  dark:text-yellow-300"
                >
                  ⚠️ Não foi possível carregar os dados do veículo para análise
                  de eficiência.
                </p>
              </div>
            )}
          </div>

          {/* Technical Information */}
          <h3
            className="font-semibold text-sm
            text-muted-foreground mb-2"
          >
            Informações Técnicas
          </h3>

          <div
            className="grid grid-cols-2 gap-4
            text-xs text-muted-foreground"
          >
            {technicalInformationData.map(({ technicalData }, idx) => (
              <span key={idx}>{technicalData}</span>
            ))}
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { FuelDetailsDialog };
