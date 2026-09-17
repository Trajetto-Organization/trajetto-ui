"use client";

import { useState } from "react";
import { useQuery } from "react-query";

import { toast } from "sonner";

import {
  CheckCircle2,
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
import { Textarea } from "@/components/ui/textarea";

import {
  listProofAudits,
  reviewProofAudit,
  type ProofAuditCard,
  type ProofAuditStatus,
} from "@/actions/delivery/proof-audits";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { ProofPhotoViewer } from "./photo-viewer";

import {
  CRITERIA,
  NO_SUGGESTION_NOTICE,
  SUGGESTION_LABELS,
  SUGGESTION_TONES,
  VERDICT_LABELS,
  VERDICT_TONES,
  asPercent,
} from "./lib/criteria";

interface ProofAuditsPanelProps {
  businessId: string;
}

const PAGE_SIZE = 20;

const STATUS_TABS: Array<{ value: ProofAuditStatus; label: string }> = [
  { value: "PENDING", label: "Na fila" },
  { value: "APPROVED", label: "Aprovados" },
  { value: "REJECTED", label: "Rejeitados" },
];

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
 */
const ProofAuditsPanel = ({
  businessId,
}: ProofAuditsPanelProps): JSX.Element => {
  const [status, setStatus] = useState<ProofAuditStatus>("PENDING");

  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");

  const [savingId, setSavingId] = useState<string | null>(null);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const { data, isLoading, refetch } = useQuery(
    ["proof_audit", businessId, status],
    () => listProofAudits(businessId, status, 1, PAGE_SIZE),
    { refetchOnWindowFocus: false },
  );

  const cards = data?.data?.data ?? [];
  const meta = data?.data?.meta;

  const handleReview = async (
    card: ProofAuditCard,
    verdict: "APPROVED" | "REJECTED",
  ) => {
    if (verdict === "REJECTED" && reason.trim().length < 5) {
      toast.error("Diga por que o comprovante foi rejeitado.");
      return;
    }

    setSavingId(card.id);

    try {
      const result = await reviewProofAudit(
        businessId,
        card.id,
        verdict,
        verdict === "REJECTED" ? reason.trim() : undefined,
      );

      if (!result.success) {
        // Verbatim: the API says either "diga por quê" or "outra pessoa já
        // revisou", and both are exactly what the reviewer has to know.
        toast.error(result.message, { duration: 8000 });

        // A 409 means the queue moved under them. Refetching is the only
        // honest response — leaving the stale card on screen invites a second
        // press on something that is already decided.
        void refetch();
        return;
      }

      toast.success(result.message);

      setRejecting(null);
      setReason("");

      void refetch();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Situação dos comprovantes"
          value={status}
          options={STATUS_TABS.map((tab) => ({
            ...tab,
            count: meta
              ? tab.value === "PENDING"
                ? meta.pending
                : tab.value === "APPROVED"
                  ? meta.approved
                  : meta.rejected
              : undefined,
          }))}
          onChange={(value) => {
            setStatus(value);

            // The reason box belongs to the card that was open; carrying it
            // to another queue would put somebody else's words on it.
            setRejecting(null);
          }}
        />

        {meta?.agreementRate !== null && meta?.agreementRate !== undefined && (
          <p className="text-xs text-muted-foreground">
            A leitura automática concordou com a pessoa em{" "}
            <strong>{asPercent(meta.agreementRate)}</strong> dos comprovantes
            revisados.
          </p>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      )}

      {!isLoading && cards.length === 0 && (
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
                  <Badge variant="outline">Sem leitura automática</Badge>
                )}
              </header>

              <div className="grid gap-4 lg:grid-cols-2">
                <ProofPhotoViewer
                  url={card.photoUrl}
                  alt={`Canhoto da entrega para ${card.delivery.recipient_name}`}
                />

                <div className="space-y-3">
                  {suggestion ? (
                    <>
                      <ul className="space-y-1.5">
                        {CRITERIA.map((criterion) => {
                          const verdict = suggestion.reading[
                            criterion.key
                          ] as keyof typeof VERDICT_LABELS;

                          return (
                            <li
                              key={criterion.key}
                              className="flex items-start justify-between gap-3
                              text-sm"
                            >
                              <span className="min-w-0">
                                <span className="block">{criterion.label}</span>
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
                        })}
                      </ul>

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
                      {NO_SUGGESTION_NOTICE}
                    </p>
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
                    <Textarea
                      value={reason}
                      onChange={(event) =>
                        setReason(event.target.value.slice(0, 500))
                      }
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
                          onClick={() => {
                            setRejecting(null);
                            setReason("");
                          }}
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
                <p className="mt-4 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {card.status === "APPROVED" ? "Aprovado" : "Rejeitado"} por{" "}
                  {card.reviewerName ?? "alguém"} em{" "}
                  {formatMoment(card.reviewed_at)}
                  {card.rejection_reason ? ` — ${card.rejection_reason}` : ""}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export { ProofAuditsPanel, PAGE_SIZE, STATUS_TABS };
