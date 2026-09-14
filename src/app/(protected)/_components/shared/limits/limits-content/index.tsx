"use client";

import {
  BrainCircuit,
  Loader,
  Calendar,
  Building2,
  NotepadText,
  BarChart3,
  TrendingUp,
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

import { formatNotificationDate } from "@/lib/format-values";
import { BusinessSelector } from "../../business-selector";

import type { LimitsContentProps } from "./limits-content.types";
import { useLimitsContent } from "./hooks";

const LimitsContent = ({
  businessId: businessIdProp,
  mode,
  showBusinessSelector,
}: LimitsContentProps): JSX.Element => {
  const { aiUsage, entitlements, isLoading, errorMessage, businessId } =
    useLimitsContent({
      businessId: businessIdProp,
    });

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
          className="bg-gray-100 shrink-0 truncate
          text-gray-700 border-gray-200"
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
          text-red-800 border-red-200"
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
          text-yellow-800 border-yellow-200"
        >
          Uso elevado
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="bg-green-100 shrink-0 truncate
        text-green-800 border-green-200"
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

        <div
          className="flex flex-col items-center border-dashed
          justify-center h-80 rounded-lg border-2"
        >
          <Zap className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-center text-sm">
            Selecione uma empresa para visualizar seus limites de uso
          </p>
        </div>
      </div>
    );
  }

  // BUSINESS_ADMIN with no businessId in store
  if (mode === "dashboard" && !businessId) {
    return (
      <div
        className="flex flex-col items-center justify-center 
        h-80 rounded-lg border-2 border-dashed"
      >
        <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground text-center text-sm">
          Usuário não possui uma empresa associada. Entre em contato com o
          administrador.
        </p>
      </div>
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
        <div className="flex items-center justify-center py-16">
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
                  <CardDescription>
                    Leitura inteligente de abastecimentos e checklists
                  </CardDescription>
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
                        <span className="text-muted-foreground">
                          Verificações realizadas
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
                        {aiUsage.ai_analysis_limit -
                          aiUsage.ai_analysis_used -
                          aiInProgress >
                        0
                          ? `${aiUsage.ai_analysis_limit - aiUsage.ai_analysis_used - aiInProgress} verificações restantes neste período`
                          : aiUsage.ai_analysis_limit === 0
                            ? "Verificação IA não habilitada para esta empresa"
                            : "Todas as verificações foram utilizadas neste período"}
                      </p>
                    </div>

                    {/* Reset dates */}
                    <div className="space-y-2 pt-2 border-t">
                      {aiUsage.ai_analysis_reset_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Último reset:{" "}
                            {formatNotificationDate(
                              aiUsage.ai_analysis_reset_at,
                              "pt-BR",
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Próximo reset: dia 1º do próximo mês</span>
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
                    Veículos da Frota
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
                        className="bg-red-100 shrink-0 truncate text-red-800 border-red-200"
                      >
                        Limite atingido
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-green-100 shrink-0 truncate text-green-800 border-green-200"
                      >
                        Ativo
                      </Badge>
                    )
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 shrink-0 truncate text-gray-700 border-gray-200"
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

            {/* Multas Card — Coming soon */}
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
                  Em breve
                </Badge>
              </CardHeader>

              <Separator />

              <CardContent
                className="flex flex-col items-center 
                justify-center py-10 text-center"
              >
                <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Limite mensal de consultas
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Disponível em breve
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analytics section — Coming soon */}
          <Card className="shadow-sm border-dashed">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle
                    className="text-base font-semibold flex 
                    items-center gap-2 text-muted-foreground"
                  >
                    <BarChart3 className="h-5 w-5" />
                    Analytics de Uso
                  </CardTitle>
                  <CardDescription>
                    Gráficos e dados detalhados sobre o consumo dos serviços
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-primary/5 text-primary 
                  border-primary/20 truncate block"
                >
                  Em breve
                </Badge>
              </div>
            </CardHeader>

            <Separator />

            <CardContent
              className="flex flex-col items-center 
              justify-center py-16 text-center"
            >
              <div className="flex items-center gap-3 mb-4">
                {Array.from([
                  { height: "h-24", bg: "bg-muted/30" },
                  { height: "h-12", bg: "bg-muted/40" },
                  { height: "h-24", bg: "bg-muted/30" },
                  { height: "h-12", bg: "bg-muted/40" },
                  { height: "h-24", bg: "bg-muted/30" },
                  { height: "h-12", bg: "bg-muted/40" },
                  { height: "h-24", bg: "bg-muted/30" },
                ]).map(({ height, bg }, index) => (
                  <div
                    key={index}
                    className={`${height} w-8 ${bg} rounded-sm`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <p className="text-sm font-medium">
                  Histórico de consumo, tendências e relatórios
                </p>
              </div>
              <p className="text-xs text-muted-foreground/60 max-w-md">
                Visualize gráficos de uso ao longo do tempo, compare períodos e
                acompanhe a evolução do consumo de verificações IA e consultas
                de multas.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export { LimitsContent };
