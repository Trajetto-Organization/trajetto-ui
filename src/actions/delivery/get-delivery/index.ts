"use server";

import { logActionError } from "@/lib/log-action-error";
import { getCookies } from "../../cookies";
import { apiFetch } from "@/lib/api-fetch";

type DeliveryStatus =
  "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | "CANCELLED";

interface DeliveryListItem {
  id: string;
  code: string | null;
  invoice_key: string | null;
  invoice_number: string | null;
  recipient_name: string;
  city: string;
  uf: string;
  status: DeliveryStatus;
  scheduled_date: string | null;
  delivered_at: string | null;
  shipper: { id: string; name: string } | null;
  driver: { id: string; name: string; cnh: string } | null;
  vehicle: { id: string; license_plate: string } | null;
  created_at: string;
  updated_at: string;
}

type OccurrenceAuthorizationStatus =
  "NOT_REQUIRED" | "PENDING" | "APPROVED" | "DENIED" | "SUPERSEDED";

interface DeliveryOccurrenceDetail {
  id: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  created_at: string;
  occurrenceType: {
    id: string;
    name: string;
    blocks_delivery: boolean;
    /** Decisions 6.2/6.3; absent on an API older than the phase. */
    requires_authorization?: boolean;
    /** The type's CURRENT form: labels the answers. */
    form_fields?: unknown;
    form_version?: number;
  };
  reportedBy: { id: string; name: string };
  /** The answers to the type's form, by field key (decision 6.2). */
  form_answers?: Record<string, string | number | boolean | null> | null;
  form_version?: number | null;
  /** The tower's say (decision 6.3). */
  authorization_status?: OccurrenceAuthorizationStatus;
  authorizedBy?: { id: string; name: string } | null;
  authorized_at?: string | null;
  authorization_note?: string | null;
  escalated_at?: string | null;
}

/**
 * A driver appointment: arriving at the address or proving the drop-off.
 * photo/signature arrive as short-lived signed URLs, ready for <img>.
 */
interface DeliveryEventDetail {
  id: string;
  // Every DeliveryEventType the API sends (it filters none).
  type:
    | "ARRIVAL"
    | "PROOF"
    | "STATUS_CHANGE"
    | "NOTE"
    | "ON_THE_WAY"
    | "OCCURRENCE"
    // Decision 14.7: the delivery was added to or taken off a route.
    | "ROUTE_ADDED"
    | "ROUTE_REMOVED";
  /** The occurrence the event records, when there is one. */
  occurrenceId?: string | null;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  signature: string | null;
  received_by: string | null;
  created_at: string;
  reportedBy: { id: string; name: string };
}

interface DeliveryDetail extends DeliveryListItem {
  recipient_document: string | null;
  recipient_email: string | null;
  recipient_telephone: string | null;
  cep: string | null;
  street: string;
  address_number: string | null;
  complement: string | null;
  neighborhood: string | null;
  received_by: string | null;
  notes: string | null;
  /**
   * The upload that created it. Items of an NF-e XML delivery are what the
   * note declared and are not editable (decision 5.2); a typed one's are.
   */
  import?: { source: "SPREADSHEET" | "NFE_XML" } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unit: string | null;
    unit_value: string | null;
  }>;
  occurrences: DeliveryOccurrenceDetail[];
  events: DeliveryEventDetail[];

  /**
   * Everything that ever happened to this delivery, newest first, already
   * merged and phrased by the API.
   *
   * `occurrences` and `events` stay because the existing tabs read them; this
   * is the single list support reads when a customer calls. The titles arrive
   * in Portuguese and ready to render — the web must not re-derive them, or
   * the sentence the SAC reads and the sentence the driver's app shows start
   * drifting apart.
   */
  timeline: TimelineEntry[];
}

type TimelineKind =
  | "ARRIVAL"
  | "PROOF"
  | "STATUS_CHANGE"
  | "NOTE"
  | "ON_THE_WAY"
  | "OCCURRENCE"
  | "MESSAGE"
  | "ROUTE_ADDED"
  | "ROUTE_REMOVED";

type TimelineActor = "USER" | "DRIVER_APP" | "INTEGRATION" | "SYSTEM";

interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  at: string;

  /** One line, already in Portuguese. */
  title: string;

  /** The detail under it, when there is one. */
  detail: string | null;

  author: {
    kind: TimelineActor;
    name: string | null;

    /** DRIVER_APP only — support is regularly asked to tell two phones apart. */
    device: string | null;
  };

  photos: string[];
  location: { latitude: number; longitude: number } | null;

  /** STATUS_CHANGE only. */
  statusFrom: DeliveryStatus | null;
  statusTo: DeliveryStatus | null;
  reason: string | null;

  /** OCCURRENCE only: whether the type flipped the delivery to Insucesso. */
  blocking: boolean;
}

interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

const getDelivery = async (
  businessId: string,
  deliveryId: string,
): Promise<ActionResponse<DeliveryDetail>> => {
  const tokenAccess = await getCookies("tkey");

  if (!tokenAccess) {
    return {
      success: false,
      message: "Token de acesso não encontrado. Faça login novamente.",
    };
  }

  try {
    const response = await apiFetch(
      `${process.env.HTTP_REQUEST}/delivery/get-delivery/${deliveryId}/business/${businessId}`,
      {
        credentials: "include",
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenAccess}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Houve um erro ao carregar a entrega.",
      };
    }

    return {
      success: true,
      message: "Entrega carregada com sucesso.",
      data: result.data as DeliveryDetail,
    };
  } catch (error) {
    logActionError("delivery/get-delivery", error);
    return {
      success: false,
      message: "Ocorreu um erro inesperado ao carregar a entrega.",
    };
  }
};

export { getDelivery };
export type {
  TimelineActor,
  TimelineEntry,
  TimelineKind,
  DeliveryStatus,
  DeliveryListItem,
  DeliveryDetail,
  DeliveryOccurrenceDetail,
  OccurrenceAuthorizationStatus,
};
