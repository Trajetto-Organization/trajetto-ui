"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import { toast } from "sonner";

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader,
  ThumbsUp,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

import { EmptyState } from "@/components/shared/custom/empty-state";
import { FilterChips } from "@/components/shared/custom/filter-chips";
import { TextareaField } from "@/components/shared/custom/textarea-field";

import {
  reviewProofAudit,
  type ProofAuditCard,
  type ProofAuditListData,
  type ProofAuditMeta,
  type ProofAuditStatus,
} from "@/actions/delivery/proof-audits";

import { permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import { isStaleActionResult } from "@/lib/action-result";
import { relayUrl } from "@/lib/api-relay-paths";
import { relayNdjson } from "@/lib/relay-read";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";

import { ImageInspector } from "./image-inspector";

import {
  AI_STATE_LABELS,
  AI_STATE_NOTICES,
  AI_STATE_TONES,
  SUGGESTION_LABELS,
  SUGGESTION_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  aiStateOf,
  answeredCriteria,
  asPercent,
  comparisonRows,
  criteriaToCheck,
} from "./lib/criteria";
import { devicePrecheckView } from "./lib/device-precheck";
import {
  REJECTION_REASON_MAX,
  rejectionReasonProblem,
} from "./lib/rejection-reason";

interface ProofAuditsPanelProps {
  /**
   * The company picked in /admin. Empty or absent on /dashboard, where the
   * company is the session's: the panel resolves it itself (DLVB-03).
   */
  businessId?: string;
}

const PAGE_SIZE = 20;

const STATUS_TABS: Array<{ value: ProofAuditStatus; label: string }> = [
  { value: "PENDING", label: "Na fila" },
  { value: "APPROVED", label: "Aprovados" },
  { value: "REJECTED", label: "Rejeitados" },
];

/** The meta as the API sends it now; the action's type predates the window. */
type QueueMeta = ProofAuditMeta & { agreementWindowDays?: number };

const formatMoment = (value: string | null): string =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

/**
 * The queue where a person looks at a receipt and decides.
 *
 * One card at a time, expanded, rather than a table: the decision needs the
 * photo big enough to read a signature on, and a table row that has to be
 * clicked to see the only thing that matters is a table pretending to be a
 * worklist.
 *
 * The AI's reading sits NEXT TO the photo, never in place of it, and the
 * buttons say "aprovar"/"rejeitar" and not "concordar" — a reviewer agreeing
 * with a machine is a reviewer who stopped looking, which is the failure this
 * queue exists to prevent.
 *
 * The company: the one picked in /admin, else the session's. On /dashboard
 * the page passed `""`, the listing sent `businessId=` and the API's refusal
 * was drawn as an empty queue, and approving built `/business/` (DLVB-03).
 * The queue below is keyed by the company, so switching companies starts it
 * over — status, page and an open rejection included (decision 2.6).
 *
 * Only /dashboard reaches it without a company (in /admin the page shows the
 * selector's empty state itself), and there is no selector there to point
 * at: until the session's company arrives it is the queue loading.
 */
const ProofAuditsPanel = ({
  businessId,
}: ProofAuditsPanelProps): JSX.Element => {
  const sessionBusinessId = useDeliveriesBusinessId();
  const sessionLoaded = useAuthStore((state) => state.isLoaded);
  const sessionRole = useAuthStore((state) => state.role);

  const resolvedBusinessId = businessId || sessionBusinessId;

  if (!resolvedBusinessId) {
    // The server pass and the first client one run before setAuth, and
    // loadAuth alone fills the role but not the company. Only a master's
    // session really has none.
    if (!sessionLoaded || sessionRole !== "MASTER") {
      return (
        <div className="space-y-4">
          {/* The chips the queue draws above its cards (its Atualizar is
              the Torre's, up in the header). */}
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-9 min-w-0 flex-1 sm:w-80 sm:flex-initial" />
          </div>

          <QueueSkeleton />
        </div>
      );
    }

    return (
      <EmptyState
        icon={Building2}
        title="Empresa não identificada"
        description="A fila de comprovantes é de uma operação específica, e esta sessão não está vinculada a nenhuma empresa. No painel administrativo, escolha a empresa no seletor do topo."
      />
    );
  }

  return (
    <ProofAuditQueue key={resolvedBusinessId} businessId={resolvedBusinessId} />
  );
};

const QueueSkeleton = (): JSX.Element => (
  <div
    className="space-y-3"
    aria-busy="true"
    data-testid="proof-audit-queue-loading"
  >
    <Skeleton className="h-96" />
    <Skeleton className="h-96" />
  </div>
);

const ProofAuditQueue = ({
  businessId,
}: {
  businessId: string;
}): JSX.Element => {
  const [status, setStatus] = useState<ProofAuditStatus>("PENDING");
  const [page, setPage] = useState<number>(1);

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const [savingId, setSavingId] = useState<string | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery(
    ["proof_audit", businessId, status, page],
    // A relay GET (lib/relay-read): every chip asks again, and as a Server
    // Action each ask waited for the page's other reads. A refusal rejects
    // and is an error on screen, never an empty queue: "nenhum comprovante"
    // over a 400 is how the /dashboard bug hid (DLVB-03).
    async ({ signal }): Promise<ProofAuditListData> => {
      const { meta, data } = await relayNdjson<ProofAuditCard>(
        relayUrl(
          "/delivery/proof-audits",
          new URLSearchParams({
            businessId,
            status,
            page: String(page),
            pageSize: String(PAGE_SIZE),
          }),
        ),
        { signal, errorMessage: "Houve um erro ao carregar a fila." },
      );

      return {
        data,
        total: meta?.total ?? data.length,
        currentPage: meta?.page ?? page,
        pageSize: meta?.pageSize ?? PAGE_SIZE,
        meta: meta?.searchMeta,
      };
    },
    {
      refetchOnWindowFocus: false,

      // A worklist several reviewers drain at once: every chip asks again.
      staleTime: 0,

      // Another status's cards, with their Aprovar/Rejeitar buttons, must
      // not stand in for this one's while it loads (REV-13).
      keepPreviousData: false,

      retry: false,
    },
  );

  // A review moves a card between the three lists and changes all three
  // counters, so the whole company prefix goes stale, not only the chip on
  // screen — "Aprovados" used to keep its five-minute-old list (REV-5).
  const refreshQueue = () =>
    queryClient.invalidateQueries(["proof_audit", businessId]);

  const cards: ProofAuditCard[] = data?.data ?? [];
  const meta = data?.meta as QueueMeta | undefined;

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The last card of the last page was decided: step back to a page that
  // still has cards instead of showing an empty one.
  useEffect(() => {
    if (data && page > lastPage) setPage(lastPage);
  }, [data, page, lastPage]);

  const closeRejection = () => {
    setRejecting(null);
    setReason("");
    setReasonError(null);
  };

  const handleReview = async (
    card: ProofAuditCard,
    verdict: "APPROVED" | "REJECTED",
  ) => {
    if (verdict === "REJECTED") {
      const problem = rejectionReasonProblem(reason);

      if (problem) {
        setReasonError(problem);
        return;
      }
    }

    setSavingId(card.id);

    try {
      const result = await reviewProofAudit(
        businessId,
        card.id,
        verdict,
        verdict === "REJECTED" ? reason.trim() : undefined,
      );

      if (isStaleActionResult(result)) return;

      if (!result.success) {
        // Verbatim: the API says either "diga por quê", which rule the reason
        // broke, or "outra pessoa já revisou", and each is exactly what the
        // reviewer has to know.
        toast.error(result.message, { duration: 8000 });

        // A 409 means the queue moved under them. Refetching is the only
        // honest response — leaving the stale card on screen invites a second
        // press on something that is already decided.
        void refreshQueue();
        return;
      }

      toast.success(result.message);

      closeRejection();

      void refreshQueue();
    } finally {
      setSavingId(null);
    }
  };

  const countOf = (value: ProofAuditStatus): number | undefined =>
    meta
      ? value === "PENDING"
        ? meta.pending
        : value === "APPROVED"
          ? meta.approved
          : meta.rejected
      : undefined;

  return (
    <div className="space-y-4">
      {/*
        The queue's own bar: the three counters. Its Atualizar is the
        Torre's, up in the header like every other view's (decision of
        28/10/2026) — it was drawn here too, the same refresh of the whole
        tab, which made Auditoria the one view with its button elsewhere.
      */}
      <div
        className="flex flex-wrap items-center gap-3"
        data-tutorial="proof-audits-filters"
      >
        <FilterChips
          label="Situação dos comprovantes"
          value={status}
          options={STATUS_TABS.map((tab) => ({
            ...tab,
            count: countOf(tab.value),
          }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);

            // The reason box belongs to the card that was open; carrying it
            // to another queue would put somebody else's words on it.
            closeRejection();
          }}
          className="min-w-0 flex-1 sm:flex-initial"
        />
      </div>

      {/*
        Under the bar rather than beside it: this is a sentence about the
        queue, not a control over it. Bounded to a window (DLVB-04), and it
        says which.
      */}
      {meta?.agreementRate !== null && meta?.agreementRate !== undefined && (
        <p className="text-xs text-muted-foreground">
          A leitura automática concordou com a pessoa em{" "}
          <strong>{asPercent(meta.agreementRate)}</strong> dos comprovantes
          revisados
          {meta.agreementWindowDays
            ? ` nos últimos ${meta.agreementWindowDays} dias`
            : ""}
          .
        </p>
      )}

      {isLoading && <QueueSkeleton />}

      {isError && !isLoading && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed
          p-6 text-center"
        >
          <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />

          <div className="space-y-1">
            <p className="text-sm font-medium">
              Não foi possível carregar a fila
            </p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Houve um erro ao carregar a fila."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && cards.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={
            status === "PENDING"
              ? "Nenhum comprovante esperando revisão"
              : status === "APPROVED"
                ? "Nenhum comprovante aprovado ainda"
                : "Nenhum comprovante rejeitado"
          }
          description={
            status === "PENDING"
              ? "Um comprovante chega aqui quando o motorista conclui uma entrega pelo aplicativo."
              : "O que for revisado na fila aparece nesta aba."
          }
        />
      )}

      <div className="space-y-4">
        {cards.map((card) => {
          const suggestion = card.ai_suggestion;
          const isSaving = savingId === card.id;

          // Why there is no reading, when there is none (DLVP-PROOF-4).
          const readingState = aiStateOf(card);
          const missing =
            readingState === "read" ? "unavailable" : readingState;

          // The phone's offline hint, next to the server's reading (14.2).
          const precheck = devicePrecheckView(card);

          return (
            <article key={card.id} className="rounded-lg border p-4">
              <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {card.delivery.recipient_name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {card.delivery.city}/{card.delivery.uf}
                    {card.delivery.invoice_number
                      ? ` · NF ${card.delivery.invoice_number}`
                      : ""}
                    {card.delivery.driverName
                      ? ` · ${card.delivery.driverName}`
                      : ""}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Comprovada em {formatMoment(card.delivery.delivered_at)}
                    {card.delivery.received_by
                      ? ` · recebida por ${card.delivery.received_by}`
                      : ""}
                  </p>
                </div>

                {suggestion ? (
                  <Badge
                    variant="outline"
                    className={
                      SUGGESTION_TONES[suggestion.assessment.suggestion]
                    }
                  >
                    {SUGGESTION_LABELS[suggestion.assessment.suggestion]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className={AI_STATE_TONES[missing]}>
                    {AI_STATE_LABELS[missing]}
                  </Badge>
                )}
              </header>

              <div className="grid gap-4 lg:grid-cols-2">
                <ImageInspector
                  key={card.id}
                  url={card.photoUrl}
                  alt={`Canhoto da entrega para ${card.delivery.recipient_name}`}
                />

                <div className="min-w-0 space-y-3">
                  {suggestion ? (
                    <>
                      <ul className="space-y-1.5">
                        {answeredCriteria(suggestion.reading).map(
                          (criterion) => {
                            const verdict = criterion.verdict;

                            return (
                              <li
                                key={criterion.key}
                                className="flex items-start justify-between gap-3
                              text-sm"
                              >
                                <span className="min-w-0">
                                  <span className="block">
                                    {criterion.label}
                                  </span>
                                  {verdict === "no" && (
                                    <span className="block text-xs text-muted-foreground">
                                      {criterion.meaning}
                                    </span>
                                  )}
                                </span>

                                <span
                                  className={`shrink-0 text-sm font-medium ${VERDICT_TONES[verdict]}`}
                                >
                                  {VERDICT_LABELS[verdict]}
                                </span>
                              </li>
                            );
                          },
                        )}
                      </ul>

                      {/* What the reading left to a person (design P6.2):
                          neither a tick nor a cross. */}
                      {criteriaToCheck(suggestion.reading).length > 0 && (
                        <div
                          className="space-y-1 rounded-md border border-dashed p-2"
                          aria-label="Para você conferir"
                        >
                          <p className="text-xs font-medium text-muted-foreground">
                            Para você conferir
                          </p>
                          <ul className="space-y-1">
                            {criteriaToCheck(suggestion.reading).map((item) => (
                              <li key={item.key} className="text-sm">
                                <span className="block">{item.label}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {item.note}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* What was read next to what was expected: the model
                          transcribes, the code compares (decision 6.9). */}
                      {comparisonRows(suggestion.reading).length > 0 && (
                        <dl
                          className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(0,1fr)]
                          gap-x-3 gap-y-1 rounded-md border p-2 text-xs"
                          aria-label="Lido no canhoto e esperado na entrega"
                        >
                          <span className="text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">
                            Lido no canhoto
                          </span>
                          <span className="font-medium text-muted-foreground">
                            Esperado
                          </span>
                          {comparisonRows(suggestion.reading).map((row) => (
                            <div key={row.label} className="contents">
                              <dt className="text-muted-foreground">
                                {row.label}
                              </dt>
                              <dd
                                className="min-w-0 truncate"
                                title={row.read ?? undefined}
                              >
                                {row.read ?? "—"}
                              </dd>
                              <dd
                                className="min-w-0 truncate"
                                title={row.expected ?? undefined}
                              >
                                {row.expected ?? "—"}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}

                      {suggestion.reading.observation && (
                        <p className="rounded-md bg-muted/50 p-2 text-xs">
                          {suggestion.reading.observation}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Qualidade da foto:{" "}
                        {asPercent(suggestion.reading.photoQuality)} · confiança
                        da leitura: {asPercent(suggestion.reading.confidence)}
                      </p>
                    </>
                  ) : (
                    <p className="rounded-md bg-muted/50 p-3 text-sm">
                      {AI_STATE_NOTICES[missing]}
                    </p>
                  )}

                  {precheck && (
                    <div
                      className="space-y-1 rounded-md border p-2 text-xs"
                      aria-label="Pré-checagem do celular"
                    >
                      <p className="font-medium">{precheck.summary}</p>
                      {precheck.details.map((detail) => (
                        <p key={detail} className="text-muted-foreground">
                          {detail}
                        </p>
                      ))}
                      {precheck.agreement && (
                        <p className="text-muted-foreground">
                          {precheck.agreement}
                        </p>
                      )}
                    </div>
                  )}

                  {card.signatureUrl && (
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">
                        Assinatura em tela
                      </p>

                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.signatureUrl}
                        alt="Assinatura capturada em tela"
                        className="h-20 rounded-md border bg-white object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              {card.status === "PENDING" ? (
                <div className="mt-4 space-y-3 border-t pt-4">
                  {rejecting === card.id && (
                    <TextareaField
                      label="Motivo da rejeição *"
                      htmlfor={`rejection-reason-${card.id}`}
                      name="rejection_reason"
                      required
                      value={reason}
                      errorName={reasonError}
                      maxLength={REJECTION_REASON_MAX}
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (reasonError) setReasonError(null);
                      }}
                      rows={2}
                      autoFocus
                      placeholder="Por que este comprovante não serve? Ex.: canhoto de outra entrega, sem assinatura."
                      className="resize-none"
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canWrite || isSaving}
                      title={
                        canWrite
                          ? undefined
                          : permissionsRequired.tooltipMessage
                      }
                      onClick={() => void handleReview(card, "APPROVED")}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      Aprovar
                    </Button>

                    {rejecting === card.id ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={!canWrite || isSaving}
                          onClick={() => void handleReview(card, "REJECTED")}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Confirmar rejeição
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={isSaving}
                          onClick={closeRejection}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || isSaving}
                        title={
                          canWrite
                            ? undefined
                            : permissionsRequired.tooltipMessage
                        }
                        onClick={() => {
                          setRejecting(card.id);
                          setReason("");
                          setReasonError(null);
                        }}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-4 flex items-start gap-2 whitespace-pre-line border-t pt-4 text-xs text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {card.status === "APPROVED" ? "Aprovado" : "Rejeitado"} por{" "}
                    {card.reviewerName ?? "alguém"} em{" "}
                    {formatMoment(card.reviewed_at)}
                    {card.rejection_reason ? ` — ${card.rejection_reason}` : ""}
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      {total > PAGE_SIZE && (
        <nav
          aria-label="Páginas da fila de comprovantes"
          className="flex items-center justify-between gap-2"
        >
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString("pt-BR")} comprovantes · página {page} de{" "}
            {lastPage}
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Página anterior"
              disabled={page <= 1 || isFetching}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
                closeRejection();
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Próxima página"
              disabled={page >= lastPage || isFetching}
              onClick={() => {
                setPage((current) => Math.min(lastPage, current + 1));
                closeRejection();
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
};

export { ProofAuditsPanel, PAGE_SIZE, STATUS_TABS };
