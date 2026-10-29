"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import {
  ArrowLeft,
  History,
  Lock,
  MessagesSquare,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { isStaleActionResult } from "@/lib/action-result";

import {
  assignTicket,
  closeTicket,
  reopenTicket,
} from "@/actions/chat/tickets";
import type {
  TicketCloseOutcome,
  TicketDetail,
  TicketSummary,
} from "@/actions/chat/chat.types";

import {
  fetchTicket,
  fetchTicketAssignees,
  fetchTicketEvents,
} from "../lib/chat-reads";

import { formatThreadTime } from "../lib/format";
import {
  TICKETS_QUERY_ROOT,
  assigneeLine,
  closedLine,
  ticketEventLine,
  ticketFailureMessage,
  ticketKindLabel,
} from "../lib/ticket-rules";
import { CloseTicketDialog } from "./close-ticket-dialog";

interface TicketHeaderProps {
  ticket: TicketSummary;
  actionBusinessId?: string;
  myUserId: string | null;
  /** Support (MASTER) reads; it never assigns, closes or reopens. */
  isReadOnly: boolean;
  onBack: () => void;
  onShowWholeConversation: () => void;
  onChanged: (ticket: TicketSummary) => void;
}

const OUTCOME_BUTTONS: Record<
  TicketCloseOutcome,
  { label: string; variant: "default" | "destructive" | "outline" }
> = {
  APPROVED: { label: "Autorizar", variant: "default" },
  DENIED: { label: "Negar", variant: "destructive" },
  RESOLVED: { label: "Encerrar", variant: "outline" },
};

/**
 * The open ticket's header (design §6.1): "#128 · assunto", its status, who
 * handles it (Assumir / Transferir / Liberar), Encerrar — or Autorizar and
 * Negar while the occurrence waits for the tower —, Reabrir when closed, the
 * trail of events and the way to the driver's whole conversation.
 */
