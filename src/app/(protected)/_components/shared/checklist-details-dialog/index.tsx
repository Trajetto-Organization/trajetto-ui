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
  Calendar,
  Gauge,
  FileText,
  ClipboardCheck,
} from "lucide-react";

import { ChecklistAIVerificationSection } from "./checklist-ai-verification-section";
import { formatNotificationDate } from "@/lib/format-values";
import { formatPickedDay } from "@/features/vehicle/lib/picked-day";

import type { ChecklistDetailsDialogProps } from "./shared/common.types";
import type { InfoItem } from "./checklist-details-dialog.types";

import { overallConditionConfig } from "./data";

const ChecklistDetailsDialog = ({
  checklistData,
  isOpen,
  onOpenChange,
}: ChecklistDetailsDialogProps): JSX.Element => {
  const conditionConfig =
    overallConditionConfig[checklistData.overall_condition];

  const technicalInformationData = [
    { technicalData: `ID: ${checklistData.id}` },
    {
      technicalData: `Criado: ${formatNotificationDate(checklistData.created_at, "pt-BR")}`,
    },
    { technicalData: `Veículo ID: ${checklistData.vehicleId}` },
    {
      technicalData: `Atualizado: ${formatNotificationDate(checklistData.updated_at, "pt-BR")}`,
    },
  ];

  const checklistInfoItems: InfoItem[] = [
    {
      icon: Calendar,
      label: "Data",
      content: (
        // The day the checklist means, as the table and the row label read
        // it: a date-only 00:00 UTC value is its UTC day, not the day
        // before in the browser's zone.
        <Badge variant="outline">
          {formatPickedDay(checklistData.checklist_date)}
        </Badge>
      ),
    },
    {
      icon: Gauge,
      label: "Quilometragem",
      content: (
        <Badge variant="outline">
          {checklistData.current_mileage.toLocaleString("pt-BR")} km
        </Badge>
      ),
    },
    {
      icon: ClipboardCheck,
      label: "Condição Geral",
      content: conditionConfig ? (
        <Badge variant="outline" className={conditionConfig.color}>
          {conditionConfig.label}
        </Badge>
      ) : (
        <Badge variant="outline">
          {checklistData.overall_condition || "N/A"}
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
            {checklistData.vehicle?.description || "N/A"}
          </Badge>
          {checklistData.vehicle?.license_plate && (
            <span className="text-xs text-muted-foreground">
              Placa: {checklistData.vehicle.license_plate}
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
          <Badge variant="outline">{checklistData.driver?.name || "N/A"}</Badge>
          {checklistData.driver?.cnh && (
            <span className="text-xs text-muted-foreground">
              CNH: {checklistData.driver.cnh}
            </span>
          )}
        </div>
      ),
    },
    {
      icon: MapPin,
      label: "Filial",
      content: (
        <Badge variant="outline">
          {checklistData.branch?.corporate_reason || "N/A"}
        </Badge>
      ),
    },
  ];

  if (checklistData.business?.corporate_reason) {
    relatedInfoItems.push({
      icon: Building2,
      label: "Empresa",
      content: (
        <Badge variant="outline">
          {checklistData.business.corporate_reason}
        </Badge>
      ),
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogScrollContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Checklist</DialogTitle>
          <DialogDescription>
            Informações completas e verificação IA do checklist veicular
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Dados do Checklist
              </h3>

              <div className="space-y-3">
                {checklistInfoItems.map(
                  ({ icon: Icon, label, content }, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}:</span>
                      {content}
                    </div>
                  ),
                )}
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
          {checklistData.notes && (
            <>
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  Observações
                </h3>
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-sm">{checklistData.notes}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* AI Verification */}
          <ChecklistAIVerificationSection checklistData={checklistData} />
          <Separator />

          {/* Technical Information */}
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">
            Informações Técnicas
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            {technicalInformationData.map(({ technicalData }, idx) => (
              <span key={idx}>{technicalData}</span>
            ))}
          </div>
        </div>
      </DialogScrollContent>
    </Dialog>
  );
};

export { ChecklistDetailsDialog };
