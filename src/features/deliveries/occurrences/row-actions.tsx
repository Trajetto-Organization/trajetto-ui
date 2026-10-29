"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "sonner";

import {
  RowActionItem,
  RowActions,
} from "@/components/shared/custom/row-actions";
import { ConfirmDialog } from "@/components/shared/custom/confirm-dialog";

import { copyWithFeedback } from "@/lib/copy-with-feedback";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { isStaleActionResult } from "@/lib/action-result";
import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";
import { useAuthStore } from "@/store/auth-store";

import { openTicket } from "@/actions/chat/tickets";
import { relayAnswer } from "@/lib/relay-read";

import { useDeliveriesBusinessId } from "../hooks/use-deliveries-business-id";
import { DeliveryDetailDialog } from "../deliveries/detail-dialog/lazy";
import { OccurrenceHistoryDialog } from "../chat/tickets/occurrence-history-dialog";
import { buildTicketSearchParams, ticketsHref } from "../chat/lib/chat-link";
import { fetchTickets } from "../chat/lib/chat-reads";
import {
  occurrenceConversationStep,
  openTicketBlockedReason,
} from "../chat/lib/ticket-rules";

import type { OccurrenceRow } from "../lib/panels";

interface OccurrenceRowActionsProps {
  row: Row<OccurrenceRow>;
}

/**
 * An occurrence is an immutable field record — there is nothing to edit or
 * delete here. What the manager wants from a row is the delivery behind it,
 * its history and its conversation (decision 14.5, design §6.3), and the ids
 * to search with. The shared row menu (decision 3.5): 160px, text only.
 */
const OccurrenceRowActions = ({
  row,
}: OccurrenceRowActionsProps): JSX.Element => {
  const businessId = useDeliveriesBusinessId();
  const occurrence = row.original;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const role = useAuthStore((state) => state.role);
  const write = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  // Only the MASTER names the company to the chat actions.
  const chatBusinessId =
    role === "MASTER" ? (businessId ?? undefined) : undefined;
  const openBlockedReason = openTicketBlockedReason(
    role,
    write.hasAllPermissions,
  );

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);
  const [isOpening, setIsOpening] = useState<boolean>(false);

  const copyId = (value: string, label: string) => {
    void copyWithFeedback(value, label);
  };

  const goToTicket = (ticketId: string) => {
    const params = buildTicketSearchParams(
      searchParams?.toString() ?? "",
      ticketId,
    );

    router.push(ticketsHref(pathname, params));
  };

  // A viewing action: it goes to the ticket or explains, never creates one.
  const openConversation = async () => {
    // A relay GET (lib/chat-reads): it no longer waits behind whatever
    // Server Action the page has in flight.
    const found = await relayAnswer(
      fetchTickets({
        businessId: chatBusinessId,
        status: "ALL",
        occurrenceId: occurrence.id,
        pageSize: 1,
      }),
      "Houve um erro ao carregar os atendimentos.",
    );

    if (!found.success) {
      toast.error(found.message);
      return;
    }

    const step = occurrenceConversationStep(
      found.data?.data[0],
      openBlockedReason === null,
    );

    if (step.kind === "open") {
      goToTicket(step.ticketId);
      return;
    }

    toast.info(step.message);
  };

  // "Abrir atendimento", confirmed: a ticket for this occurrence in its
  // driver's conversation (the API finds him from the delivery). Get-or-create:
  // an occurrence that already had one answers that one.
  const confirmOpenTicket = async () => {
    setIsOpening(true);

    try {
      const opened = await openTicket({
        businessId: chatBusinessId,
        deliveryId: occurrence.delivery.id,
        occurrenceId: occurrence.id,
        idempotencyKey: newIdempotencyKey(),
      });

      if (isStaleActionResult(opened)) return;

      if (!opened.success || !opened.data) {
        toast.error(opened.message);
        return;
      }

      toast.success(
        opened.data.created
          ? `Atendimento #${opened.data.data.number} aberto.`
          : `Esta ocorrência já tinha o atendimento #${opened.data.data.number}.`,
      );

      setIsConfirmOpen(false);
      goToTicket(opened.data.data.id);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <>
      <RowActions
        entity={`a ocorrência ${occurrence.occurrenceType.name} de ${occurrence.delivery.recipient_name}`}
      >
        <RowActionItem
          label="Ver Entrega"
          onSelect={() => setIsDetailOpen(true)}
        />
        <RowActionItem
          label="Ver histórico da ocorrência"
          onSelect={() => setIsHistoryOpen(true)}
        />
        <RowActionItem
          label="Ver conversa"
          onSelect={() => void openConversation()}
        />
        <RowActionItem
          label="Abrir atendimento"
          blockedReason={openBlockedReason}
          onSelect={() => setIsConfirmOpen(true)}
        />
        <RowActionItem
          label="Copiar ID"
          onSelect={() => copyId(occurrence.id, "ID da ocorrência")}
        />
        {/* Pasting it in the search returns every occurrence of that delivery. */}
        <RowActionItem
          label="Copiar ID da Entrega"
          onSelect={() => copyId(occurrence.delivery.id, "ID da entrega")}
        />
      </RowActions>

      {isDetailOpen && businessId && (
        <DeliveryDetailDialog
          businessId={businessId}
          deliveryId={occurrence.delivery.id}
          onClose={() => setIsDetailOpen(false)}
        />
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!isOpening) setIsConfirmOpen(open);
        }}
        title="Abrir atendimento"
        description={
          <>
            Abrir um atendimento para a ocorrência{" "}
            {occurrence.occurrenceType.name} de{" "}
            {occurrence.delivery.recipient_name}? O motorista verá o novo
            assunto na conversa, e o atendimento aparecerá na lista de
            atendimentos.
          </>
        }
        confirmLabel="Abrir atendimento"
        isPending={isOpening}
        onConfirm={confirmOpenTicket}
      />

      {isHistoryOpen && (
        <OccurrenceHistoryDialog
          occurrence={occurrence}
          actionBusinessId={chatBusinessId}
          onOpenConversation={(ticketId) => {
            setIsHistoryOpen(false);
            goToTicket(ticketId);
          }}
          onClose={() => setIsHistoryOpen(false)}
        />
      )}
    </>
  );
};

export { OccurrenceRowActions };
