"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "react-query";

import { toast } from "sonner";
import { Loader, MessageCircle, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogScrollContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/shared/custom/field-shell";

import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { DeliveryStatus } from "@/actions/delivery/get-delivery";

import { updateDeliveryStatus } from "@/actions/delivery/update-delivery-status";

import { StatusReasonSelector } from "@/app/(protected)/_components/shared/selectors/status-reason-selector";

import { DeliveryTimeline } from "../timeline";
import { ProofDocumentSection } from "../proof-document";
import { reportDeliveryOccurrence } from "@/actions/delivery/report-delivery-occurrence";

import {
  displayValue,
  formatDateOnly,
  formatNotificationDate,
} from "@/lib/format-values";
import { newIdempotencyKey } from "@/lib/idempotency-key";
import {
  panelReportAuthorizationNotice,
  panelReportForm,
  queriesStaleAfterReport,
} from "./occurrence-report-rules";
import { isStaleActionResult } from "@/lib/action-result";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import {
  DELIVERY_STATUS_META,
  DELIVERY_TRANSITIONS,
  inTransitBlocker,
} from "../../lib/status";
import { receivedByError } from "../../lib/received-by";
import { OccurrenceTypeSelector } from "../occurrence-type-selector";
import { useDeliveryDetail } from "@/hooks/use-delivery-detail";
import { useAuthStore } from "@/store/auth-store";

import {
  buildChatSearchParams,
  buildTicketSearchParams,
  ticketsHref,
} from "../../chat/lib/chat-link";
import { ChatLinkedMessages } from "../../chat/linked-messages";
import { LinkedTickets } from "../../chat/tickets/linked-tickets";
import { ImageInspector } from "../../proof-audits/image-inspector";
import { useOccurrenceTypes } from "@/hooks/use-occurrence-types";

import { OccurrenceAnswerFields } from "../../occurrence-types/form-builder/answer-fields";
import { answersFromInputs } from "../../occurrence-types/form-builder/builder-rules";
import {
  readFormFields,
  validateOccurrenceAnswers,
} from "../../occurrence-types/form-builder/rules";
import { occurrenceLineDetails } from "../timeline/occurrence-details";

interface DeliveryDetailDialogProps {
  businessId: string;
  deliveryId: string;
  onClose: () => void;
}

const DeliveryDetailDialog = ({
  businessId,
  deliveryId,
  onClose,
}: DeliveryDetailDialogProps): JSX.Element => {
  const queryClient = useQueryClient();

  const router = useRouter();
  const pathname = usePathname();
  const routeSearchParams = useSearchParams();

  // Only the MASTER names the company to the chat actions (the one picked on
  // /admin); everyone else is answered from the session.
  const role = useAuthStore((state) => state.role);
  const chatBusinessId = role === "MASTER" ? businessId : undefined;

  // Both write affordances stay on screen and explain themselves on hover,
  // the way every other module does it. Read from the session here so a
  // permission granted over the socket enables them without reopening.
  const deliveryPermission = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const occurrencePermission = useCheckMultiplePermissions([
    {
      key: permissions.OCCURRENCE_MANAGE,
      action: "write",
      label: getPermissionName(permissions.OCCURRENCE_MANAGE),
    },
  ]);

  const canWriteDelivery = deliveryPermission.hasAllPermissions;
  const canWriteOccurrence = occurrencePermission.hasAllPermissions;

  const [nextStatus, setNextStatus] = useState<DeliveryStatus | "">("");
  const [receivedBy, setReceivedBy] = useState<string>("");

  // Shown under the field once the operator tried to apply (decision 3.4).
  const [receivedByTouched, setReceivedByTouched] = useState<boolean>(false);

  // Moving a status by hand carries no evidence of its own, so the reason is
  // it. Required by the API and required here, rather than letting the request
  // go and showing the refusal as a toast.
  const [reasonId, setReasonId] = useState<string>("");
  const [statusNote, setStatusNote] = useState<string>("");

  // Lightbox for the driver's photos — the fuel/checklist pattern: a
  // nested dialog instead of a new tab, so the manager never leaves the
  // detail.
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);

  const [occurrenceTypeId, setOccurrenceTypeId] = useState<string>("");
  const [occurrenceDescription, setOccurrenceDescription] =
    useState<string>("");

  // The type's form, answered from the panel (decision 6.2): strings per
  // field key, typed and checked with the API's own rules on "Registrar".
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});
  const [answerErrors, setAnswerErrors] = useState<Record<string, string>>({});

  // A new type is a new form: nothing typed for the previous one carries over.
  useEffect(() => {
    setAnswerInputs({});
    setAnswerErrors({});
  }, [occurrenceTypeId]);

  // One submission id per occurrence as written (IDEMP-14), the key the
  // driver's app already sends: "Registrar" again after a lost answer is the
  // same occurrence, not a second one with a second alert. A new type,
  // description or answer is a new occurrence.
  const [occurrenceKey, setOccurrenceKey] = useState<string>(() =>
    newIdempotencyKey(),
  );

  const answersSignature = JSON.stringify(answerInputs);

  useEffect(() => {
    setOccurrenceKey(newIdempotencyKey());
  }, [occurrenceTypeId, occurrenceDescription, answersSignature]);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { data: response, isLoading } = useDeliveryDetail(
    businessId,
    deliveryId,
  );

  const { occurrenceTypes, isLoading: isLoadingTypes } =
    useOccurrenceTypes(businessId);

  const delivery = response?.data;

  const selectedType = occurrenceTypes.find(
    (type) => type.id === occurrenceTypeId,
  );
  const selectedFields = readFormFields(selectedType?.form_fields ?? null);

  const allowedTransitions = delivery
    ? DELIVERY_TRANSITIONS[delivery.status]
    : [];

  const refreshDetail = async () => {
    void queryClient.invalidateQueries(["delivery-detail", deliveryId]);

    // The list behind the dialog is server-rendered: the status action
    // revalidates and its own response carries the re-rendered list.
  };

  // Decision 5.3: marking as delivered from the panel has no photo or
  // signature behind it, so who received it is required — with the API's
  // text rules and messages, checked before the request.
  const receivedByIssue =
    nextStatus === "DELIVERED" ? receivedByError(receivedBy) : null;

  const handleStatusChange = async () => {
    if (!delivery || !nextStatus || !reasonId) return;

    if (receivedByIssue) {
      setReceivedByTouched(true);
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateDeliveryStatus(
        businessId,
        delivery.id,
        nextStatus,
        {
          reasonId,
          note: statusNote || undefined,
          receivedBy: nextStatus === "DELIVERED" ? receivedBy : undefined,
        },
      );

      if (isStaleActionResult(result)) return;

      if (result.success) {
        toast.success(result.message);

        setNextStatus("");
        setReceivedBy("");
        setReceivedByTouched(false);

        setReasonId("");
        setStatusNote("");

        await refreshDetail();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReportOccurrence = async () => {
    if (!delivery || !occurrenceTypeId) return;

    // The same check the API makes, before the request: the field says what
    // is missing instead of a toast after the round trip.
    const answers = answersFromInputs(selectedFields, answerInputs);
    const verdict = validateOccurrenceAnswers(selectedFields, answers);

    if (Object.keys(verdict.errors).length > 0) {
      setAnswerErrors(verdict.errors);
      return;
    }

    setAnswerErrors({});
    setIsSaving(true);

    try {
      const result = await reportDeliveryOccurrence(businessId, delivery.id, {
        occurrenceTypeId,
        description: occurrenceDescription || undefined,
        client_submission_id: occurrenceKey,
        ...panelReportForm({
          formVersion: selectedType?.form_version,
          fields: selectedFields,
          answers: verdict.answers,
        }),
      });

      if (isStaleActionResult(result)) return;

      if (result.success) {
        toast.success(result.message);
        setOccurrenceTypeId("");
        setOccurrenceDescription("");
        setAnswerInputs({});
        await refreshDetail();
      } else {
        if (result.fieldErrors) setAnswerErrors(result.fieldErrors);

        // A form edited since the selector loaded: read the types again, so
        // the fields on screen become the ones the API checks.
        await Promise.all(
          queriesStaleAfterReport(result.code, businessId).map((key) =>
            queryClient.invalidateQueries(key),
          ),
        );

        toast.error(result.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const statusMeta = delivery ? DELIVERY_STATUS_META[delivery.status] : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogScrollContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Entrega
            {statusMeta && (
              <Badge variant="outline" className={statusMeta.badgeClassName}>
                {statusMeta.label}
              </Badge>
            )}
          </DialogTitle>
          {/* Wraps instead of truncating: a nowrap line was the widest thing
              in the dialog and pushed it into a sideways scroll (DLV-OT-3). */}
          <DialogDescription className="break-words [overflow-wrap:anywhere]">
            {delivery ? (
              <>
                Para <strong>{delivery.recipient_name}</strong> —{" "}
                {delivery.city}/{delivery.uf}
              </>
            ) : (
              "Carregando..."
            )}
          </DialogDescription>
        </DialogHeader>

        {!isLoading && response && !response.success ? (
          // The API refused with a reason — showing it beats a spinner that
          // never resolves and says nothing.
          <div
            className="flex flex-col items-center gap-2 py-10 text-center
            text-sm text-muted-foreground"
          >
            <TriangleAlert className="h-6 w-6 text-red-600" />
            <p>{response.message}</p>
          </div>
        ) : isLoading || !delivery ? (
          <div className="flex items-center justify-center py-10">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Embarcador: </span>
                {displayValue(delivery.shipper?.name)}
              </p>
              <p>
                <span className="text-muted-foreground">Pedido: </span>
                {displayValue(delivery.code)}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Endereço: </span>
                {delivery.street}
                {delivery.address_number ? `, ${delivery.address_number}` : ""}
                {delivery.neighborhood
                  ? ` — ${delivery.neighborhood}`
                  : ""} — {delivery.city}/{delivery.uf}
              </p>
              <p className="sm:col-span-2 break-all">
                <span className="text-muted-foreground">Chave NF-e: </span>
                {displayValue(delivery.invoice_key)}
              </p>
              <p>
                <span className="text-muted-foreground">Prevista: </span>
                {/* A day, not an instant (decision 1.3): no time, never the
                    day before in the browser's zone. */}
                {formatDateOnly(delivery.scheduled_date, {
                  fallback: displayValue(null) ?? undefined,
                })}
              </p>
              {delivery.driver && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <p className="min-w-0 truncate">
                    <span className="text-muted-foreground">Motorista: </span>
                    {delivery.driver.name}
                  </p>

                  {/* Hidden on the tickets view itself — that is where this
                      button leads, with the delivery pre-linked. */}
                  {routeSearchParams.get("view") !== "tickets" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => {
                        // One builder for every way into the chat: it also
                        // drops a previous link's route or filter params.
                        const params = buildChatSearchParams(
                          routeSearchParams,
                          {
                            driver: {
                              id: delivery.driver!.id,
                              name: delivery.driver!.name,
                            },
                            delivery: {
                              id: delivery.id,
                              recipient_name: delivery.recipient_name,
                            },
                          },
                        );

                        router.push(ticketsHref(pathname, params));
                        onClose();
                      }}
                    >
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      Conversar
                    </Button>
                  )}
                </div>
              )}
              {delivery.status === "DELIVERED" && (
                <p>
                  <span className="text-muted-foreground">Entregue em: </span>
                  {delivery.delivered_at
                    ? formatNotificationDate(delivery.delivered_at, "pt-BR")
                    : displayValue(null)}
                  {delivery.received_by ? ` — ${delivery.received_by}` : ""}
                </p>
              )}
              {delivery.notes && (
                <p className="sm:col-span-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  <span className="text-muted-foreground">Observações: </span>
                  {delivery.notes}
                </p>
              )}
            </div>

            {delivery.items.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-medium">Itens da carga</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {delivery.items.map((item) => (
                      <li key={item.id}>
                        {Number(item.quantity)}x {item.description}
                        {item.unit_value
                          ? ` — R$ ${Number(item.unit_value).toFixed(2)} un.`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {allowedTransitions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm">Mudar status</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Select
                      value={nextStatus}
                      onValueChange={(value) =>
                        setNextStatus(value as DeliveryStatus)
                      }
                      disabled={!canWriteDelivery}
                    >
                      <SelectTrigger className="w-full sm:flex-1">
                        <SelectValue placeholder="Novo status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedTransitions.map((status) => {
                          // Decision 5.4, mirrored: "Em rota" is a driver
                          // carrying the load; the API also refuses a route
                          // that did not leave.
                          const blocker =
                            status === "IN_TRANSIT"
                              ? inTransitBlocker({
                                  driverId: delivery.driver?.id ?? null,
                                })
                              : null;

                          return (
                            <SelectItem
                              key={status}
                              value={status}
                              disabled={blocker !== null}
                              title={blocker ?? undefined}
                            >
                              {DELIVERY_STATUS_META[status].label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-full shrink-0 sm:w-auto">
                            <Button
                              type="button"
                              size="sm"
                              className="h-10 w-full sm:w-auto"
                              disabled={
                                !canWriteDelivery ||
                                isSaving ||
                                nextStatus === "" ||
                                reasonId === ""
                              }
                              onClick={() => void handleStatusChange()}
                            >
                              <span>Aplicar</span>
                              {isSaving && (
                                <div className="ml-2 animate-spin">
                                  <Loader className="h-4 w-4" />
                                </div>
                              )}
                            </Button>
                          </div>
                        </TooltipTrigger>
                        {!canWriteDelivery && (
                          <TooltipContent className="max-w-sm">
                            <p>{deliveryPermission.tooltipMessage}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {allowedTransitions.includes("IN_TRANSIT") &&
                    inTransitBlocker({
                      driverId: delivery.driver?.id ?? null,
                    }) && (
                      <p className="text-xs text-muted-foreground">
                        Em rota indisponível:{" "}
                        {inTransitBlocker({
                          driverId: delivery.driver?.id ?? null,
                        })}
                      </p>
                    )}

                  {nextStatus === "DELIVERED" && (
                    <FieldShell
                      label="Quem recebeu *"
                      htmlFor="received_by"
                      error={receivedByTouched ? receivedByIssue : null}
                      hint="Sem foto nem assinatura, o nome de quem recebeu é o que sustenta a baixa pelo painel."
                    >
                      {(control) => (
                        <Input
                          {...control}
                          value={receivedBy}
                          maxLength={150}
                          onChange={(e) => setReceivedBy(e.target.value)}
                          onBlur={() => setReceivedByTouched(true)}
                          placeholder="Nome de quem recebeu"
                          disabled={!canWriteDelivery || isSaving}
                        />
                      )}
                    </FieldShell>
                  )}

                  {/* Only once a status is picked: asking why before asking
                      what would be asking a question with no subject. */}
                  {nextStatus !== "" && (
                    <div className="pt-2">
                      <StatusReasonSelector
                        businessId={businessId}
                        reasonId={reasonId}
                        onReasonChange={setReasonId}
                        note={statusNote}
                        onNoteChange={setStatusNote}
                        disabled={!canWriteDelivery || isSaving}
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* The messages about THIS delivery, from the driver's one
                thread (decision 6.7). Writing stays in the chat. */}
            {delivery.driver && (
              <>
                <Separator />

                {/* Decision 14.5: the delivery's tickets, each one leading to
                    its conversation (design §6.4). */}
                <LinkedTickets
                  actionBusinessId={chatBusinessId}
                  driver={{
                    id: delivery.driver.id,
                    name: delivery.driver.name,
                  }}
                  context={{ kind: "delivery", id: delivery.id }}
                  onOpenTicket={(ticketId) => {
                    const params = buildTicketSearchParams(
                      routeSearchParams,
                      ticketId,
                    );

                    router.push(ticketsHref(pathname, params));
                    onClose();
                  }}
                />

                <ChatLinkedMessages
                  actionBusinessId={chatBusinessId}
                  driver={{
                    id: delivery.driver.id,
                    name: delivery.driver.name,
                  }}
                  filter={{
                    kind: "delivery",
                    id: delivery.id,
                    label: delivery.recipient_name,
                  }}
                  onOpenChat={() => {
                    const params = buildChatSearchParams(routeSearchParams, {
                      driver: {
                        id: delivery.driver!.id,
                        name: delivery.driver!.name,
                      },
                      delivery: {
                        id: delivery.id,
                        recipient_name: delivery.recipient_name,
                      },
                      filter: "delivery",
                    });

                    router.push(ticketsHref(pathname, params));
                    onClose();
                  }}
                />
              </>
            )}

            <Separator />

            <ProofDocumentSection
              businessId={businessId}
              deliveryId={delivery.id}
              status={delivery.status}
              canRegenerate={canWriteDelivery}
              regenerateBlockedReason={deliveryPermission.tooltipMessage}
            />

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">
                Histórico ({(delivery.timeline ?? []).length})
              </p>

              {/* One list instead of the two this dialog used to show.
                  Apontamentos and Ocorrências were separate sections built
                  from separate tables, and a status changed by hand appeared
                  in neither — so the screen support opens while the customer
                  is on the phone was the one screen that could not answer
                  "por que essa entrega está assim?". The API merges the
                  tables and phrases each line; showing the old sections
                  alongside this would print the same fact twice, which is how
                  people start doubting which copy is right. */}
              <DeliveryTimeline
                entries={delivery.timeline ?? []}
                onPreviewImage={(url, label) => setPreviewImage({ url, label })}
                occurrenceDetails={occurrenceLineDetails(delivery.occurrences)}
              />
            </div>

            <Separator />

            <div>
              {!["CANCELLED"].includes(delivery.status) && (
                <div className="mt-3 space-y-2 rounded-lg border border-dashed p-3">
                  <Label className="text-sm">Registrar ocorrência</Label>
                  <OccurrenceTypeSelector
                    occurrenceTypes={occurrenceTypes}
                    value={occurrenceTypeId}
                    onChange={setOccurrenceTypeId}
                    isLoading={isLoadingTypes}
                    disabled={!canWriteOccurrence}
                  />

                  {/* Decision 6.3: the author is the authority only when the
                      queue would let them decide (delivery_manage write). */}
                  {selectedType?.requires_authorization && (
                    <p className="text-xs text-muted-foreground">
                      {panelReportAuthorizationNotice(canWriteDelivery)}
                    </p>
                  )}

                  {selectedFields && (
                    <OccurrenceAnswerFields
                      fields={selectedFields}
                      values={answerInputs}
                      onChange={(key, value) =>
                        setAnswerInputs((current) => ({
                          ...current,
                          [key]: value,
                        }))
                      }
                      errors={answerErrors}
                      disabled={!canWriteOccurrence || isSaving}
                    />
                  )}

                  <FieldShell
                    label="Descrição (opcional)"
                    htmlFor="occurrence_description"
                  >
                    {(control) => (
                      <Textarea
                        {...control}
                        value={occurrenceDescription}
                        onChange={(e) =>
                          setOccurrenceDescription(e.target.value)
                        }
                        placeholder="O que aconteceu, com detalhes"
                        maxLength={500}
                        disabled={!canWriteOccurrence}
                      />
                    )}
                  </FieldShell>

                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full sm:w-fit">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto"
                            disabled={
                              !canWriteOccurrence ||
                              isSaving ||
                              occurrenceTypeId === ""
                            }
                            onClick={() => void handleReportOccurrence()}
                          >
                            Registrar
                          </Button>
                        </div>
                      </TooltipTrigger>
                      {!canWriteOccurrence && (
                        <TooltipContent className="max-w-sm">
                          <p>{occurrencePermission.tooltipMessage}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
        )}
        {previewImage && (
          <Dialog
            open={previewImage !== null}
            onOpenChange={(open) => !open && setPreviewImage(null)}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{previewImage.label}</DialogTitle>
                <DialogDescription>
                  Registrado pelo motorista no aplicativo.
                </DialogDescription>
              </DialogHeader>
              {/* Zoom, rotation and the lens, as in the proof audit: a
                  receipt photo has to be read, not glanced at. Keyed per
                  photo so a new one starts a new inspection. */}
              <ImageInspector
                key={previewImage.url}
                url={previewImage.url}
                alt={previewImage.label}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DeliveryDetailDialog };
