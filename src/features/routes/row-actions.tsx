"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
import { isStaleActionResult } from "@/lib/action-result";

import { permissions } from "@/lib/permissions";
import {
  getPermissionName,
  useCheckMultiplePermissions,
} from "@/lib/check-multiple-permissions";

import { useRoutesBusinessId } from "./hooks/use-routes-business-id";
import { canUnreleaseRoute } from "./lib/status";
import {
  cancelBlocker as cancelBlockerOf,
  editBlocker as editBlockerOf,
  releaseBlocker as releaseBlockerOf,
} from "./lib/route-blockers";
import { routeDetailHref } from "./lib/route-links";

import { RouteFormDialog } from "./form-dialog";
import { CancelRouteDialog } from "./cancel-dialog";

interface RouteRowActionsProps {
  route: RouteListItem;
}

/**
 * What a dispatcher can do to a route from the board.
 *
 * Every action the state machine forbids is rendered DISABLED with the reason,
 * never hidden — hiding it leaves the user with no way to learn what is
 * missing, and "why can't I release this one?" is the most common question
 * this screen has to answer. The shared primitive is what makes that rule the
 * same rule in every module.
 *
 * The legacy menu the user approved (decision 3.5): 160px, text only, the
 * destructive item in red. The eye button beside it is gone — it repeated
 * "Ver detalhes", the first item of the menu.
 */
const RouteRowActions = ({ route }: RouteRowActionsProps): JSX.Element => {
  const businessId = useRoutesBusinessId();

  const router = useRouter();
  const pathname = usePathname();

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

  const unreleasable = canUnreleaseRoute(route.status);

  // One source with the route page (lib/route-blockers): the board and the
  // page never disagree about what a route allows.
  const permission = {
    canWrite,
    message: permissionsRequired.tooltipMessage,
  };

  const releaseBlocker = releaseBlockerOf(route, permission);
  const cancelBlocker = cancelBlockerOf(route, permission);
  const editBlocker = editBlockerOf(route, permission);

  // The route's own page (decision 14.7, D12): stops, order, map and the
  // picker of deliveries without a route live there.
  const openPage = () =>
    router.push(routeDetailHref(pathname, route.id, businessId));

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

      if (isStaleActionResult(response)) return;

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

      if (isStaleActionResult(response)) return;

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
      <RowActions
        entity={`a rota ${route.code}`}
        isBusy={isLoadingEdit || isReleasing}
      >
        <RowActionItem label="Ver detalhes" onSelect={openPage} />

        <RowActionItem
          label="Editar rota"
          blockedReason={editBlocker}
          onSelect={() => void handleOpenEdit()}
        />

        <RowActionSeparator />

        {unreleasable ? (
          <RowActionItem
            label="Voltar ao planejamento"
            blockedReason={canWrite ? null : permissionsRequired.tooltipMessage}
            onSelect={() => void handleRelease(false)}
          />
        ) : (
          <RowActionItem
            label="Liberar para o motorista"
            blockedReason={releaseBlocker}
            onSelect={() => void handleRelease(true)}
          />
        )}

        <RowActionItem label="Copiar ID" onSelect={handleCopyID} />

        <RowActionSeparator />

        {/* No delete. A route that ran is the record of a driver's day, and
        one that did not still reserved deliveries no other route could take
        — cancelling is the ending it can have, and it releases what the
        route was holding. */}
        <RowActionItem
          label="Cancelar rota"
          destructive
          blockedReason={cancelBlocker}
          onSelect={() => setIsCancelOpen(true)}
        />
      </RowActions>

      {editingRoute && businessId && (
        <RouteFormDialog
          businessId={businessId}
          route={editingRoute}
          isOpen={editingRoute !== null}
          onClose={() => setEditingRoute(null)}
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
