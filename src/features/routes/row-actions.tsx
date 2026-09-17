"use client";

import { useState } from "react";

import {
  Ban,
  Copy,
  Eye,
  ListOrdered,
  PencilLine,
  Send,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  RowActionItem,
  RowActions,
  RowActionSeparator,
} from "@/components/shared/custom/row-actions";

import { toast } from "sonner";

import {
  getRoute,
  type RouteDetail,
  type RouteListItem,
} from "@/actions/route/get-route";

import { releaseRoute } from "@/actions/route/route-operations";
import { revalidateTagName } from "@/actions/revalidate";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useRoutesBusinessId } from "./hooks/use-routes-business-id";
import {
  canCancelRoute,
  canReleaseRoute,
  canUnreleaseRoute,
  isRouteEditable,
} from "./lib/status";

import { RouteDetailDialog } from "./detail-dialog";
import { RouteFormDialog } from "./form-dialog";
import { RouteStopsDialog } from "./stops-dialog";
import { CancelRouteDialog } from "./cancel-dialog";

interface RouteRowActionsProps {
  route: RouteListItem;
}

/**
 * What a dispatcher can do to a route from the board.
 *
 * Every action the state machine forbids is rendered DISABLED with a tooltip
 * saying why, never hidden — hiding it leaves the user with no way to learn
 * what is missing, and "why can't I release this one?" is the most common
 * question this screen has to answer. The shared primitive is what makes that
 * rule the same rule in every module.
 */
const RouteRowActions = ({ route }: RouteRowActionsProps): JSX.Element => {
  const businessId = useRoutesBusinessId();

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const [isStopsOpen, setIsStopsOpen] = useState<boolean>(false);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);

  // The board row is a summary; editing needs the windows and the full crew,
  // so the whole record is fetched when the dialog is asked for.
  const [editingRoute, setEditingRoute] = useState<RouteDetail | null>(null);

  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);

  const permissionsRequired = useCheckMultiplePermissions([
    {
      key: permissions.DELIVERY_MANAGE,
      action: "write",
      label: getPermissionName(permissions.DELIVERY_MANAGE),
    },
  ]);

  const canWrite = permissionsRequired.hasAllPermissions;

  const editable = isRouteEditable(route.status);

  const unreleasable = canUnreleaseRoute(route.status);

  /**
   * Why the release is blocked, in the order the dispatcher would hit it.
   *
   * The vehicle and the stops are required one step before the departure
   * strictly needs them: discovering at the truck that none was assigned
   * costs a phone call and a morning. Saying so here saves the round trip to
   * a refusal.
   */
  const releaseBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !canReleaseRoute(route.status)
      ? "Só uma rota em planejamento pode ser liberada."
      : route.stops.length === 0
        ? "Adicione ao menos uma parada antes de liberar a rota."
        : !route.vehicleId
          ? "Defina o veículo da rota antes de liberá-la."
          : null;

  const cancelBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !canCancelRoute(route.status)
      ? "Esta rota já terminou."
      : null;

  const editBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !editable
      ? "Uma rota que já saiu não pode mais ser editada. Cancele-a se precisar refazê-la."
      : null;

  const stopsBlocker = !canWrite
    ? permissionsRequired.tooltipMessage
    : !editable
      ? "A ordem das paradas é o que o motorista está seguindo na tela dele — depois da saída ela não muda mais."
      : null;

  const handleCopyID = () => {
    navigator.clipboard
      .writeText(route.id)
      .then(() => toast.success("ID copiado para a área de transferência!"))
      .catch((error) => toast.error("Erro ao copiar o ID: " + error));
  };

  const handleOpenEdit = async () => {
    if (!businessId) return;

    setIsLoadingEdit(true);

    try {
      const response = await getRoute(businessId, route.id);

      if (!response.success || !response.data) {
        toast.error(response.message);
        return;
      }

      setEditingRoute(response.data.route);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleRelease = async (released: boolean) => {
    if (!businessId) return;

    setIsReleasing(true);

    try {
      const response = await releaseRoute(businessId, route.id, released);

      if (!response.success) {
        // The API's own message carries what the dispatcher has to do about
        // it — "atualize a tela" on a conflict, the missing piece otherwise.
        toast.error(response.message);
        return;
      }

      toast.success(response.message);
      await revalidateTagName("update-route");
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Ver detalhes da rota ${route.code}`}
          onClick={() => setIsDetailOpen(true)}
        >
          <Eye className="h-4 w-4" />
        </Button>

        <RowActions
          entity={`a rota ${route.code}`}
          isBusy={isLoadingEdit || isReleasing}
        >
          <RowActionItem
            label="Ver detalhes"
            icon={<Eye />}
            onSelect={() => setIsDetailOpen(true)}
          />

          <RowActionItem
            label="Editar rota"
            icon={<PencilLine />}
            blockedReason={editBlocker}
            onSelect={() => void handleOpenEdit()}
          />

          <RowActionItem
            label="Paradas e ordem"
            icon={<ListOrdered />}
            blockedReason={stopsBlocker}
            onSelect={() => setIsStopsOpen(true)}
          />

          <RowActionSeparator />

          {unreleasable ? (
            <RowActionItem
              label="Voltar ao planejamento"
              icon={<Undo2 />}
              blockedReason={
                canWrite ? null : permissionsRequired.tooltipMessage
              }
              onSelect={() => void handleRelease(false)}
            />
          ) : (
            <RowActionItem
              label="Liberar para o motorista"
              icon={<Send />}
              blockedReason={releaseBlocker}
              onSelect={() => void handleRelease(true)}
            />
          )}

          <RowActionItem
            label="Copiar ID"
            icon={<Copy />}
            onSelect={handleCopyID}
          />

          <RowActionSeparator />

          {/* No delete. A route that ran is the record of a driver's day, and
          one that did not still reserved deliveries no other route could take
          — cancelling is the ending it can have, and it releases what the
          route was holding. */}
          <RowActionItem
            label="Cancelar rota"
            icon={<Ban />}
            destructive
            blockedReason={cancelBlocker}
            onSelect={() => setIsCancelOpen(true)}
          />
        </RowActions>
      </div>

      {isDetailOpen && businessId && (
        <RouteDetailDialog
          businessId={businessId}
          routeId={route.id}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}

      {editingRoute && businessId && (
        <RouteFormDialog
          businessId={businessId}
          route={editingRoute}
          isOpen={editingRoute !== null}
          onClose={() => setEditingRoute(null)}
        />
      )}

      {isStopsOpen && businessId && (
        <RouteStopsDialog
          businessId={businessId}
          routeId={route.id}
          isOpen={isStopsOpen}
          onClose={() => setIsStopsOpen(false)}
        />
      )}

      {isCancelOpen && businessId && (
        <CancelRouteDialog
          businessId={businessId}
          route={route}
          isOpen={isCancelOpen}
          onClose={() => setIsCancelOpen(false)}
        />
      )}
    </>
  );
};

export { RouteRowActions };
