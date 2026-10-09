"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import FormInput from "@/components/shared/custom/form-input";
import {
  IGNORE_BLUR_ATTRIBUTE,
  useLiveValidation,
} from "@/components/shared/live-validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFormFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MoveToPositionDialogProps {
  open: boolean;
  title: string;

  /** 1-based. */
  current: number;
  total: number;

  onOpenChange: (open: boolean) => void;
  onConfirm: (position: number) => void;
}

/** A position typed in, for a stop at the end of a list of two hundred. */
function parsePosition(value: string, total: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;

  const position = Number(value.trim());

  return position >= 1 && position <= total ? position : null;
}

/**
 * "Mover para a posição…": for a long route, dragging a stop forty rows is
 * worse than typing where it goes (decision 14.7, D6). The move is local
 * until "Salvar ordem", like a drag.
 */
const MoveToPositionDialog = ({
  open,
  title,
  current,
  total,
  onOpenChange,
  onConfirm,
}: MoveToPositionDialogProps): JSX.Element => {
  const [value, setValue] = useState<string>(String(current));

  useEffect(() => {
    if (open) setValue(String(current));
  }, [open, current]);

  const position = parsePosition(value, total);

  // Live validation (decision 16.700): no red while the number is being
  // typed; Mover is enabled and says what is wrong (16.701).
  const live = useLiveValidation({
    values: { position: value },
    rules: () => ({
      position: position === null ? `Informe um número de 1 a ${total}.` : null,
    }),
    controlIds: { position: "stop-position" },
    resetKey: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mover para a posição</DialogTitle>
          <DialogDescription>
            {title} está na posição {current} de {total}.
          </DialogDescription>
        </DialogHeader>

        <form
          ref={live.ref}
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (position) onConfirm(position);
          }}
        >
          <FormInput
            label="Nova posição *"
            htmlfor="stop-position"
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            errorName={live.errorOf("position")}
            hint={`Um número de 1 a ${total}.`}
          />

          <DialogFormFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              {...{ [IGNORE_BLUR_ATTRIBUTE]: "" }}
            >
              Cancelar
            </Button>
            <Button type="submit">Mover</Button>
          </DialogFormFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { MoveToPositionDialog, parsePosition };
