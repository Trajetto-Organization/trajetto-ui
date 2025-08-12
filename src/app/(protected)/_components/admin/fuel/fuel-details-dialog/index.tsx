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
  Camera,
} from "lucide-react";

import { FuelInfoAlert } from "../fuel-info-alert";
import { FuelDetailsDialogProps } from "./dto";

import { useFetchVehicleData } from "../../../search-vehicle-by-id-business";

const FuelDetailsDialog = ({
  fuelData,
  isOpen,
  onOpenChange,
}: FuelDetailsDialogProps) => {
  // Fetch vehicle data for efficiency calculations
  const { data: vehicleData, isLoading } = useFetchVehicleData({
    vehicleId: fuelData.vehicleId,
    businessId: fuelData.businessId || "",
  });

  // Conversions for calculations
  const liters = parseFloat(fuelData.liters_amount.replace(",", ".")) || 0;
  const pricePerLiter =
    parseFloat(
      fuelData.price_per_liter.replace(/[^\d,]/g, "").replace(",", "."),
    ) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FuelIcon className="h-5 w-5" />
            Detalhes do Abastecimento
          </DialogTitle>
          <DialogDescription>
            Informações completas e análise de eficiência do abastecimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FuelIcon className="h-4 w-4" />
                Dados do Abastecimento
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Data:</span>
                  <Badge variant="outline">
                    {fuelData.refueling_date || "N/A"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <FuelIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Litros:</span>
                  <Badge variant="secondary">{fuelData.liters_amount}L</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Preço/L:</span>
                  <Badge variant="secondary">{fuelData.price_per_liter}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total:</span>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800 hover:bg-green-900 hover:text-green-100"
                  >
                    {fuelData.total_amount}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Quilometragem:</span>
                  <Badge variant="outline">
                    {fuelData.current_mileage.toLocaleString()} km
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informações Relacionadas
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Veículo:</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {fuelData.vehicle_description || "N/A"}
                    </Badge>{" "}
                    /
                    {fuelData.vehicle_license_plate && (
                      <span className="text-xs text-muted-foreground mt-1">
                        Placa: {fuelData.vehicle_license_plate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Motorista:</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {fuelData.driver_name || "N/A"}
                    </Badge>
                    /
                    {fuelData.driver_cnh && (
                      <span className="text-xs text-muted-foreground mt-1">
                        CNH: {fuelData.driver_cnh}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FuelIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Combustível:</span>
                  <Badge variant="outline">
                    {fuelData.fuel_type_description || "N/A"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Filial:</span>
                  <Badge variant="outline">{fuelData.branch_name}</Badge>
                </div>

                {fuelData.business_name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Empresa:</span>
                    <Badge variant="outline">{fuelData.business_name}</Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Observations */}
          {fuelData.notes && fuelData.notes !== "N/A" && (
            <>
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
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

          {/* Odometer Status */}
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4" />
              Status do Odômetro
            </h3>
            <div className="flex items-center gap-2">
              <Badge
                variant={fuelData.odometer_verified ? "default" : "secondary"}
                className={
                  fuelData.odometer_verified
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
                }
              >
                {fuelData.odometer_verified
                  ? "✅ Verificado"
                  : "⏳ Não Verificado"}
              </Badge>
              {fuelData.odometer_photo && fuelData.odometer_photo !== "N/A" && (
                <span className="text-xs text-muted-foreground">
                  Foto disponível
                </span>
              )}
            </div>
          </div>

          <Separator />

          {/* Efficiency Analysis */}
          <div>
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4" />
              Análise de Eficiência
            </h3>

            {isLoading ? (
              <div className="animate-pulse bg-muted/30 h-32 rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground">
                  Carregando dados do veículo...
                </span>
              </div>
            ) : vehicleData ? (
              <FuelInfoAlert
                liters={liters}
                pricePerLiter={pricePerLiter}
                currentMileage={fuelData.current_mileage}
                lastFuelMileage={vehicleData.last_maintenance_mileage as number}
              />
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Não foi possível carregar os dados do veículo para análise
                  de eficiência.
                </p>
              </div>
            )}
          </div>

          {/* Technical Information */}
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">
              Informações Técnicas
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>ID: {fuelData.id}</div>
              <div>Criado: {fuelData.created_at}</div>
              <div>Veículo ID: {fuelData.vehicleId}</div>
              <div>Atualizado: {fuelData.updated_at}</div>
            </div>
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { FuelDetailsDialog };
