import { useAIVerificationStore } from "@/store/ai-verification-store";
import { BrainCircuit, AlertTriangle, Loader } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatNotificationDate } from "@/lib/format-values";

import {
  AIAnalysisProgressFallback,
  RequestAIVerificationButton,
} from "@/app/(protected)/_components/shared/ai-verification";

import type { ChecklistDetailsDialogProps } from "../shared/common.types";
import { aiStatusConfig, fieldLabels, fieldStatusConfig } from "../data";

/** Server statuses where offering a (re-)verification makes sense. */
const REQUESTABLE_STATUSES = ["pending", "skipped", "error"];

// AI Verification Section
const ChecklistAIVerificationSection = ({
  checklistData,
}: {
  checklistData: ChecklistDetailsDialogProps["checklistData"];
}): JSX.Element => {
  const realtimeEvent = useAIVerificationStore((s) =>
    s.verifications.get(checklistData.id),
  );

  const aiStatus = checklistData.ai_verification_status as string | undefined;
  const aiDetails = checklistData.ai_verification_details as Record<
    string,
    any
  > | null;

  const serverAnalyzedAt = checklistData.ai_verified_at as
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

  const aiAnalyzedAt = isRealtimeCompleted
    ? realtimeEvent.timestamp || serverAnalyzedAt
    : serverAnalyzedAt;

  const config = effectiveStatus
    ? aiStatusConfig[effectiveStatus] || aiStatusConfig.pending
    : null;

  // Parse server details
  const parsedServerDetails: Record<string, any> | null =
    typeof aiDetails === "string"
      ? (() => {
          try {
            return JSON.parse(aiDetails);
          } catch {
            return null;
          }
        })()
      : aiDetails;

  // Merge real-time field results with server data (real-time overwrites per field)
  const realtimeFieldResults = isRealtimeCompleted
    ? realtimeEvent.currentResult?.fieldResults
    : null;

  const effectiveDetails: Record<string, any> | null =
    realtimeFieldResults && parsedServerDetails
      ? { ...parsedServerDetails, ...realtimeFieldResults }
      : realtimeFieldResults || parsedServerDetails;

  const fieldEntries = effectiveDetails ? Object.entries(effectiveDetails) : [];

  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-3">
        <BrainCircuit className="h-4 w-4" />
        Verificação IA
      </h3>

      {!config ? (
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-500 border-gray-200"
          >
            Sem verificação
          </Badge>
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
                  {realtimeEvent.fieldName
                    ? `Analisando: ${fieldLabels[realtimeEvent.fieldName] || realtimeEvent.fieldName}`
                    : `Etapa ${realtimeEvent.stepNumber}/${realtimeEvent.totalSteps}`}
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
              recordType="checklist"
              recordId={checklistData.id}
            />
          )}

          {/* Manual (re-)verification for records the pipeline never ran or failed */}
          {!isAnalyzing &&
            !isAnalyzingWithoutRealtime &&
            effectiveStatus &&
            REQUESTABLE_STATUSES.includes(effectiveStatus) && (
              <RequestAIVerificationButton
                recordType="checklist"
                recordId={checklistData.id}
                businessId={checklistData.businessId}
                isRetry={effectiveStatus !== "pending"}
              />
            )}

          {/* Issues found alert */}
          {effectiveStatus === "issues_found" && (
            <div
              className="bg-yellow-50 dark:bg-yellow-900/20 border
              border-yellow-200 dark:border-yellow-800 rounded-md
              p-3 flex items-start gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Algumas condições informadas não correspondem às fotos
                analisadas pela IA.
              </p>
            </div>
          )}

          {/* Error alert */}
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

          {/* Per-field results */}
          {fieldEntries.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Campos analisados ({fieldEntries.length})
              </p>
              <div className="space-y-2">
                {fieldEntries.map(([fieldName, result]) => {
                  const statusCfg =
                    fieldStatusConfig[result.status] ||
                    fieldStatusConfig.inconclusive;
                  const StatusIcon = statusCfg.Icon;

                  return (
                    <div
                      key={fieldName}
                      className="bg-muted/30 p-3 rounded-md space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {fieldLabels[fieldName] || fieldName}
                        </span>
                        <div className="flex items-center gap-2">
                          {result.confidence !== undefined &&
                            result.confidence > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {Math.round(
                                  result.confidence > 1
                                    ? result.confidence
                                    : result.confidence * 100,
                                )}
                                %
                              </Badge>
                            )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusCfg.color}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </div>
                      </div>
                      {result.observation && (
                        <p className="text-xs text-muted-foreground">
                          {result.observation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { ChecklistAIVerificationSection };
