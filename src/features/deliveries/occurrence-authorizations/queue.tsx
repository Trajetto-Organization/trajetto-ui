"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";
import {
  AlertTriangle,
  Clock,
  MapPin,
  ShieldQuestion,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { getSocket, initializeSocket, onRealtimeResync } from "@/socket";
import { useOperationsSubscription } from "@/hooks/use-operations-subscription";

import {
  decideOccurrenceAuthorization,
  type PendingAuthorization,
  type PendingAuthorizationsData,
} from "@/actions/delivery/occurrence-authorizations";
import { isStaleActionResult } from "@/lib/action-result";
import { relayUrl } from "@/lib/api-relay-paths";
import { readQuery, relayAnswer, relayJson } from "@/lib/relay-read";

import { fetchTickets } from "../chat/lib/chat-reads";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { DecisionDialog } from "./decision-dialog";
import {
  AUTHORIZATION_QUEUE_ROOT,
  addressLine,
  decisionCopy,
  isDeliveryRequest,
  queueConversationStep,
  queueTicketHref,
  settledDecisionMessage,
  waitingLabel,
  waitingTone,
} from "./rules";

interface OccurrenceAuthorizationQueueProps {
  /** The MASTER's pick; empty/undefined for everyone else (the session's). */
  businessId?: string;

  /**
   * Called when what waits changed after the first read — a decision here or
   * elsewhere, a request closed by a proof or by the sweep. A screen whose
   * own content is server-rendered (the Ocorrências table and its badges)
   * re-renders it from here; react-query keys cannot reach it.
   */
  onQueueChanged?: () => void;
}

/** A safety net under the socket: the queue is small and the answer urgent. */
const REFRESH_MS = 30_000;

/** Collapses a burst of events (a route finishing) into one read. */
const SETTLE_MS = 800;

const CLOCK_TICK_MS = 30_000;

const TONE_CLASS = {
  fresh: "text-muted-foreground",
  late: "text-amber-700 dark:text-amber-400",
  escalated: "text-red-700 dark:text-red-400",
} as const;

/**
 * The reports waiting for the tower's answer (decision 6.3), oldest first.
 *
 * Shown on the control tower and on the Ocorrências tab, above everything
 * else, because a driver is standing at an address waiting for it. It hides
 * itself when nothing waits (or when the viewer cannot read deliveries), so
 * it never adds noise to a quiet operation. Live: a new request, a decision
 * elsewhere, an escalation or a proof that supersedes one refetch it.
 */
const OccurrenceAuthorizationQueue = ({
  businessId,
  onQueueChanged,
}: OccurrenceAuthorizationQueueProps): JSX.Element | null => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useOperationsSubscription(businessId || undefined);

  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);

    return () => clearInterval(timer);
  }, []);

  const queryKey = [AUTHORIZATION_QUEUE_ROOT, businessId ?? ""];

  const query = useQuery(
    queryKey,
    // A relay GET: polled, it took a turn in Next's one-at-a-time Server
    // Action queue on every tick. A refusal (no delivery read) rejects with
    // the API's `code` and status, and the client does not retry it.
    ({ signal }) =>
      relayJson<PendingAuthorizationsData>(
        relayUrl(
          "/delivery/occurrence-authorizations",
          readQuery({ businessId: businessId || undefined }),
        ),
        {
          signal,
          errorMessage: "Houve um erro ao carregar os pedidos de autorização.",
        },
      ),
    {
      refetchInterval: REFRESH_MS,
      refetchOnWindowFocus: true,
      keepPreviousData: true,
    },
  );

  const refetch = query.refetch;
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const onQueueChangedRef = useRef(onQueueChanged);
  onQueueChangedRef.current = onQueueChanged;

  // What waits, as a value: the first read sets it, every later difference
  // is a change somebody else's screen may be showing stale.
  const waitingSignature = query.data
    ? `${query.data.total}:${query.data.data.map((row) => row.id).join(",")}`
    : null;
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (waitingSignature === null) return;

    if (
      lastSignature.current !== null &&
      lastSignature.current !== waitingSignature
    ) {
      onQueueChangedRef.current?.();
    }

    lastSignature.current = waitingSignature;
  }, [waitingSignature]);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let bound: ReturnType<typeof getSocket> = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed) void refetchRef.current();
      }, SETTLE_MS);
    };

    initializeSocket()
      .then((socket) => {
        if (disposed) return;

        bound = socket;

        // A request, a decision, an escalation; and route events, which is
        // how a proof that superseded a request reaches the board.
        socket.on("occurrenceAuthorization", schedule);
        socket.on("routeEvent", schedule);
      })
      .catch(() => {
        // No realtime: the interval above still refreshes the queue.
      });

    const stopResync = onRealtimeResync(schedule);

    return () => {
      disposed = true;
      stopResync();

      if (timer) clearTimeout(timer);

      bound?.off("occurrenceAuthorization", schedule);
      bound?.off("routeEvent", schedule);
    };
  }, []);

  const [pendingDecision, setPendingDecision] = useState<{
    request: PendingAuthorization;
    decision: "APPROVED" | "DENIED";
  } | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const queue = query.data;

  if (!queue || queue.total === 0) return null;

  // "Ver conversa" (decision 14.5): the request's ticket, found by its
  // occurrence. It only looks; the report already opened the ticket.
  const openConversation = async (request: PendingAuthorization) => {
    const found = await relayAnswer(
      fetchTickets({
        businessId: businessId || undefined,
        status: "ALL",
        occurrenceId: request.id,
        pageSize: 1,
      }),
      "Houve um erro ao carregar os atendimentos.",
    );

    if (!found.success) {
      toast.error(found.message);
      return;
    }

    const step = queueConversationStep(found.data?.data[0]);

    if (step.kind === "none") {
      toast.info(step.message);
      return;
    }

    router.push(
      queueTicketHref(pathname, searchParams?.toString() ?? "", step.ticketId),
    );
  };

  const confirm = async (note: string) => {
    if (!pendingDecision) return;

    setIsSaving(true);

    try {
      const answer = await decideOccurrenceAuthorization(
        queue.businessId,
        pendingDecision.request.id,
        pendingDecision.decision,
        note.trim() === "" ? undefined : note,
      );

      if (isStaleActionResult(answer)) return;

      if (answer.success) {
        toast.success(answer.message);
      } else if (answer.code === "OCCURRENCE_ALREADY_DECIDED") {
        // Somebody got there first: say who, and drop the card.
        toast.info(settledDecisionMessage(answer.decision, answer.message));
      } else {
        toast.error(answer.message);
        return;
      }

      setPendingDecision(null);

      await Promise.all([
        queryClient.invalidateQueries([AUTHORIZATION_QUEUE_ROOT]),
        queryClient.invalidateQueries([
          "delivery-detail",
          pendingDecision.request.deliveryId,
        ]),
        queryClient.invalidateQueries(["control_tower"]),
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="occurrence-authorization-queue-title"
      className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/30"
      data-tutorial="occurrence-authorization-queue"
    >
      <div className="flex flex-wrap items-center gap-2">
        <ShieldQuestion
          className="h-4 w-4 text-amber-700 dark:text-amber-400"
          aria-hidden="true"
        />
        <h2
          id="occurrence-authorization-queue-title"
          className="text-sm font-semibold"
        >
          Aguardando autorização da torre
        </h2>
        <Badge
          variant="outline"
          className="border-amber-400 text-amber-900 dark:text-amber-200"
        >
          {queue.total}
        </Badge>
        {queue.total > queue.data.length && (
          <span className="text-xs text-muted-foreground">
            mostrando os {queue.data.length} mais antigos
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {queue.data.map((request) => {
          const tone = waitingTone(request, now);

          return (
            <li
              key={request.id}
              className="min-w-0 space-y-2 rounded-md border bg-background p-3"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 break-words text-sm font-medium [overflow-wrap:anywhere]">
                  {request.occurrenceType.name}
                </span>
                {isDeliveryRequest(request) && (
                  <Badge
                    variant="outline"
                    className="h-5 border-green-300 text-[11px] text-green-800 dark:text-green-300"
                  >
                    Entrega
                  </Badge>
                )}
                {request.occurrenceType.blocks_delivery && (
                  <Badge variant="destructive" className="h-5 text-[11px]">
                    Barra a entrega
                  </Badge>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-xs ${TONE_CLASS[tone]}`}
                >
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {waitingLabel(request.created_at, now)}
                </span>
                {tone === "escalated" && (
                  <Badge
                    variant="outline"
                    className="h-5 border-red-300 text-[11px] text-red-800 dark:text-red-300"
                  >
                    Escalado aos administradores
                  </Badge>
                )}
              </div>

              <p className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">
                <span className="font-medium">
                  {request.delivery.recipient_name}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  <MapPin className="inline h-3 w-3" aria-hidden="true" />{" "}
                  {addressLine(request.delivery)}
                </span>
              </p>

              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserRound className="h-3 w-3" aria-hidden="true" />
                {request.reportedBy.name}
                {request.delivery.code
                  ? ` · Pedido ${request.delivery.code}`
                  : ""}
              </p>

              {request.answers.length > 0 && (
                <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-1 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
                  {request.answers.map((answer) => (
                    <div key={answer.label} className="contents">
                      <dt className="text-muted-foreground">{answer.label}</dt>
                      <dd className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {answer.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {request.received_by && (
                <p className="min-w-0 break-words text-sm [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Quem recebeu: </span>
                  {request.received_by}
                </p>
              )}

              {(request.receipt_photo_url || request.signature_url) && (
                <div className="flex flex-wrap gap-2">
                  {request.receipt_photo_url && (
                    <ProofThumb
                      href={request.receipt_photo_url}
                      label="Canhoto"
                      alt={`${request.occurrenceType.name} — foto do canhoto`}
                    />
                  )}
                  {request.signature_url && (
                    <ProofThumb
                      href={request.signature_url}
                      label="Assinatura"
                      alt={`${request.occurrenceType.name} — assinatura`}
                      contain
                    />
                  )}
                </div>
              )}

              {request.description && (
                <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {request.description}
                </p>
              )}

              {request.photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {request.photos.map((photo, index) => (
                    <a
                      key={photo}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-14 w-14 overflow-hidden rounded-md border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`${request.occurrenceType.name} — foto ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

              <DecisionButtons
                onViewConversation={() => void openConversation(request)}
                denyLabel={decisionCopy(request, "DENIED").action}
                approveLabel={decisionCopy(request, "APPROVED").action}
                onDeny={() =>
                  setPendingDecision({ request, decision: "DENIED" })
                }
                onApprove={() =>
                  setPendingDecision({ request, decision: "APPROVED" })
                }
              />
            </li>
          );
        })}
      </ul>

      {query.isError && (
        <p
          role="alert"
          className="flex items-center gap-1 text-xs text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
          Não foi possível atualizar a fila agora; mostrando a última leitura.
        </p>
      )}

      {pendingDecision && (
        <DecisionDialog
          request={pendingDecision.request}
          decision={pendingDecision.decision}
          isSaving={isSaving}
          onConfirm={(note) => void confirm(note)}
          onClose={() => setPendingDecision(null)}
        />
      )}
    </section>
  );
};

/**
 * Autorizar / Negar, disabled with the reason for a profile that only reads
 * deliveries (decision 4.2). Its own component so the session is read only
 * when there is something to decide.
 */
const DecisionButtons = ({
  onViewConversation,
  denyLabel,
  approveLabel,
  onDeny,
  onApprove,
}: {
  /** A read: offered to everyone who sees the queue, never disabled. */
  onViewConversation: () => void;
  denyLabel: string;
  approveLabel: string;
  onDeny: () => void;
  onApprove: () => void;
}): JSX.Element => {
  const writePermission = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canDecide = writePermission.hasAllPermissions;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="w-full sm:w-auto"
        onClick={onViewConversation}
      >
        Ver conversa
      </Button>

      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!canDecide}
                onClick={onDeny}
              >
                {denyLabel}
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto"
                disabled={!canDecide}
                onClick={onApprove}
              >
                {approveLabel}
              </Button>
            </div>
          </TooltipTrigger>
          {!canDecide && (
            <TooltipContent className="max-w-sm">
              <p>{writePermission.tooltipMessage}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

/** The receipt or the signature of a delivery request, opened full size on click. */
const ProofThumb = ({
  href,
  label,
  alt,
  contain = false,
}: {
  href: string;
  label: string;
  alt: string;
  /** A signature is a drawing on white: shown whole, not cropped. */
  contain?: boolean;
}): JSX.Element => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className="h-16 w-20 overflow-hidden rounded-md border bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt={alt}
        className={`h-full w-full ${contain ? "object-contain" : "object-cover"}`}
      />
    </span>
    {label}
  </a>
);

/**
 * The queue where a table may be rendered on its own (a test, a preview):
 * without the app's QueryClient the queue has nothing to read with, so it
 * steps aside instead of taking the table down. useQueryClient only reads two
 * contexts before it throws, so the hook order is the same on every render.
 */
function useOptionalQueryClient(): ReturnType<typeof useQueryClient> | null {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

const OccurrenceAuthorizationQueueSlot = (
  props: OccurrenceAuthorizationQueueProps,
): JSX.Element | null => {
  const client = useOptionalQueryClient();

  return client ? <OccurrenceAuthorizationQueue {...props} /> : null;
};

export { OccurrenceAuthorizationQueue, OccurrenceAuthorizationQueueSlot };
