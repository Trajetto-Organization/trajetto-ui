"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "react-query";

import { LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { newIdempotencyKey } from "@/lib/idempotency-key";
import { isStaleActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { useAuthStore } from "@/store/auth-store";

import { openTicket } from "@/actions/chat/tickets";

import { fetchTickets } from "../lib/chat-reads";
import { formatThreadTime } from "../lib/format";
import {
  TICKETS_QUERY_ROOT,
  closedLine,
  ticketKindLabel,
} from "../lib/ticket-rules";

interface LinkedTicketsProps {
  /** Only the MASTER passes it (the company selected in /admin). */
  actionBusinessId?: string;

  /** The delivery's or the route's driver: the ticket lives in his thread. */
  driver: { id: string; name: string };

  context: { kind: "delivery" | "route"; id: string };

  /** "Ver conversa": the chat tab on this ticket. */
  onOpenTicket: (ticketId: string) => void;
}

/**
 * "Atendimentos" in a delivery's (or a route's) detail (design §6.4): every
 * ticket about it — number, subject, status, who handles and who closed —
 * with "Ver conversa", and "Abrir atendimento" when none is open. Opening is
 * a get-or-create on the API: a second click never makes a second ticket.
 */
const LinkedTickets = ({
  actionBusinessId,
  driver,
  context,
  onOpenTicket,
}: LinkedTicketsProps): JSX.Element => {
  const queryClient = useQueryClient();

  const role = useAuthStore((state) => state.role);
  const write = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  // The vendor's seat reads and never opens (MASTER_CHAT_READ_ONLY).
  const canOpen = write.hasAllPermissions && role !== "MASTER";

  const [isOpening, setIsOpening] = useState<boolean>(false);
  const keyRef = useRef<string>(newIdempotencyKey());

  const query = useQuery(
    [
      TICKETS_QUERY_ROOT,
      "linked",
      actionBusinessId ?? "session",
      context.kind,
      context.id,
    ],
    // A relay GET (lib/chat-reads), beside the detail's own reads.
    async ({ signal }) => {
      const answer = await fetchTickets(
        {
          businessId: actionBusinessId,
          status: "ALL",
          ...(context.kind === "delivery"
            ? { deliveryId: context.id }
            : { routeId: context.id }),
          pageSize: 20,
        },
        { signal },
      );

      return answer.data;
    },
    { staleTime: 0, refetchOnWindowFocus: false },
  );

  const tickets = query.data ?? [];
  const hasOpen = tickets.some((ticket) => ticket.status === "OPEN");

  const open = async () => {
    setIsOpening(true);

    const result = await openTicket({
      businessId: actionBusinessId,
      driverId: driver.id,
      ...(context.kind === "delivery"
        ? { deliveryId: context.id }
        : { routeId: context.id }),
      idempotencyKey: keyRef.current,
    });

    setIsOpening(false);

    if (isStaleActionResult(result)) return;

    if (!result.success || !result.data) {
      toast.error(result.message);
      return;
    }

    keyRef.current = newIdempotencyKey();
    queryClient.invalidateQueries([TICKETS_QUERY_ROOT]);

    if (!result.data.created) {
      toast.info(
        `Já havia um atendimento aberto (#${result.data.data.number}).`,
      );
    }

    onOpenTicket(result.data.data.id);
  };

  return (
    <section className="min-w-0 space-y-2" aria-label="Atendimentos">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <LifeBuoy className="h-4 w-4" />
          Atendimentos
        </h3>

        {!hasOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs"
            disabled={!canOpen || isOpening || query.isLoading}
            title={
              canOpen
                ? undefined
                : "Seu perfil permite apenas a leitura dos atendimentos."
            }
            onClick={open}
          >
            Abrir atendimento
          </Button>
        )}
      </div>

      {query.isLoading && <Skeleton className="h-8 w-full" />}

      {query.isError && (
        <p className="text-xs text-destructive">
          {(query.error as Error).message}
        </p>
      )}

      {query.isSuccess && tickets.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum atendimento sobre{" "}
          {context.kind === "delivery" ? "esta entrega" : "esta rota"}.
        </p>
      )}

      {tickets.length > 0 && (
        <ul className="min-w-0 space-y-1">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="flex min-w-0 items-start gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  #{ticket.number} · {ticket.subject}
                </p>
                <p className="truncate text-muted-foreground">
                  {ticketKindLabel(ticket.kind)} ·{" "}
                  {ticket.status === "OPEN"
                    ? `Aberto${ticket.assignee ? ` · com ${ticket.assignee.name}` : " · sem atendente"}`
                    : closedLine(ticket, formatThreadTime)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-xs"
                onClick={() => onOpenTicket(ticket.id)}
              >
                Ver conversa
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export { LinkedTickets };
