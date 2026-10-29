"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "./scroll-area";
import {
  DialogLayoutContext,
  dialogFooterClassName,
  dialogFooterLayoutFor,
  headerJustifyClass,
  type DialogFooterLayout,
} from "./dialog-layout";
import { useFocusInvalidOnSubmit } from "./use-focus-invalid-on-submit";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  /**
   * Opt back into closing on a click beside the modal.
   *
   * Off by default (decision 3.2): ESC, the X and Cancelar close a modal; a
   * stray click on the page behind is the one gesture nobody makes on
   * purpose, and it used to erase a half-filled form with no undo. This used
   * to be ninety-two copies of `onInteractOutside={e => e.preventDefault()}`,
   * and every new dialog that forgot the line lost its content to a click.
   */
  closeOnOutsideClick?: boolean;
};

/**
 * The outside-interaction handler every content shares: the caller's own
 * handler still runs, then the dismissal is refused unless opted into.
 */
function useOutsideGuard(
  closeOnOutsideClick: boolean,
  onInteractOutside: DialogContentProps["onInteractOutside"],
): NonNullable<DialogContentProps["onInteractOutside"]> {
  return React.useCallback(
    (event) => {
      onInteractOutside?.(event);

      if (!closeOnOutsideClick) event.preventDefault();
    },
    [closeOnOutsideClick, onInteractOutside],
  );
}

/**
 * The X. `focus-visible` rather than `focus`: Radix focuses the first
 * tabbable element on open, and in a read-only dialog that is this button —
 * so Detalhes da Rota opened with a ring around the X that nobody had put
 * there with a keyboard.
 */
const DialogCloseButton = (): JSX.Element => (
  <DialogPrimitive.Close
    className="absolute right-4 top-4 z-10 rounded-sm opacity-70
    ring-offset-background transition-opacity hover:opacity-100
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    focus-visible:ring-offset-2 disabled:pointer-events-none
    data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
  >
    <X className="h-4 w-4" aria-hidden="true" />
    <span className="sr-only">Fechar</span>
  </DialogPrimitive.Close>
);

/**
 * Shared by both contents. `grid-cols-[minmax(0,1fr)]` is what stops sideways
 * scrolling: without a column definition the implicit track is `auto`, whose
 * minimum is the widest child's min-content — so one `truncate` line (a
 * recipient name, a file name) widened the modal past its own edge.
 */
const CONTENT_BASE =
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg grid-cols-[minmax(0,1fr)] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      closeOnOutsideClick = false,
      onInteractOutside,
      onSubmitCapture,
      ...props
    },
    ref,
  ) => {
    const focusInvalid = useFocusInvalidOnSubmit();

    const guard = useOutsideGuard(closeOnOutsideClick, onInteractOutside);

    const layout = React.useMemo(
      () => ({ footer: dialogFooterLayoutFor(className) }),
      [className],
    );

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            CONTENT_BASE,
            "gap-4 overflow-x-hidden p-6 [&>*]:min-w-0",
            className,
          )}
          onInteractOutside={guard}
          onSubmitCapture={(event) => {
            onSubmitCapture?.(event);
            focusInvalid(event);
          }}
          {...props}
        >
          <DialogLayoutContext.Provider value={layout}>
            {children}
          </DialogLayoutContext.Provider>
          <DialogCloseButton />
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogScrollContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps & {
    children: React.ReactNode;
  }
