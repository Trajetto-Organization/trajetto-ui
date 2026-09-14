"use client";

import { useState } from "react";
import Image from "next/image";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "react-query";

import { toast } from "sonner";
import { Loader, MapPin, MessageCircle, TriangleAlert } from "lucide-react";

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

import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getDelivery, type DeliveryStatus } from "@/actions/delivery/get-delivery";

import { updateDeliveryStatus } from "@/actions/delivery/update-delivery-status";
import { reportDeliveryOccurrence } from "@/actions/delivery/report-delivery-occurrence";

import { listOccurrenceTypes } from "@/actions/occurrence-type/list-occurrence-type";
import { revalidateTagName } from "@/actions/revalidate";
import { formatNotificationDate, displayValue } from "@/lib/format-values";

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

import { DELIVERY_STATUS_META, DELIVERY_TRANSITIONS } from "../../lib/status";
import { OccurrenceTypeSelector } from "../occurrence-type-selector";

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

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { data: response, isLoading } = useQuery(
    ["delivery-detail", deliveryId],
    () => getDelivery(businessId, deliveryId),
    { refetchOnWindowFocus: false },
  );

  const { data: typesResponse, isLoading: isLoadingTypes } = useQuery(
    ["occurrence-types-select", businessId],
    () => listOccurrenceTypes(businessId, 1, 100),
    { refetchOnWindowFocus: false },
  );

  const delivery = response?.data;
  const occurrenceTypes = (typesResponse?.data?.data ?? []).filter(
    (type) => type.is_active,
  );

  const allowedTransitions = delivery
    ? DELIVERY_TRANSITIONS[delivery.status]
    : [];

  const refreshDetail = async () => {
    void queryClient.invalidateQueries(["delivery-detail", deliveryId]);

    // The list behind the dialog is server-rendered — its cache tag is what
    // makes the new status show up there.
    await revalidateTagName("update-delivery");
  };

  const handleStatusChange = async () => {
    if (!delivery || !nextStatus) return;
    setIsSaving(true);

    try {
      const result = await updateDeliveryStatus(
        businessId,
        delivery.id,
        nextStatus,
        nextStatus === "DELIVERED" ? receivedBy || undefined : undefined,
      );

      if (result.success) {
        toast.success(result.message);
        setNextStatus("");
        setReceivedBy("");
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
    setIsSaving(true);

    try {
      const result = await reportDeliveryOccurrence(businessId, delivery.id, {
        occurrenceTypeId,
        description: occurrenceDescription || undefined,
      });

      if (result.success) {
        toast.success(result.message);
        setOccurrenceTypeId("");
        setOccurrenceDescription("");
        await refreshDetail();
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const statusMeta = delivery ? DELIVERY_STATUS_META[delivery.status] : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogScrollContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Entrega
            {statusMeta && (
              <Badge variant="outline" className={statusMeta.badgeClassName}>
                {statusMeta.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="truncate">
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
                {delivery.neighborhood ? ` — ${delivery.neighborhood}` : ""} —{" "}
                {delivery.city}/{delivery.uf}
              </p>
              <p className="sm:col-span-2 truncate">
                <span className="text-muted-foreground">Chave NF-e: </span>
                {displayValue(delivery.invoice_key)}
              </p>
              <p>
                <span className="text-muted-foreground">Prevista: </span>
                {delivery.scheduled_date
                  ? formatNotificationDate(delivery.scheduled_date, "pt-BR")
                  : displayValue(null)}
              </p>
              {delivery.driver && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <p className="min-w-0 truncate">
                    <span className="text-muted-foreground">Motorista: </span>
                    {delivery.driver.name}
                  </p>

                  {/* Hidden on the chat tab itself — that is where this
                      button leads, with the delivery pre-linked. */}
                  {routeSearchParams.get("tab") !== "chat" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => {
                        const params = new URLSearchParams(
                          routeSearchParams.toString(),
                        );

                        params.set("tab", "chat");
                        params.delete("page");
                        params.delete("search");

                        params.set("chatDriver", delivery.driver!.id);
                        params.set("chatDriverName", delivery.driver!.name);
                        params.set("chatDelivery", delivery.id);
                        params.set("chatRecipient", delivery.recipient_name);

                        router.push(`${pathname}?${params.toString()}`);
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
                <p className="sm:col-span-2">
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
                        {allowedTransitions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {DELIVERY_STATUS_META[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {nextStatus === "DELIVERED" && (
                      <Input
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder="Quem recebeu (opcional)"
                        className="w-full sm:flex-1"
                        disabled={!canWriteDelivery}
                      />
                    )}

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
                                nextStatus === ""
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
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">
                Apontamentos do motorista ({(delivery.events ?? []).length})
              </p>

              {(delivery.events ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum apontamento ainda — chegada e comprovação aparecem
                  aqui quando o motorista registra pelo aplicativo.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(delivery.events ?? []).map((event) => (
                    <li
                      key={event.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {event.type === "PROOF"
                            ? "Entrega comprovada"
                            : "Chegou ao endereço"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationDate(event.created_at, "pt-BR")}
                        </span>
                      </div>

                      <p
                        className="mt-1 flex flex-wrap items-center gap-2
                        text-xs text-muted-foreground"
                      >
                        Por {event.reportedBy.name}
                        {event.received_by && (
                          <span>· Recebido por {event.received_by}</span>
                        )}
                        {event.latitude !== null && (
                          <a
                            href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-0.5 underline
                            underline-offset-2"
                          >
                            <MapPin className="h-3 w-3" />
                            Ver no mapa
                          </a>
                        )}
                      </p>

                      {(event.photo || event.signature) && (
                        <div className="mt-2 flex flex-wrap gap-3">
                          {event.photo && (
                            <button
                              type="button"
                              className="block cursor-pointer"
                              onClick={() =>
                                setPreviewImage({
                                  url: event.photo!,
                                  label: "Foto do canhoto",
                                })
                              }
                            >
                              {/* Signed URL, thumbnail only — the lightbox
                              shows it big without leaving the detail. */}
                              <img
                                src={event.photo}
                                alt="Foto do canhoto"
                                className="h-20 w-20 rounded-md border
                                object-cover"
                              />
                              <span
                                className="mt-0.5 block text-center
                                text-[10px] text-muted-foreground"
                              >
                                Canhoto
                              </span>
                            </button>
                          )}
                          {event.signature && (
                            <button
                              type="button"
                              className="block cursor-pointer"
                              onClick={() =>
                                setPreviewImage({
                                  url: event.signature!,
                                  label: "Assinatura do recebedor",
                                })
                              }
                            >
                              <img
                                src={event.signature}
                                alt="Assinatura do recebedor"
                                className="h-20 w-28 rounded-md border
                                bg-white object-contain"
                              />
                              <span
                                className="mt-0.5 block text-center
                                text-[10px] text-muted-foreground"
                              >
                                Assinatura
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-sm font-medium">
                Ocorrências ({delivery.occurrences.length})
              </p>

              {delivery.occurrences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma ocorrência registrada.
                </p>
              ) : (
                <ul className="space-y-2">
                  {delivery.occurrences.map((occurrence) => (
                    <li
                      key={occurrence.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          {occurrence.occurrenceType.blocks_delivery && (
                            <TriangleAlert className="h-3.5 w-3.5 text-red-600" />
                          )}
                          {occurrence.occurrenceType.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationDate(
                            occurrence.created_at,
                            "pt-BR",
                          )}
                        </span>
                      </div>
                      {occurrence.description && (
                        <p className="mt-1 text-muted-foreground">
                          {occurrence.description}
                        </p>
                      )}
                      {occurrence.photos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {occurrence.photos.map((photoUrl, index) => (
                            <button
                              key={index}
                              type="button"
                              className="cursor-pointer"
                              onClick={() =>
                                setPreviewImage({
                                  url: photoUrl,
                                  label: `Foto da ocorrência ${index + 1}`,
                                })
                              }
                            >
                              <img
                                src={photoUrl}
                                alt={`Foto da ocorrência ${index + 1}`}
                                className="h-16 w-16 rounded-md border
                                object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        Por {occurrence.reportedBy.name}
                        {occurrence.latitude !== null && (
                          <a
                            href={`https://www.google.com/maps?q=${occurrence.latitude},${occurrence.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-0.5 underline
                            underline-offset-2"
                          >
                            <MapPin className="h-3 w-3" />
                            Ver no mapa
                          </a>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

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
                  <Textarea
                    value={occurrenceDescription}
                    onChange={(e) => setOccurrenceDescription(e.target.value)}
                    placeholder="Descrição (opcional)"
                    maxLength={500}
                    disabled={!canWriteOccurrence}
                  />

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
              <div className="flex justify-center">
                <Image
                  src={previewImage.url}
                  alt={previewImage.label}
                  width={800}
                  height={600}
                  className="max-w-full max-h-96 object-contain rounded-lg"
                  // Always without Next's optimizer — the signed URL does
                  // not pass remotePatterns, same rule as the fuel photos.
                  unoptimized
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogScrollContent>
    </Dialog>
  );
};

export { DeliveryDetailDialog };
