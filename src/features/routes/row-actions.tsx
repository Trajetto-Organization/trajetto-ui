"use client";

import { useState } from "react";

import {
  Ban,
  Eye,
  ListOrdered,
  Loader,
  MoreHorizontal,
  PencilLine,
  Send,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
 * question this screen has to answer.
 */
const RouteRowActions = ({ route }: RouteRowActionsProps): JSX.Element => {
  const businessId = useRoutesBusinessId();

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

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
  const canEdit = canWrite && editable;

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

    setIsDropdownOpen(false);
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

    setIsDropdownOpen(false);
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

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
            >
              {isLoadingEdit || isReleasing ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal />
              )}
              <span className="sr-only">Abrir Menu</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[230px]">
            <DropdownMenuItem
              className="flex cursor-pointer justify-between truncate"
              onClick={() => {
                setIsDropdownOpen(false);
                setIsDetailOpen(true);
              }}
            >
              Ver Detalhes
              <Eye className="h-4 w-4" />
            </DropdownMenuItem>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="flex cursor-pointer justify-between truncate"
                      disabled={editBlocker !== null}
                      onSelect={(event) => {
                        event.preventDefault();
                        void handleOpenEdit();
                      }}
                    >
                      Editar Rota
                      <PencilLine className="h-4 w-4" />
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {editBlocker && (
                  <TooltipContent className="max-w-sm">
                    <p>{editBlocker}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="flex cursor-pointer justify-between truncate"
                      disabled={stopsBlocker !== null}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsStopsOpen(true);
                      }}
                    >
                      Paradas e ordem
                      <ListOrdered className="h-4 w-4" />
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {stopsBlocker && (
                  <TooltipContent className="max-w-sm">
                    <p>{stopsBlocker}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <DropdownMenuSeparator />

            {unreleasable ? (
              <DropdownMenuItem
                className="flex cursor-pointer justify-between truncate"
                disabled={!canWrite}
                onClick={() => void handleRelease(false)}
              >
                Voltar ao planejamento
                <Undo2 className="h-4 w-4" />
              </DropdownMenuItem>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <DropdownMenuItem
                        className="flex cursor-pointer justify-between truncate"
                        disabled={releaseBlocker !== null}
                        onClick={() => void handleRelease(true)}
                      >
                        Liberar para o motorista
                        <Send className="h-4 w-4" />
                      </DropdownMenuItem>
                    </div>
                  </TooltipTrigger>
                  {releaseBlocker && (
                    <TooltipContent className="max-w-sm">
                      <p>{releaseBlocker}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}

            <DropdownMenuItem
              className="cursor-pointer truncate block"
              onClick={handleCopyID}
            >
              Copiar ID
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* No delete. A route that ran is the record of a driver's day,
            and one that did not still reserved deliveries no other route could
            take — cancelling is the ending it can have, and it releases what
            the route was holding. */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      className="flex cursor-pointer items-center justify-between
                      text-red-600 focus:text-red-600"
                      disabled={cancelBlocker !== null}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsCancelOpen(true);
                      }}
                    >
                      Cancelar Rota
                      <Ban className="h-4 w-4" />
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                {cancelBlocker && (
                  <TooltipContent className="max-w-sm">
                    <p>{cancelBlocker}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuContent>
        </DropdownMenu>
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
