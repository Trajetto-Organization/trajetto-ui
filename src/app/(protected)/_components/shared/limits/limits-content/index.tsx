"use client";

import {
  BrainCircuit,
  Loader,
  Calendar,
  Building2,
  NotepadText,
  Sparkles,
  Truck,
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

import {
  aiQuotaNote,
  aiQuotaScope,
  limitsPlanModules,
  showsFineLookupCard,
} from "./lib/ai-quota-scope";
import {
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
  const { aiUsage, entitlements, isLoading, errorMessage, businessId } =
    useLimitsContent({
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

  const fleetPercentage =
    entitlements && entitlements.vehicle_limit_enabled
      ? Math.min(
          (entitlements.vehicle_count / entitlements.vehicle_limit) * 100,
          100,
        )
      : 0;

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
      return (
        <Badge
          variant="outline"
          className="bg-gray-100 shrink-0 truncate text-gray-700 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-border"
        >
          Desabilitado
        </Badge>
      );
    }

    if (usagePercentage >= 100) {
      return (
        <Badge
          variant="outline"
          className="bg-red-100 shrink-0 truncate
          text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
        >
          Limite atingido
        </Badge>
      );
    }

    if (usagePercentage >= 70) {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-100 shrink-0 truncate
          text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900"
        >
          Uso elevado
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-green-100 shrink-0 truncate
        text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
      >
        Ativo
      </Badge>
    );
  };

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
          {/* Limit cards — 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Verification Card */}
            <Card
              className="shadow-sm hover:shadow-md transition-shadow"
              data-tutorial="ai-usage-card"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-primary" />
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

            {/* Fleet size card — contracted vehicles vs registered */}
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    {/* Vehicles serve both modules, not only Frotas. */}
                    Veículos
                  </CardTitle>
                  <CardDescription>
                    Veículos ativos × contratados no plano
                  </CardDescription>
                </div>
                {entitlements &&
                  (entitlements.vehicle_limit_enabled ? (
                    fleetPercentage >= 100 ? (
                      <Badge
                        variant="outline"
                        className="bg-red-100 shrink-0 truncate text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                      >
                        Limite atingido
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-100 shrink-0 truncate text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900"
                      >
                        Ativo
                      </Badge>
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 shrink-0 truncate text-gray-700 border-gray-200 dark:bg-muted dark:text-muted-foreground dark:border-border"
                    >
                      Sem limite
                    </Badge>
                  ))}
              </CardHeader>

              <Separator />

              <CardContent className="space-y-4 pt-4">
                {entitlements ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Veículos ativos
                      </span>
                      <span className="font-semibold text-lg">
                        {entitlements.vehicle_count}
                        {entitlements.vehicle_limit_enabled && (
                          <span className="text-muted-foreground font-normal text-sm">
                            {" "}
                            / {entitlements.vehicle_limit}
                          </span>
                        )}
                        {(entitlements.vehicle_inactive_count ?? 0) > 0 && (
                          <span className="ml-2 text-muted-foreground font-normal text-xs">
                            +{entitlements.vehicle_inactive_count} inativo(s)
                          </span>
                        )}
                      </span>
                    </div>

                    {entitlements.vehicle_limit_enabled ? (
                      <>
                        <Progress
                          value={fleetPercentage}
                          className="h-2.5"
                          indicatorClassName="bg-blue-600"
                        />
                        <p className="text-xs text-muted-foreground">
                          {entitlements.vehicle_limit -
                            entitlements.vehicle_count >
                          0
                            ? `${entitlements.vehicle_limit - entitlements.vehicle_count} vaga(s) restante(s) no plano`
                            : "Todas as vagas do plano estão em uso — novos cadastros e reativações estão bloqueados. Inativar um veículo libera a vaga."}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Sem limite de veículos configurado para esta empresa.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não foi possível carregar os dados da frota.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Consulta de multas: not part of this version (the Celcoin
                automation is out of scope), and the card says so instead of
                promising it. Fines are Frotas: no card without the module. */}
            {showsFineLookupCard(planModules) && (
              <Card className="shadow-sm border-dashed">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle
                      className="text-base font-semibold flex 
                    items-center gap-2 text-muted-foreground"
                    >
                      <NotepadText className="h-5 w-5" />
                      Consulta de Multas
                    </CardTitle>
                    <CardDescription>
                      Consultas automáticas de infrações
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary 
                  border-primary/20 truncate block"
                  >
                    Fora desta versão
                  </Badge>
                </CardHeader>

                <Separator />

                <CardContent
                  className="flex flex-col items-center 
                justify-center py-10 text-center"
                >
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    A consulta automática de multas não faz parte desta versão.
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Registre as multas na tela Multas.
                  </p>
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
