import { BrainCircuit, AlertTriangle, ShieldAlert, Loader } from "lucide-react";
import { useAIVerificationStore } from "@/store/ai-verification-store";

import { Badge } from "@/components/ui/badge";
import { formatNotificationDate } from "@/lib/format-values";

import {
  AIAnalysisProgressFallback,
  RequestAIVerificationButton,
} from "@/app/(protected)/_components/shared/ai-verification";

import type { FuelDetailsDialogProps } from "../shared/common.types";
import { aiStatusConfig } from "../data";

/** Server statuses where offering a (re-)verification makes sense. */
const REQUESTABLE_STATUSES = ["pending", "skipped", "error"];

const AIVerificationSection = ({
  fuelData,
}: {
  fuelData: FuelDetailsDialogProps["fuelData"];
}): JSX.Element => {
  const realtimeEvent = useAIVerificationStore((s) =>
    s.getVerification(fuelData.id),
  );

  const aiStatus = fuelData.odometer_ai_status as string | undefined;
  const serverAiReading = fuelData.odometer_ai_reading as
    number | null | undefined;

  const aiDetails = fuelData.odometer_ai_details as any | null | undefined;
  const serverAnalyzedAt = fuelData.odometer_ai_analyzed_at as
    string | Date | null | undefined;

  // Determine active status: real-time takes priority
  const isTerminalStep =
    realtimeEvent?.step === "completed" || realtimeEvent?.step === "skipped";
  const isAnalyzing = realtimeEvent && !isTerminalStep;
  const isRealtimeCompleted = realtimeEvent && isTerminalStep;

  // Server says analyzing but the websocket history died with a refresh:
  // the durable-progress fallback polls the analysis request instead.
  const isAnalyzingWithoutRealtime = !realtimeEvent && aiStatus === "analyzing";

  const effectiveStatus = realtimeEvent
    ? isRealtimeCompleted
      ? realtimeEvent.overallStatus || aiStatus
      : "analyzing"
    : aiStatus;

  // Use real-time data when available, fallback to server data
  const aiReading = isRealtimeCompleted
    ? (realtimeEvent.currentResult?.aiReadValue ?? serverAiReading)
    : serverAiReading;

  const aiAnalyzedAt = isRealtimeCompleted
    ? realtimeEvent.timestamp || serverAnalyzedAt
    : serverAnalyzedAt;

  const config = effectiveStatus
    ? aiStatusConfig[effectiveStatus] || aiStatusConfig.pending
    : null;

  // Parse details if string
  const parsedDetails =
    typeof aiDetails === "string"
      ? (() => {
          try {
            return JSON.parse(aiDetails);
          } catch {
            return null;
          }
        })()
      : aiDetails;

  // Use real-time result data when available
  const confidence = isRealtimeCompleted
    ? (realtimeEvent.currentResult?.confidence ?? parsedDetails?.confidence)
    : parsedDetails?.confidence;

  const observation = isRealtimeCompleted
    ? realtimeEvent.currentResult?.details ||
      parsedDetails?.observacao ||
      parsedDetails?.observation
    : parsedDetails?.observacao ||
      parsedDetails?.observation ||
      parsedDetails?.details;

  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <BrainCircuit className="h-4 w-4" />
        Verificação IA
      </h3>

      {!config ? (
        // No AI data — fallback to legacy odometer_verified
        <div className="flex items-center gap-2">
          <Badge
            variant={fuelData.odometer_verified ? "default" : "secondary"}
            className={
              fuelData.odometer_verified
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
            }
          >
            {fuelData.odometer_verified ? "Verificado" : "Não Verificado"}
          </Badge>
          {fuelData.odometer_photo && (
            <span className="text-xs text-muted-foreground">
              Foto disponível
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
            {aiAnalyzedAt && (
              <span className="text-xs text-muted-foreground">
                {formatNotificationDate(aiAnalyzedAt, "pt-BR")}
              </span>
            )}
          </div>

          {/* Real-time analyzing progress */}
          {isAnalyzing && realtimeEvent && (
            <div
              className="bg-blue-50 dark:bg-blue-900/20 border
              border-blue-200 dark:border-blue-800 rounded-md p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <Loader className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {realtimeEvent.message ||
                    `Etapa ${realtimeEvent.stepNumber}/${realtimeEvent.totalSteps}`}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${(realtimeEvent.stepNumber / realtimeEvent.totalSteps) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Durable progress after a refresh killed the websocket history */}
          {isAnalyzingWithoutRealtime && (
            <AIAnalysisProgressFallback
              recordType="fuel"
              recordId={fuelData.id}
            />
          )}

          {/* Manual (re-)verification for records the pipeline never ran or failed */}
          {!isAnalyzing &&
            !isAnalyzingWithoutRealtime &&
            effectiveStatus &&
            REQUESTABLE_STATUSES.includes(effectiveStatus) &&
            fuelData.odometer_photo && (
              <RequestAIVerificationButton
                recordType="fuel"
                recordId={fuelData.id}
                businessId={fuelData.businessId}
                isRetry={effectiveStatus !== "pending"}
              />
            )}

          {/* Verified: show AI reading vs reported value */}
          {(effectiveStatus === "verified" || effectiveStatus === "mismatch") &&
            aiReading !== null &&
            aiReading !== undefined && (
              <div className="bg-muted/30 p-3 rounded-md space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      Valor informado:
                    </span>
                    <p className="font-semibold">
                      {fuelData.current_mileage.toLocaleString()} km
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leitura IA:</span>
                    <p className="font-semibold">
                      {aiReading.toLocaleString()} km
                    </p>
                  </div>
                </div>
                {confidence !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Confiança:</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(confidence * 100)}%
                    </Badge>
                  </div>
                )}
                {observation && (
                  <p className="text-xs text-muted-foreground">{observation}</p>
                )}
              </div>
            )}

          {/* Mismatch alert */}
          {effectiveStatus === "mismatch" && (
            <div
              className="bg-yellow-50 dark:bg-yellow-900/20 border 
              border-yellow-200 dark:border-yellow-800 rounded-md 
              p-3 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                A leitura da IA diverge do valor informado. Verifique a
                quilometragem do veículo.
              </p>
            </div>
          )}

          {/* Fraud alert */}
          {effectiveStatus === "fraud" && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border 
              border-red-200 dark:border-red-800 rounded-md 
              p-3 flex items-start gap-2"
            >
              <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Suspeita de fraude detectada
                </p>
                {observation && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {observation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Unreadable */}
          {effectiveStatus === "unreadable" && (
            <div
              className="bg-orange-50 dark:bg-orange-900/20 border 
              border-orange-200 dark:border-orange-800 rounded-md p-3"
            >
              <p className="text-sm text-orange-700 dark:text-orange-300">
                A IA não conseguiu ler o valor do odômetro na foto.
                {observation && ` ${observation}`}
              </p>
            </div>
          )}

          {/* Error */}
          {effectiveStatus === "error" && (
            <div
              className="bg-red-50 dark:bg-red-900/20 border
              border-red-200 dark:border-red-800 rounded-md p-3"
            >
              <p className="text-sm text-red-700 dark:text-red-300">
                Não foi possível realizar a verificação IA. Tente novamente mais
                tarde.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { AIVerificationSection };
