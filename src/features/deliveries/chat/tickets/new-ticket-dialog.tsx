"use client";

import { useRef, useState } from "react";
import { useQuery } from "react-query";

import { Loader, Package, Route } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogScrollContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FormInput from "@/components/shared/custom/form-input";
import { FieldShell } from "@/components/shared/custom/field-shell";
import { TextareaField } from "@/components/shared/custom/textarea-field";

import {
  CursorCombobox,
  type CursorList,
} from "@/features/account-payable/form-dialog/cursor-combobox";

import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import { isStaleActionResult } from "@/lib/action-result";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";

import { openTicket } from "@/actions/chat/tickets";
import {
  listTicketContexts,
  type TicketContextKind,
  type TicketContextOption,
} from "@/actions/chat/tickets/list-ticket-contexts";
import type { TicketSummary } from "@/actions/chat/chat.types";

import {
  NEW_TICKET_ABOUT_OPTIONS,
  newTicketProblems,
  newTicketTarget,
  type NewTicketAbout,
} from "../lib/ticket-form";

interface NewTicketDialogProps {
  driver: { id: string; name: string };
  actionBusinessId?: string;
  onOpened: (ticket: TicketSummary) => void;
  onClose: () => void;
}

/**
 * The chosen driver's open deliveries or routes, in the shape CursorCombobox
 * reads. One server-searched page (list-ticket-contexts): no infinite scroll.
 */
