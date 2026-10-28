import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";

import {
  BrainCircuit,
  CheckCircle2,
  Loader,
  PauseCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  requestAIVerification,
  type AIAnalysisProgress,
  type AIRecordType,
} from "@/actions/ai-analysis";
import { isStaleActionResult } from "@/lib/action-result";
import { relayUrl } from "@/lib/api-relay-paths";
import { relayAnswer, relayJson } from "@/lib/relay-read";

import { pollInterval, progressView } from "./progress-view";

/** The record's durable progress: one key, shared by the button and the box. */
const progressKey = (recordType: AIRecordType, recordId: string) =>
  ["ai-analysis-progress", recordType, recordId] as const;

/**
 * A relay GET (lib/relay-read): polled while an analysis runs, it took a
 * turn in Next's one-at-a-time Server Action queue on every tick. Answered
 * as a value (`success`, `data`), a refusal included.
 */
async function fetchProgress(
  recordType: AIRecordType,
  recordId: string,
  signal?: AbortSignal,
) {
  const errorMessage = "Houve um erro ao consultar o progresso da IA.";

  return relayAnswer(
    relayJson<{ data: AIAnalysisProgress }>(
      relayUrl(
        `/ai-analysis/progress/${encodeURIComponent(recordType)}/${encodeURIComponent(recordId)}`,
      ),
      { signal, errorMessage },
    ).then((answer) => answer.data),
    errorMessage,
  );
}

/**
 * "Verificar com IA": starts (or revives) the analysis of an existing
 * record — the path for records created before the company had AI quota,
 * quota-denied skips and failed runs. Progress then arrives through the
 * regular websocket events.
 *
 * Shown only to whom the API says may ask (`canRequest`: the record's write
 * permission, not a driver, AI on in the company). It used to be decided by
 * the company's usage, which only admins may read — so a profile allowed to
 * ask never saw the button, and the API accepted anyone who called it (AI-1).
 */
const RequestAIVerificationButton = ({
  recordType,
  recordId,
  isRetry,
}: {
  recordType: AIRecordType;
  recordId: string;

  /** Changes the label: a failed/skipped record reads "verificar novamente". */
  isRetry: boolean;
}): JSX.Element | null => {
  const [isRequesting, setIsRequesting] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery(
    progressKey(recordType, recordId),
    ({ signal }) => fetchProgress(recordType, recordId, signal),
    { staleTime: 30_000, refetchOnWindowFocus: false },
  );

  const canRequest = data?.success === true && data.data?.canRequest === true;

  const handleRequest = async () => {
    setIsRequesting(true);

    try {
      const result = await requestAIVerification(recordType, recordId);

      if (isStaleActionResult(result)) return;

      if (result.success) {
        toast.success(result.message, { id: `ai-${recordId}` });
      } else {
        toast.error(result.message, { id: `ai-${recordId}` });
      }

      // The box below follows the new request from its first step.
      await queryClient.invalidateQueries(progressKey(recordType, recordId));
    } finally {
      setIsRequesting(false);
    }
  };

  if (!canRequest) return null;

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
 * nova tentativa") instead of a bare spinner.
 *
 * It stops at a terminal status and reloads the screen's data once, so the
 * record's verdict replaces the box (AI-6); the company's `aiAnalysisChanged`
 * hint makes that immediate instead of the next 5-second poll.
 */
const AIAnalysisProgressFallback = ({
  recordType,
  recordId,
}: {
  recordType: AIRecordType;
  recordId: string;
}): JSX.Element => {
  const router = useRouter();
  const refreshed = useRef(false);

  const { data } = useQuery(
    progressKey(recordType, recordId),
    ({ signal }) => fetchProgress(recordType, recordId, signal),
    {
      refetchInterval: (latest) => pollInterval(latest?.data),
      refetchOnWindowFocus: false,
    },
  );

  const progress = data?.data;
  const view = progressView(progress);

  useEffect(() => {
    if (!view.terminal || refreshed.current) return;

    refreshed.current = true;
    router.refresh();
  }, [view.terminal, router]);

  const tones = {
    running: {
      box: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      bar: "bg-blue-200 dark:bg-blue-800",
      fill: "bg-blue-600",
    },
    done: {
      box: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      bar: "bg-emerald-200 dark:bg-emerald-800",
      fill: "bg-emerald-600",
    },
    paused: {
      box: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
      text: "text-amber-800 dark:text-amber-300",
      bar: "bg-amber-200 dark:bg-amber-800",
      fill: "bg-amber-500",
    },
    failed: {
      box: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
      bar: "bg-red-200 dark:bg-red-800",
      fill: "bg-red-600",
    },
  }[view.tone];

  const Icon = {
    running: Loader,
    paused: PauseCircle,
    done: CheckCircle2,
    failed: XCircle,
  }[view.tone];

  return (
    <div className={`border rounded-md p-3 ${tones.box}`} role="status">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`h-4 w-4 shrink-0 ${tones.text} ${view.tone === "running" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${tones.text}`}>
          {view.label}
        </span>
      </div>
      <div className={`w-full rounded-full h-1.5 ${tones.bar}`}>
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${tones.fill}`}
          style={{ width: `${view.percent}%` }}
        />
      </div>
    </div>
  );
};

export { AIAnalysisProgressFallback, RequestAIVerificationButton };
