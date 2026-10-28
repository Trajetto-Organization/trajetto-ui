"use client";

import Link from "next/link";

import {
  BrainCircuit,
  Loader,
  Calendar,
  Building2,
  NotepadText,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { Separator } from "@/components/ui/separator";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { SelectBusinessEmptyState } from "@/components/shared/custom/select-business-empty-state";

import { BusinessSelector } from "../../business-selector";

import type { LimitsContentProps } from "./limits-content.types";
import { useLimitsContent } from "./hooks";
import { useAuthStore } from "@/store/auth-store";

import { LimitStatusBadge } from "./limit-status-badge";
import { VehicleSlotsCard } from "./vehicle-slots-card";

import {
  aiQuotaNote,
  aiQuotaScope,
  limitsPlanModules,
  showsFineLookupCard,
} from "./lib/ai-quota-scope";
import {
  AI_HIGH_USAGE_PERCENT,
  nextResetSentence,
  periodStartSentence,
  remainingSentence,
  usageRows,
} from "./lib/ai-usage-copy";

const LimitsContent = ({
  businessId: businessIdProp,
  mode,
  showBusinessSelector,
}: LimitsContentProps): JSX.Element => {
  const {
    aiUsage,
    entitlements,
    planStatus,
    isLoading,
    errorMessage,
    businessId,
  } = useLimitsContent({
    businessId: businessIdProp,
  });

  // The company's modules: the plan's answer, else (company users only) the
  // session's own list — a failed plan request must not bring the other
  // module's rows back.
  const sessionModules = useAuthStore((state) => state.enabledModules);
  const planModules = limitsPlanModules(
    entitlements?.modules,
    mode,
    sessionModules,
  );

  // Reservations of running analyses count toward the bar/badge (they are
  // committed spend), but the "realizadas" number shows only what finished.
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

  const getStatusBadge = () => {
    if (!aiUsage) return null;
    if (aiUsage.ai_analysis_limit === 0) {
      return <LimitStatusBadge tone="neutral">Desabilitado</LimitStatusBadge>;
    }

    if (usagePercentage >= 100) {
      return <LimitStatusBadge tone="danger">Limite atingido</LimitStatusBadge>;
    }

    if (usagePercentage >= AI_HIGH_USAGE_PERCENT) {
      return <LimitStatusBadge tone="warning">Uso elevado</LimitStatusBadge>;
    }

    return <LimitStatusBadge tone="success">Ativo</LimitStatusBadge>;
  };

  // The fines screen of this company: the MASTER's /admin pages take the
  // company from the URL. The card only exists with Gestão de Frotas, and
  // this page only for the MASTER and the company's admin, who both open it.
  const finesHref =
    mode === "admin" && businessId
      ? `/admin/fine?businessId=${encodeURIComponent(businessId)}`
      : "/dashboard/fine";

  // MASTER with no business selected — show selector + placeholder
  if (mode === "admin" && !businessId) {
    return (
      <div className="space-y-6">
        {showBusinessSelector && (
          <div className="flex items-center gap-3">
            <BusinessSelector currentBusinessId={businessId} />
          </div>
        )}

        {/* Same empty state as every screen with the selector on top
            (decision 3.7). */}
        <SelectBusinessEmptyState
          icon={Zap}
          description="Os limites de uso são contratados por empresa; escolha a empresa acima para ver o consumo e as vagas dela."
        />
      </div>
    );
  }

  // BUSINESS_ADMIN with no businessId in store
  if (mode === "dashboard" && !businessId) {
    return (
      <EmptyState
        icon={Building2}
        title="Nenhuma empresa associada"
        description="Seu usuário não está vinculado a uma empresa. Entre em contato com o administrador."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Business selector for MASTER */}
      {showBusinessSelector && mode === "admin" && (
        <div className="flex items-center gap-3">
          <BusinessSelector currentBusinessId={businessId} />
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div
          data-tutorial="loading"
          className="flex items-center justify-center py-16"
        >
          <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Limit cards — 2 columns from lg: with the sidebar open, md
              left two cards of ~190px each. Headers put the badge beside the
              title from xl only, for the same reason. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Verification Card */}
            <Card
              className="shadow-sm hover:shadow-md transition-shadow"
              data-tutorial="ai-usage-card"
            >
              <CardHeader className="flex flex-col items-start gap-2 space-y-0 pb-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 shrink-0 text-primary" />
                    Verificação IA
                  </CardTitle>
                  {/* One quota for the fleet readings and the proof
                      analysis of Entregas (decision 6.9): the text follows
                      the company's modules. */}
                  <CardDescription>{aiQuotaScope(planModules)}</CardDescription>
                </div>
                {getStatusBadge()}
              </CardHeader>

              <Separator />

              <CardContent className="space-y-4 pt-4">
                {aiUsage ? (
                  <>
                    {/* Usage numbers */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        {/* One unit per photo: a checklist with eight
                            photos spends eight (AI-10). */}
                        <span className="text-muted-foreground">
                          Fotos analisadas
                        </span>
                        <span className="font-semibold text-lg">
                          {aiUsage.ai_analysis_used}
                          <span className="text-muted-foreground font-normal text-sm">
                            {" "}
                            / {aiUsage.ai_analysis_limit}
                          </span>
                          {aiInProgress > 0 && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-xs font-normal
                              bg-blue-50 text-blue-700 border-blue-200
                              dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                            >
                              {aiInProgress} em análise
                            </Badge>
                          )}
                        </span>
                      </div>

                      <Progress
                        value={usagePercentage}
                        className="h-2.5"
                        indicatorClassName="bg-blue-600"
                        aria-label="Fotos da cota usadas no período"
                      />

                      <p className="text-xs text-muted-foreground">
                        {remainingSentence(
                          aiUsage.ai_analysis_limit,
                          aiUsage.ai_analysis_used,
                          aiInProgress,
                        )}
                      </p>

                      {/* What counts and what never does (ADR 0010): the
                          reading is OCR on Trajetto's own servers. */}
                      <p
                        className="text-xs text-muted-foreground"
                        data-testid="ai-quota-note"
                      >
                        {aiQuotaNote(planModules)}
                      </p>
                    </div>

                    {/* What spent the photos, in the company's modules. */}
                    {usageRows(aiUsage.ai_analysis_used_by_type, planModules)
                      .length > 0 && (
                      <ul
                        className="space-y-1 text-xs"
                        aria-label="Fotos analisadas por tipo"
                      >
                        {usageRows(
                          aiUsage.ai_analysis_used_by_type,
                          planModules,
                        ).map((row) => (
                          <li
                            key={row.key}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="min-w-0 truncate text-muted-foreground">
                              {row.label}
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">
                              {row.count.toLocaleString("pt-BR")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Reset dates */}
                    <div className="space-y-2 pt-2 border-t">
                      {periodStartSentence(
                        aiUsage.ai_analysis_reset_at,
                        aiUsage.ai_analysis_timezone,
                      ) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {periodStartSentence(
                              aiUsage.ai_analysis_reset_at,
                              aiUsage.ai_analysis_timezone,
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {nextResetSentence(
                            aiUsage.ai_analysis_next_reset_at,
                            aiUsage.ai_analysis_timezone,
                          )}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {errorMessage ||
                      "Não foi possível carregar os dados de uso."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* The plan's vehicle slots, with the AI card's hierarchy. */}
            <VehicleSlotsCard
              entitlements={entitlements}
              planStatus={planStatus}
              planModules={planModules}
            />

            {/* Consulta de multas: not part of this version (the Celcoin
                automation is out of scope), and the card says so instead of
                promising it — no quota, no usage, no number. Fines are
                Frotas: no card without the module. A full row, so the two
                cards with numbers stay side by side above it. */}
            {showsFineLookupCard(planModules) && (
              <Card
                className="shadow-sm border-dashed lg:col-span-2"
                data-tutorial="fine-lookup-card"
              >
                <CardHeader className="flex flex-col items-start gap-2 space-y-0 pb-2 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <NotepadText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      Consulta de Multas
                    </CardTitle>
                    <CardDescription>
                      Consultas automáticas de infrações
                    </CardDescription>
                  </div>
                  <LimitStatusBadge tone="notice">
                    Fora desta versão
                  </LimitStatusBadge>
                </CardHeader>

                <Separator />

                <CardContent className="flex items-start gap-3 pt-4">
                  <Sparkles
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      A consulta automática de multas não faz parte desta
                      versão: não há cota nem consumo a acompanhar.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      As multas recebidas são registradas na tela{" "}
                      <Link
                        href={finesHref}
                        className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                      >
                        Multas
                      </Link>
                      .
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* No "Analytics de Uso" placeholder: it promised charts of
              fine lookups that are not in this version (decision 10.5 —
              nothing the product does not do). The breakdown by kind above
              is the usage detail that exists. */}
        </>
      )}
    </div>
  );
};

export { LimitsContent };
