import { useState } from "react";
import { useQuery } from "react-query";

import { BrainCircuit, Loader } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAIUsage } from "@/actions/business/get-ai-usage";
import {
  getAIVerificationProgress,
  requestAIVerification,
  type AIRecordType,
} from "@/actions/ai-analysis";

/**
 * "Verificar com IA": starts (or revives) the analysis of an existing
 * record — the path for records created before the company had AI quota,
 * quota-denied skips and failed runs. Progress then arrives through the
 * regular websocket events.
 *
 * Renders nothing while the company has AI disabled (limit 0): offering a
 * button that can only answer "não habilitada" is a dead end, not a feature.
 */
const RequestAIVerificationButton = ({
  recordType,
  recordId,
  businessId,
  isRetry,
}: {
  recordType: AIRecordType;
  recordId: string;
  businessId: string;

  /** Changes the label: a failed/skipped record reads "verificar novamente". */
  isRetry: boolean;
}): JSX.Element | null => {
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: usageResponse } = useQuery(
    ["ai-usage", businessId],
    () => getAIUsage(businessId),
    { staleTime: 60_000, refetchOnWindowFocus: false },
  );

  const aiEnabled =
    usageResponse?.success === true &&
    (usageResponse.data?.ai_analysis_limit ?? 0) > 0;

  const handleRequest = async () => {
    setIsRequesting(true);

    try {
      const result = await requestAIVerification(recordType, recordId);

      if (result.success) {
        toast.success(result.message, { id: `ai-${recordId}` });
      } else {
        toast.error(result.message, { id: `ai-${recordId}` });
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (!aiEnabled) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRequest}
      disabled={isRequesting}
    >
      {isRequesting ? (
        <Loader className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <BrainCircuit className="h-4 w-4 mr-2" />
      )}
      {isRetry ? "Verificar novamente com IA" : "Verificar com IA"}
    </Button>
  );
};

/**
 * Durable progress box for a record whose SERVER status says "analyzing" but
 * whose websocket history died with a page refresh: polls the analysis
 * request in the database so the dialog shows "3 de 8 fotos" (or "aguardando
 * nova tentativa") instead of a bare spinner forever.
 */
const AIAnalysisProgressFallback = ({
  recordType,
  recordId,
}: {
  recordType: AIRecordType;
  recordId: string;
}): JSX.Element => {
  const { data } = useQuery(
    ["ai-analysis-progress", recordType, recordId],
    () => getAIVerificationProgress(recordType, recordId),
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    },
  );

  const progress = data?.data;

  const isWaitingRetry =
    progress?.status === "PENDING" &&
    progress.availableAt !== null &&
    new Date(progress.availableAt).getTime() > Date.now();

  const label = !progress
    ? "Analisando..."
    : isWaitingRetry
      ? `Aguardando nova tentativa (${progress.unitsCompleted}/${progress.unitsTotal} fotos analisadas)`
      : progress.unitsTotal > 1
        ? `Analisando... ${progress.unitsCompleted} de ${progress.unitsTotal} fotos`
        : "Analisando...";

  const percent =
    progress && progress.unitsTotal > 0
      ? Math.max(
          8,
          Math.round((progress.unitsCompleted / progress.unitsTotal) * 100),
        )
      : 8;

  return (
    <div
      className="bg-blue-50 dark:bg-blue-900/20 border
      border-blue-200 dark:border-blue-800 rounded-md p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Loader className="h-4 w-4 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {label}
        </span>
      </div>
      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export { AIAnalysisProgressFallback, RequestAIVerificationButton };
