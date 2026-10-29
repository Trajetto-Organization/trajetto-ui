import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, BrainCircuit } from "lucide-react";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateAILimit } from "@/actions/business/update-ai-limit";
import type { AIUsageData } from "@/actions/business/get-ai-usage";
import { fetchAIUsage } from "@/lib/business-reads";

import {
  freshestUsage,
  useAIVerificationStore,
} from "@/store/ai-verification-store";
import { periodStartSentence } from "@/app/(protected)/_components/shared/limits/limits-content/lib/ai-usage-copy";
import { guardFormAction } from "@/lib/action-result";
import { updateAILimitSchema } from "@/schemas/update-ai-limit-schema";
import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { useUpdateAILimitForm, type UpdateAILimitFormState } from "./hooks";

interface UpdateAILimitFormProps {
  businessId: string;
  businessName: string;
  isAILimitOpen: boolean;
  handleCloseAILimit: () => void;
}

const UpdateAILimitFormSubmit = ({
  state,
  aiUsage,
  isLoadingUsage,
  handleCloseAILimit,
}: {
  state: UpdateAILimitFormState;
  aiUsage: AIUsageData | null;
  isLoadingUsage: boolean;
  handleCloseAILimit: () => void;
}) => {
  const { pending } = useFormStatus();

  const initialValue = String(aiUsage?.ai_analysis_limit ?? 0);
  // Controlled, as live validation reads it: the text typed, not a number.
  const [limit, setLimit] = useState<string>(initialValue);

  const isDirty = limit !== initialValue;

  // Keyed on the stored limit, not the usage object: every socket update
  // of the usage is a new object and would wipe what is being typed.
  const storedLimit = aiUsage?.ai_analysis_limit ?? 0;
  useEffect(() => {
    setLimit(String(storedLimit));
  }, [storedLimit]);

  // Live validation (decision 16.700) with the action's schema. An empty
  // field would be coerced to 0 (analysis off) without a word, so it is
  // asked for instead.
  const live = useLiveValidation({
    schema: updateAILimitSchema,
    values: { ai_analysis_limit: limit },
    rules: (values) => ({
      ai_analysis_limit:
        values.ai_analysis_limit.trim() === ""
          ? "Informe o limite mensal (0 desabilita a análise)."
          : null,
    }),
    serverErrors: state.updateAILimitError,
  });

  // Running analyses count toward the bar (their quota is committed) but are
  // labeled separately — they are not photos analysed yet.
  const aiInProgress = aiUsage?.ai_analysis_in_progress ?? 0;

  const usagePercentage =
    aiUsage && aiUsage.ai_analysis_limit > 0
      ? Math.min(
          ((aiUsage.ai_analysis_used + aiInProgress) /
            aiUsage.ai_analysis_limit) *
            100,
          100,
        )
      : 0;

  if (isLoadingUsage) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {aiUsage && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Uso atual</span>
            <span className="font-medium">
              {aiUsage.ai_analysis_used} / {aiUsage.ai_analysis_limit}
              {aiInProgress > 0 && (
                <span className="ml-2 text-xs font-normal text-blue-600 dark:text-blue-400">
                  +{aiInProgress} em análise
                </span>
              )}
            </span>
          </div>

          <Progress
            value={usagePercentage}
            className="h-2"
            indicatorClassName="bg-blue-600"
          />

          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={
                usagePercentage >= 90
                  ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                  : usagePercentage >= 70
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900"
                    : "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
              }
            >
              {usagePercentage >= 100
                ? "Limite atingido"
                : `${Math.round(usagePercentage)}% utilizado`}
            </Badge>

            {/* The company's month (AI-15): the instant it began there. */}
            {periodStartSentence(
              aiUsage.ai_analysis_reset_at,
              aiUsage.ai_analysis_timezone,
            ) && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {periodStartSentence(
                    aiUsage.ai_analysis_reset_at,
                    aiUsage.ai_analysis_timezone,
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={live.ref} className="space-y-4">
        <FormInput
          label="Limite mensal de fotos analisadas *"
          htmlfor="ai_analysis_limit"
          name="ai_analysis_limit"
          type="number"
          min={0}
          max={10000}
          value={limit}
          placeholder="Ex: 100"
          errorName={live.errorOf("ai_analysis_limit")}
          disabled={pending}
          onChange={(e) => setLimit(e.target.value)}
          onKeyDown={(e) => {
            if (["+", "-", "e", "E", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <p className="text-xs text-muted-foreground -mt-2">
          Cada foto conta uma vez: odômetro, item de checklist ou canhoto. 0 =
          desabilitado. Máximo: 10.000.
        </p>

        {/* A small modal: Cancelar and Salvar side by side (decision 3.2). */}
        <DialogFormFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseAILimit}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={pending || !canSubmitForm({ isEdit: true, isDirty })}
          >
            <span>Salvar Limite</span>
            {pending && <Loader className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </DialogFormFooter>
      </div>
    </div>
  );
};

const UpdateAILimitForm = ({
  businessId,
  businessName,
  isAILimitOpen,
  handleCloseAILimit,
}: UpdateAILimitFormProps) => {
  const defaultState: UpdateAILimitFormState = {};
  const [state, dispatch] = useFormState<UpdateAILimitFormState, FormData>(
    guardFormAction(handleUpdateAILimit),
    defaultState,
  );

  const { formRef } = useUpdateAILimitForm({
    state,
    handleCloseAILimit,
  });

  // The server answer and WHEN it was asked for: a socket event older than
  // the question must not overwrite the fresher answer (DLVP-ADM-2).
  const [server, setServer] = useState<{
    usage: AIUsageData;
    askedAt: number;
  } | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);

  // Real-time usage from WebSocket events (reactive selector)
  const realtimeUsage = useAIVerificationStore((s) =>
    s.businessUsage.get(businessId),
  );

  // The newer of the two wins, as on the Limites de uso screen: "real-time
  // always wins" showed a stale socket event over a fresh server answer.
  const aiUsage = freshestUsage(
    server?.usage ?? null,
    server?.askedAt ?? 0,
    realtimeUsage,
  ) as AIUsageData | null;

  useEffect(() => {
    if (isAILimitOpen) {
      setIsLoadingUsage(true);
      const askedAt = Date.now();

      // A relay GET (lib/business-reads); a refusal leaves the card as is.
      fetchAIUsage(businessId)
        .then(
          (usage) => setServer({ usage, askedAt }),
          () => undefined,
        )
        .finally(() => setIsLoadingUsage(false));
    }
  }, [isAILimitOpen, businessId]);

  const handleSubmitAILimit = (formData: FormData) => {
    formData.append("businessId", businessId);
    return dispatch(formData);
  };

  return (
    <Dialog
      onOpenChange={() => {
        if (isAILimitOpen) {
          formRef.current?.reset();
        }

        handleCloseAILimit();
      }}
      open={isAILimitOpen}
    >
      <DialogScrollContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Configurar Limite IA
          </DialogTitle>
          <DialogDescription>
            Defina quantas fotos a IA pode analisar por mês para{" "}
            <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmitAILimit} noValidate>
          <UpdateAILimitFormSubmit
            state={state}
            aiUsage={aiUsage}
            isLoadingUsage={isLoadingUsage}
            handleCloseAILimit={handleCloseAILimit}
          />
        </form>
      </DialogScrollContent>
    </Dialog>
  );
};

export { UpdateAILimitForm };