const TicketHeader = ({
  ticket,
  actionBusinessId,
  myUserId,
  isReadOnly,
  onBack,
  onShowWholeConversation,
  onChanged,
}: TicketHeaderProps): JSX.Element => {
  const queryClient = useQueryClient();

  const [closing, setClosing] = useState<TicketCloseOutcome | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showEvents, setShowEvents] = useState<boolean>(false);

  // Relay GETs (lib/chat-reads): the detail and who can take it leave
  // together, beside the list's own read, instead of queueing as actions.
  const detailQuery = useQuery(
    [TICKETS_QUERY_ROOT, "detail", ticket.id, ticket.version],
    ({ signal }): Promise<TicketDetail> =>
      fetchTicket(
        { ticketId: ticket.id, businessId: actionBusinessId },
        { signal },
      ),
    { staleTime: 0 },
  );

  const eventsQuery = useQuery(
    [TICKETS_QUERY_ROOT, "events", ticket.id, ticket.version],
    async ({ signal }) => {
      const answer = await fetchTicketEvents(
        { ticketId: ticket.id, businessId: actionBusinessId },
        { signal },
      );

      return answer.data;
    },
    { enabled: showEvents },
  );

  const assigneesQuery = useQuery(
    [TICKETS_QUERY_ROOT, "assignees", actionBusinessId ?? "session"],
    async ({ signal }) => {
      const answer = await fetchTicketAssignees(
        { businessId: actionBusinessId },
        { signal },
      );

      return answer.data;
    },
    { enabled: !isReadOnly, staleTime: 60_000 },
  );

  const permissions = detailQuery.data?.permissions;
  const canAssign = !isReadOnly && Boolean(permissions?.canAssign);
  const closeOutcomes = isReadOnly ? [] : (permissions?.closeOutcomes ?? []);

  const afterChange = (next: TicketSummary | undefined) => {
    queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);
    if (next) onChanged(next);
  };

  const assign = async (assigneeId: string | null) => {
    setIsSaving(true);

    const result = await assignTicket({
      ticketId: ticket.id,
      assigneeId,
      expectedAssigneeId: ticket.assignee?.id ?? null,
      businessId: actionBusinessId,
    });

    setIsSaving(false);

    if (!result.success || !result.data) {
      toast.error(ticketFailureMessage(result.failure, result.message));
      queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);
      return;
    }

    toast.success(result.message);
    afterChange(result.data.data);
  };

  const confirmClose = async (note: string) => {
    if (!closing) return;

    setIsSaving(true);

    const result = await closeTicket({
      ticketId: ticket.id,
      outcome: closing,
      note,
      businessId: actionBusinessId,
    });

    setIsSaving(false);
    setClosing(null);

    if (!result.success || !result.data) {
      toast.error(ticketFailureMessage(result.failure, result.message));
      queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);
      return;
    }

    toast.success(result.message);
    // The tower's queue reads the same decision.
    queryClient.invalidateQueries(["occurrence-authorizations"]);
    afterChange(result.data.data);
  };

  const reopen = async () => {
    setIsSaving(true);

    const result = await reopenTicket({
      ticketId: ticket.id,
      businessId: actionBusinessId,
    });

    setIsSaving(false);

    if (!result.success || !result.data) {
      toast.error(ticketFailureMessage(result.failure, result.message));
      return;
    }

    toast.success(result.message);
    afterChange(result.data.data);
  };

  const detail = detailQuery.data?.occurrenceDetail ?? null;

  return (
    <div className="border-b">
      <div className="flex min-w-0 items-start gap-2 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 lg:hidden"
          aria-label="Voltar para a lista"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            <span className="text-muted-foreground">#{ticket.number}</span> ·{" "}
            {ticket.subject}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant={ticket.status === "OPEN" ? "default" : "secondary"}>
              {ticket.status === "OPEN" ? "Aberto" : "Encerrado"}
            </Badge>
            <span>{ticketKindLabel(ticket.kind)}</span>
            <span>·</span>
            <span>{ticket.driver.name}</span>
            <span>·</span>
            <span>{assigneeLine(ticket, myUserId)}</span>
          </div>
        </div>
      </div>

      {detail && (
        <div className="mx-4 mb-3 rounded-md border bg-muted/40 p-3 text-xs">
          <p className="font-medium">
            {detail.typeName} · relatado por {detail.reportedBy.name} em{" "}
            {formatThreadTime(detail.occurred_at ?? detail.created_at)}
          </p>
          {detail.description && (
            <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">
              {detail.description}
            </p>
          )}
          {detail.answers.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {detail.answers.map((answer) => (
                <li key={answer.label}>
                  <span className="text-muted-foreground">{answer.label}:</span>{" "}
                  {answer.value}
                </li>
              ))}
            </ul>
          )}
          {detail.photos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.photos.map((url, index) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Foto {index + 1}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {ticket.status === "CLOSED" && (
        <div
          className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs"
          role="status"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1">
            {closedLine(ticket, formatThreadTime)}
            {ticket.close_note ? `: ${ticket.close_note}` : ""}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        {closeOutcomes.map((outcome) => (
          <Button
            key={outcome}
            type="button"
            size="sm"
            variant={OUTCOME_BUTTONS[outcome].variant}
            disabled={isSaving}
            onClick={() => setClosing(outcome)}
          >
            {OUTCOME_BUTTONS[outcome].label}
          </Button>
        ))}

        {canAssign && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSaving}
              >
                <UserRound className="mr-1 h-3.5 w-3.5" />
                Atendente
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {ticket.assignee?.id !== myUserId && myUserId && (
                <DropdownMenuItem onSelect={() => assign(myUserId)}>
                  Assumir
                </DropdownMenuItem>
              )}
              {ticket.assignee && (
                <DropdownMenuItem onSelect={() => assign(null)}>
                  Liberar
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Transferir para</DropdownMenuLabel>
              {(assigneesQuery.data ?? [])
                .filter(
                  (person) =>
                    person.id !== ticket.assignee?.id && person.id !== myUserId,
                )
                .map((person) => (
                  <DropdownMenuItem
                    key={person.id}
                    className="truncate"
                    onSelect={() => assign(person.id)}
                  >
                    {person.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {!isReadOnly &&
          ticket.status === "CLOSED" &&
          permissions?.canReopen && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSaving}
              onClick={reopen}
            >
              Reabrir
            </Button>
          )}

        {/* The trail is read by support too; it only never writes. */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-expanded={showEvents}
          onClick={() => setShowEvents((current) => !current)}
        >
          <History className="mr-1 h-3.5 w-3.5" />
          Histórico
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onShowWholeConversation}
        >
          <MessagesSquare className="mr-1 h-3.5 w-3.5" />
          Conversa completa do motorista
        </Button>
      </div>

      {showEvents && (
        <ol
          className="mx-4 mb-3 space-y-1 border-l pl-3 text-xs"
          aria-label="Histórico do atendimento"
        >
          {eventsQuery.isLoading && (
            <li className="text-muted-foreground">Carregando…</li>
          )}
          {(eventsQuery.data ?? []).map((event) => (
            <li key={event.id}>
              <span className="text-muted-foreground">
                {formatThreadTime(event.created_at)} ·{" "}
              </span>
              {ticketEventLine(event)}
            </li>
          ))}
        </ol>
      )}

      {closing && (
        <CloseTicketDialog
          ticket={ticket}
          outcome={closing}
          blocksDelivery={detail?.blocks_delivery ?? false}
          isSaving={isSaving}
          onConfirm={confirmClose}
          onClose={() => setClosing(null)}
        />
      )}
    </div>
  );
};

export { TicketHeader };
