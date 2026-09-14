import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Loader, BrainCircuit } from "lucide-react";
import {
  Dialog,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import FormInput from "@/components/shared/custom/form-input";

import { handleUpdateAILimit } from "@/actions/business/update-ai-limit";
import { getAIUsage, type AIUsageData } from "@/actions/business/get-ai-usage";

import { useAIVerificationStore } from "@/store/ai-verification-store";
import { formatNotificationDate } from "@/lib/format-values";

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

  const initialValue = aiUsage?.ai_analysis_limit ?? 0;
  const [currentValue, setCurrentValue] = useState<number>(initialValue);

  const isDirty = currentValue !== initialValue;

  useEffect(() => {
    setCurrentValue(aiUsage?.ai_analysis_limit ?? 0);
  }, [aiUsage]);

  // Running analyses count toward the bar (their quota is committed) but are
  // labeled separately — they are not completed verifications.
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
                <span className="ml-2 text-xs font-normal text-blue-600">
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
                  ? "bg-red-100 text-red-800 border-red-200"
                  : usagePercentage >= 70
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "bg-green-100 text-green-800 border-green-200"
              }
            >
              {usagePercentage >= 100
                ? "Limite atingido"
                : `${Math.round(usagePercentage)}% utilizado`}
            </Badge>

            {aiUsage.ai_analysis_reset_at && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">
                  Último reset:{" "}
                  {formatNotificationDate(
                    aiUsage.ai_analysis_reset_at,
                    "pt-BR",
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <FormInput
          label="Limite mensal de verificações"
          htmlfor="ai_analysis_limit"
          name="ai_analysis_limit"
          type="number"
          min={0}
          max={10000}
          defaultValue={aiUsage?.ai_analysis_limit || 0}
          placeholder="Ex: 100"
          errorName={state.updateAILimitError?.ai_analysis_limit}
          disabled={pending}
          onChange={(e) => {
            const val = e.target.value;
            setCurrentValue(val === "" ? -1 : Number(val));
          }}
          onKeyDown={(e) => {
            if (["+", "-", "e", "E", ".", ","].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <p className="text-xs text-muted-foreground -mt-2">
          0 = desabilitado (sem verificação IA). Máximo: 10.000
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCloseAILimit}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !isDirty}>
            <span>Salvar Limite</span>
            {pending && (
              <div className="ml-2 animate-spin">
                <Loader className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>
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
    handleUpdateAILimit,
    defaultState,
  );

  const { formRef } = useUpdateAILimitForm({
    state,
    handleCloseAILimit,
  });

  const [serverUsage, setServerUsage] = useState<AIUsageData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState<boolean>(false);

  // Real-time usage from WebSocket events (reactive selector)
  const realtimeUsage = useAIVerificationStore((s) =>
    s.businessUsage.get(businessId),
  );

  // Merge: real-time takes priority over server data
  const aiUsage: AIUsageData | null = realtimeUsage
    ? {
        ai_analysis_used: realtimeUsage.used,
        ai_analysis_in_progress: realtimeUsage.inProgress ?? 0,
        ai_analysis_limit: realtimeUsage.limit,
        ai_analysis_reset_at:
          realtimeUsage.resetAt || serverUsage?.ai_analysis_reset_at || null,
      }
    : serverUsage;

  useEffect(() => {
    if (isAILimitOpen) {
      setIsLoadingUsage(true);
      getAIUsage(businessId)
        .then((response) => {
          if (response.success && response.data) {
            setServerUsage(response.data);
          }
        })
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
      <DialogScrollContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Configurar Limite IA
          </DialogTitle>
          <DialogDescription>
            Defina o limite mensal de verificações IA para{" "}
            <strong>{businessName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmitAILimit}>
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