>(
  (
    {
      className,
      children,
      closeOnOutsideClick = false,
      onInteractOutside,
      onSubmitCapture,
      ...props
    },
    ref,
  ) => {
    const focusInvalid = useFocusInvalidOnSubmit();

    // Separate header from rest of content
    const [header, ...rest] = React.Children.toArray(children);

    const guard = useOutsideGuard(closeOnOutsideClick, onInteractOutside);

    const layout = React.useMemo(
      () => ({ footer: dialogFooterLayoutFor(className) }),
      [className],
    );

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            CONTENT_BASE,
            "max-h-[90vh]",
            className,
            /*
              Last, so it wins over the `overflow-y-auto` sixty callers pass:
              that value also turns `overflow-x` into `auto`, which is where
              the native horizontal bar at the bottom of Detalhes da Entrega
              came from. The body below is what scrolls.
            */
            "overflow-hidden",
          )}
          style={{
            gridTemplateRows: "auto 1fr",
          }}
          onInteractOutside={guard}
          onSubmitCapture={(event) => {
            onSubmitCapture?.(event);
            focusInvalid(event);
          }}
          {...props}
        >
          {/*
            Fixed header. The side padding is symmetric below `sm`, where the
            title is centred, so it never runs under the X; from `sm` the
            title is left-aligned and only the right side makes room.
          */}
          <div className="min-w-0 px-10 py-5 shadow-sm sm:pl-6 sm:pr-12">
            {header}
          </div>

          {/*
            Scrollable body. Radix wraps the content in `display: table`,
            which grows to the content's min-content: `truncate` never
            truncated and a 44-digit NF-e key was cut off at the right edge.
            `!block` restores normal width.
          */}
          <ScrollArea
            className="min-w-0 overflow-hidden [&>[data-radix-scroll-area-viewport]>div]:!block"
            style={{
              touchAction: "pan-y",
              overscrollBehavior: "contain",
            }}
          >
            {/*
              A default gap between loose children. Cancelar Rota passes a
              field, a help line and a footer loose, and they were glued.

              The specificity is exactly one type selector: `html :where(…)`.
              Zero was not enough, because preflight's `p, h1…, button {
              margin: 0 }` is one type selector too and won, so the help
              line stayed glued while the footer moved. At one type
              selector, the rule beats preflight (it comes later) and still
              loses to any class, so a child's own `mt-*` keeps deciding.
            */}
            <div className="min-w-0 px-6 pb-6 pt-4 [html_:where(&>*+*)]:mt-4">
              <DialogLayoutContext.Provider value={layout}>
                {rest}
              </DialogLayoutContext.Provider>
            </div>
          </ScrollArea>

          <DialogCloseButton />
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
DialogScrollContent.displayName = "DialogScrollContent";

/**
 * Title and description, centred below `sm` and left-aligned from there.
 *
 * `items-center` and not only `text-center`: a title that is a flex row (an
 * icon, a badge) ignores `text-align`, so "Detalhes da Entrega [Entregue]"
 * stayed on the left under a centred description. `max-w-full` keeps a
 * `truncate` child from growing past the header while it is centred; from
 * `sm` the children stretch again, exactly as before.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // A bullet list stays left-aligned: centred lines under bullets pinned
      // to the edge read as ragged noise (Deletar Motorista at 375px).
      "flex min-w-0 flex-col items-center gap-1.5 text-center sm:items-stretch sm:text-left [&>*]:max-w-full [&_ol]:self-stretch [&_ol]:text-left [&_ul]:self-stretch [&_ul]:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/** `gap` instead of `space-x`: the stacked phone layout had no gap at all. */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

interface DialogFormFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Overrides what the dialog's width implies. Only for a footer that is not
   * the dialog's own actions (e.g. a nested panel).
   */
  layout?: DialogFooterLayout;
}

/**
 * Cancelar + main action, laid out by the modal's width (decision 3.2).
 *
 * Put Cancelar first and the main action last: in `fill` they share the row
 * left to right, in `end` the main action is the rightmost on a desk and the
 * top one on a phone.
 */
const DialogFormFooter = ({
  layout,
  className,
  ...props
}: DialogFormFooterProps) => {
  const context = React.useContext(DialogLayoutContext);
  const resolved = layout ?? context.footer;

  return (
    <div
      data-dialog-footer={resolved}
      className={cn(dialogFooterClassName(resolved), className)}
      {...props}
    />
  );
};
DialogFormFooter.displayName = "DialogFormFooter";

/**
 * `justify-center` for titles a caller made `flex` (icon + text + badge):
 * when such a title fills the header, text alignment does not move its items.
 */
const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      headerJustifyClass(className),
      className,
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground",
      headerJustifyClass(className),
      className,
    )}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogScrollContent,
  DialogHeader,
  DialogFooter,
  DialogFormFooter,
  DialogTitle,
  DialogDescription,
};
export type { DialogContentProps, DialogFormFooterProps };
