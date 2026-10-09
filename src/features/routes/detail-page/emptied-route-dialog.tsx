"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { RouteDetail } from "@/actions/route/get-route";

import { CancelRouteDialog } from "../cancel-dialog";

interface EmptiedRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  route: RouteDetail;
  onUnrelease: () => Promise<void>;
  onCancelled: () => void;
}

/**
 * A released route left with no stop (decision 14.7, §4.4). The API does not
 * cancel it here — the dispatcher is on its page — so the page asks: back to
 * planning, cancel it, or keep it released to fill again.
 */
const EmptiedRouteDialog = ({
  open,
  onOpenChange,
  businessId,
  route,
  onUnrelease,
  onCancelled,
}: EmptiedRouteDialogProps): JSX.Element => {
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>A rota ficou sem entregas</DialogTitle>
            <DialogDescription>
              A Rota {route.code} está liberada para o motorista, mas não tem
              mais nenhuma parada. O que fazer com ela?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Manter
            </Button>

            <Button
              variant="outline"
              disabled={isBusy}
              onClick={async () => {
                setIsBusy(true);

                try {
                  await onUnrelease();
                } finally {
                  setIsBusy(false);
                }
              }}
            >
              Voltar ao planejamento
            </Button>

            <Button
              variant="destructive"
              onClick={() => {
                onOpenChange(false);
                setIsCancelOpen(true);
              }}
            >
              Cancelar rota
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isCancelOpen && (
        <CancelRouteDialog
          businessId={businessId}
          route={route}
          isOpen={isCancelOpen}
          onClose={() => {
            setIsCancelOpen(false);
            onCancelled();
          }}
        />
      )}
    </>
  );
};

export { EmptiedRouteDialog };