function useTicketContexts(input: {
  businessId?: string;
  driverId: string;
  kind: TicketContextKind;
  search: string;
  enabled: boolean;
}): CursorList<TicketContextOption> {
  const term = useDebouncedValue(input.search.trim(), 300);

  const query = useQuery(
    [
      "ticket-contexts",
      input.businessId ?? "",
      input.driverId,
      input.kind,
      term,
    ],
    async () => {
      const result = await listTicketContexts({
        businessId: input.businessId,
        driverId: input.driverId,
        kind: input.kind,
        search: term,
      });

      if (!result.success || !result.data) throw new Error(result.message);

      return result.data;
    },
    {
      enabled: input.enabled,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  return {
    items: query.data ?? [],
    lastElementRef: () => {},
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    hasError: query.isError,
    errorMessage: query.error instanceof Error ? query.error.message : null,
    refetch: () => void query.refetch(),
    isSearchSettled: term === input.search.trim() && !query.isFetching,
  };
}

/**
 * "+ Novo atendimento" (design §6.1): started by the tower with one driver,
 * about a subject of its own, one of his deliveries or one of his routes.
 * The Idempotency-Key is the form's (IDEMP-14): a second click after a lost
 * answer gets the same ticket, not a second one. About a delivery or route
 * that already has an open ticket, the API answers that one.
 */
const NewTicketDialog = ({
  driver,
  actionBusinessId,
  onOpened,
  onClose,
}: NewTicketDialogProps): JSX.Element => {
  const [about, setAbout] = useState<NewTicketAbout>("GENERAL");
  const [subject, setSubject] = useState<string>("");
  const [deliveryId, setDeliveryId] = useState<string>("");
  const [routeId, setRouteId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const keyRef = useRef<string>(newIdempotencyKey());

  const form = { subject, message, about, deliveryId, routeId };

  // Live validation (decision 16.700): each field by the API's rules once
  // it is left, then on every change — leaving Assunto no longer paints the
  // fields the person has not reached.
  const live = useLiveValidation({
    values: form,
    rules: (values) => ({ ...newTicketProblems(values) }),
    fields:
      about === "GENERAL" ? ["subject", "message"] : ["context", "message"],
    controlIds: {
      subject: "new-ticket-subject",
      message: "new-ticket-message",
    },
    // Not a <form>: Abrir atendimento calls validate() itself.
    validateOnSubmit: false,
  });

  const contextKind: TicketContextKind =
    about === "ROUTE" ? "ROUTE" : "DELIVERY";
  const contexts = useTicketContexts({
    businessId: actionBusinessId,
    driverId: driver.id,
    kind: contextKind,
    search,
    enabled: about !== "GENERAL",
  });

  const changeAbout = (value: string) => {
    const next = NEW_TICKET_ABOUT_OPTIONS.find(
      (option) => option.value === value,
    )?.value;

    if (!next) return;

    setAbout(next);
    setSearch("");
    // Another target is another request: a fresh key, so a replay of the
    // previous choice cannot answer it.
    keyRef.current = newIdempotencyKey();
  };

  const submit = async () => {
    if (!live.validate()) return;

    setIsSaving(true);

    const result = await openTicket({
      businessId: actionBusinessId,
      driverId: driver.id,
      ...newTicketTarget(form),
      ...(message.trim() && {
        message: {
          kind: "TEXT" as const,
          body: message.trim(),
          clientSubmissionId: keyRef.current,
        },
      }),
      idempotencyKey: keyRef.current,
    });

    setIsSaving(false);

    if (isStaleActionResult(result)) return;

    if (!result.success || !result.data) {
      toast.error(result.message);
      return;
    }

    const opened = result.data.data;

    toast.success(
      result.data.created
        ? `Atendimento #${opened.number} aberto com ${driver.name}.`
        : `Já havia um atendimento aberto sobre isto: #${opened.number}.`,
    );
    onOpened(opened);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogScrollContent
        className="max-w-lg"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Novo atendimento</DialogTitle>
          <DialogDescription>Com {driver.name}</DialogDescription>
        </DialogHeader>

        <div ref={live.ref} className="space-y-3">
          <FieldShell
            label="Sobre *"
            htmlFor="new-ticket-about"
            labelTargetsControl={false}
          >
            {(control) => (
              <RadioGroup
                {...control}
                aria-label="Sobre o que é o atendimento"
                className="flex flex-wrap gap-4"
                value={about}
                onValueChange={changeAbout}
                disabled={isSaving}
              >
                {NEW_TICKET_ABOUT_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={option.value}
                      id={`new-ticket-about-${option.value}`}
                    />
                    <Label
                      htmlFor={`new-ticket-about-${option.value}`}
                      className="font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </FieldShell>

          {about === "GENERAL" && (
            <FormInput
              label="Assunto *"
              htmlfor="new-ticket-subject"
              value={subject}
              maxLength={160}
              placeholder="Ex.: Documentos do veículo"
              onChange={(event) => setSubject(event.target.value)}
              errorName={live.errorOf("subject")}
              disabled={isSaving}
            />
          )}

          {about === "DELIVERY" && (
            // The wrapper names the field for live validation.
            <div data-live-field="context">
              <CursorCombobox<TicketContextOption>
                label="Entrega *"
                htmlFor="new-ticket-delivery"
                value={deliveryId}
                onChange={(id) => {
                  setDeliveryId(id);
                  live.touch("context");
                }}
                search={search}
                onSearchChange={setSearch}
                list={contexts}
                itemLabel={(item) => item.label}
                itemDescription={(item) => item.description}
                placeholder="Escolha a entrega"
                searchPlaceholder="Buscar por destinatário, pedido ou NF-e..."
                emptyText={`Nenhuma entrega em aberto com ${driver.name}.`}
                icon={Package}
                hint="O assunto do atendimento será o nome do destinatário."
                errorName={live.errorOf("context")}
                disabled={isSaving}
              />
            </div>
          )}

          {about === "ROUTE" && (
            <div data-live-field="context">
              <CursorCombobox<TicketContextOption>
                label="Rota *"
                htmlFor="new-ticket-route"
                value={routeId}
                onChange={(id) => {
                  setRouteId(id);
                  live.touch("context");
                }}
                search={search}
                onSearchChange={setSearch}
                list={contexts}
                itemLabel={(item) => item.label}
                itemDescription={(item) => item.description}
                placeholder="Escolha a rota"
                searchPlaceholder="Buscar por código, nome ou destino..."
                emptyText={`Nenhuma rota em aberto com ${driver.name}.`}
                icon={Route}
                hint="O assunto do atendimento será o código e o nome da rota."
                errorName={live.errorOf("context")}
                disabled={isSaving}
              />
            </div>
          )}

          <TextareaField
            label="Primeira mensagem (opcional)"
            htmlfor="new-ticket-message"
            value={message}
            maxLength={2000}
            rows={3}
            onChange={(event) => setMessage(event.target.value)}
            errorName={live.errorOf("message")}
            disabled={isSaving}
          />
        </div>

        <DialogFormFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={isSaving}>
            <span>Abrir atendimento</span>
            {isSaving && (
              <Loader
                className="ml-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
          </Button>
        </DialogFormFooter>
      </DialogScrollContent>
    </Dialog>
  );
};

export { NewTicketDialog };
