"use client";

import { AlertTriangle, Loader } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import { cn } from "@/lib/utils";
import { useStatusReasons } from "./hooks";

interface StatusReasonSelectorProps {
  businessId: string;

  reasonId: string;
  onReasonChange: (reasonId: string) => void;

  note: string;
  onNoteChange: (note: string) => void;

  disabled?: boolean;

  /** Shown under the field when the caller already knows it is missing. */
  error?: string;
}

const NOTE_LIMIT = 500;

/**
 * Why this delivery is being moved by hand.
 *
 * A plain select rather than a searchable combobox: the catalogue is a handful
 * of words a dispatcher maintains, and a search box over six options is
 * ceremony. The two fields are one component because they are one thought —
 * the reason groups and counts, the note carries the detail the catalogue
 * cannot ("cliente ligou às 14h"), and offering either without the other is
 * how a trail ends up either unsearchable or unreadable.
 *
 * An empty catalogue is handled as a plain sentence rather than a disabled
 * control with no explanation: the operator can do nothing about a spinner,
 * and can do something about "cadastre o primeiro motivo".
 */
const StatusReasonSelector = ({
  businessId,
  reasonId,
  onReasonChange,
  note,
  onNoteChange,
  disabled,
  error,
}: StatusReasonSelectorProps): JSX.Element => {
  const { reasons, isLoading, hasError, errorMessage, refetch } =
    useStatusReasons(businessId);

  const selected = reasons.find((reason) => reason.id === reasonId);

  if (isLoading) {
    return (
      <div className="grid gap-2">
        <Label className="h-4">Motivo da mudança</Label>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-lg border
        border-destructive/40 p-3 text-sm text-destructive"
      >
        <span className="truncate">
          {errorMessage ?? "Erro ao carregar os motivos."}
        </span>

        <Button type="button" variant="outline" size="sm" onClick={refetch}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (reasons.length === 0) {
    return (
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 p-3
        dark:border-amber-900 dark:bg-amber-950/30"
      >
        <p
          className="flex items-start gap-2 text-sm
          text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Nenhum motivo cadastrado.</strong> Mudar um status pelo
            painel exige dizer por quê — cadastre o primeiro motivo em
            Entregas → Motivos de status e volte aqui.
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label
          htmlFor="status-reason"
          className={cn("h-4 truncate", error && "text-red-500")}
        >
          {error ?? (
            <>
              Motivo da mudança
              <span className="ml-0.5 text-red-500">*</span>
            </>
          )}
        </Label>

        <Select
          value={reasonId}
          onValueChange={onReasonChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="status-reason"
            className={cn(error && "border-red-500")}
          >
            <SelectValue placeholder="Selecione o motivo" />
          </SelectTrigger>

          <SelectContent>
            {reasons.map((reason) => (
              <SelectItem key={reason.id} value={reason.id}>
                {reason.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected?.description && (
          <p className="text-xs text-muted-foreground">
            {selected.description}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status-note" className="h-4 truncate">
          Anotação{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>

        <Textarea
          id="status-note"
          value={note}
          onChange={(event) =>
            onNoteChange(event.target.value.slice(0, NOTE_LIMIT))
          }
          disabled={disabled}
          rows={2}
          placeholder="O detalhe que o motivo não carrega. Ex.: cliente ligou às 14h."
          className="resize-none"
        />

        <p className="text-right text-xs text-muted-foreground">
          {note.length}/{NOTE_LIMIT}
        </p>
      </div>
    </div>
  );
};

export { StatusReasonSelector, NOTE_LIMIT };
