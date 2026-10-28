"use client";

import { useState } from "react";
import type { Row } from "@tanstack/react-table";

import {
  RowActionItem,
  RowActionSeparator,
  RowActions,
} from "@/components/shared/custom/row-actions";
import { copyWithFeedback } from "@/lib/copy-with-feedback";

import type { QuoteProps } from "../quote.types";
import { quoteStatusBlockedReason } from "../lib/row-actions";

import { ViewQuoteModal } from "../view-quote-modal";
import { UpdateQuoteStatusModal } from "../update-quote-status-modal";
import { DeleteQuoteModal } from "../delete-quote-modal";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
}

/**
 * The row menu (decision 3.5): 160px, text only, the destructive act in red,
 * and "Atualizar status" disabled WITH the reason on a finished quote. The
 * old menu was 180px with icons, said "Deletar" and greyed the status item
 * out with no explanation.
 */
export function DataTableQuoteRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const quote = row.original as QuoteProps;

  const [open, setOpen] = useState<"view" | "status" | "delete" | null>(null);

  const copy = (value: string, what: "ID" | "E-mail") => {
    void copyWithFeedback(value, what);
  };

  return (
    <>
      <RowActions entity={`o orçamento de ${quote.company}`}>
        <RowActionItem label="Ver detalhes" onSelect={() => setOpen("view")} />
        <RowActionItem
          label="Atualizar status"
          blockedReason={quoteStatusBlockedReason(quote.status)}
          onSelect={() => setOpen("status")}
        />

        <RowActionSeparator />

        <RowActionItem
          label="Copiar ID"
          onSelect={() => copy(quote.id, "ID")}
        />
        <RowActionItem
          label="Copiar e-mail"
          onSelect={() => copy(quote.email, "E-mail")}
        />

        <RowActionSeparator />

        <RowActionItem
          label="Excluir"
          destructive
          onSelect={() => setOpen("delete")}
        />
      </RowActions>

      {open === "view" && (
        <ViewQuoteModal quote={quote} isOpen onClose={() => setOpen(null)} />
      )}

      {open === "status" && (
        <UpdateQuoteStatusModal
          quote={quote}
          isOpen
          onClose={() => setOpen(null)}
        />
      )}

      {open === "delete" && (
        <DeleteQuoteModal quote={quote} isOpen onClose={() => setOpen(null)} />
      )}
    </>
  );
}
