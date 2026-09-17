"use client";

import type { ReactNode } from "react";
import { Loader } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";

/**
 * "Are you sure?", in the product's own voice.
 *
 * Two screens asked it with `window.confirm`, which is the browser's dialog:
 * a different typeface, a different button order per platform, no theme, no
 * dark mode, and a title that says "localhost:3100 says". On the revoke of an
 * API key — a decision that stops somebody's ERP mid-sentence — that is the
 * moment the product looks least like a product.
 *
 * Built on AlertDialog rather than Dialog, and the difference is the point: a
 * confirmation must not be dismissable by clicking beside it. Radix gives
 * that for free here, along with focus landing on the cancel button.
 *
 * The buttons are Cancelar + the verb of the action, never "Voltar" — there
 * is no previous step to go back to.
 */

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  title: string;
  description: ReactNode;

  /** The verb, e.g. "Revogar". Defaults to a neutral confirmation. */
  confirmLabel?: string;
  cancelLabel?: string;

  /** Paints the action red and marks it as the dangerous one. */
  destructive?: boolean;

  isPending?: boolean;

  onConfirm: () => void | Promise<void>;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmDialogProps): JSX.Element => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={cn(destructive && "text-red-600 dark:text-red-500")}
          >
            {title}
          </AlertDialogTitle>

          {/*
            `asChild` because the consequence is usually worth more than one
            sentence, and a <p> cannot hold a list. Radix would otherwise nest
            block elements inside its own paragraph.
          */}
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>

          {/*
            Not an AlertDialogAction wrapping the handler: Radix closes the
            dialog on click, and closing before the request answers loses the
            pending state the button is showing. The dialog is closed by the
            caller, when the work is done.
          */}
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            disabled={isPending}
            className={cn(
              destructive &&
                "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700",
            )}
          >
            <span>{confirmLabel}</span>

            {isPending && (
              <span className="ml-2 animate-spin">
                <Loader className="h-4 w-4" />
              </span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { ConfirmDialog };
export type { ConfirmDialogProps };
