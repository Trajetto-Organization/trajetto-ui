"use client";

import { ChevronDown, ChevronsDown, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Bottom padding the message list takes while this button floats over it.
 *
 * The button is 40px tall sitting 16px from the bottom, so 56px keeps the
 * last row — "Mensagens mais recentes" included — clear of it when the list
 * is scrolled to the end.
 */
const MESSAGE_LIST_FAB_INSET_CLASS = "pb-14";

interface JumpToLatestButtonProps {
  /** Live arrivals held while the window sits in the past. */
  heldCount: number;
  isJumping: boolean;
  disabled: boolean;
  onJump: () => void;
}

/**
 * "Ir para a última mensagem", as a round button in the corner.
 *
 * It was a pill centred at the bottom of the pane, and the list ends with a
 * centred "Mensagens mais recentes" button whenever the window is in the
 * past — which is exactly when the pill shows. Scrolled to the end, one sat
 * on the other (DLV-CHAT-1). Now they are apart twice over: this one lives in
 * the right corner, and the list reserves the height it floats in.
 *
 * Its name is the aria-label (and the tooltip), the dot says new messages
 * arrived meanwhile.
 */
const JumpToLatestButton = ({
  heldCount,
  isJumping,
  disabled,
  onJump,
}: JumpToLatestButtonProps): JSX.Element => {
  const newMessages =
    heldCount === 0
      ? ""
      : heldCount === 1
        ? " — 1 mensagem nova"
        : ` — ${heldCount} mensagens novas`;

  const label = `Ir para a última mensagem${newMessages}`;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="pointer-events-auto relative h-10 w-10 rounded-full border
        shadow-md"
        disabled={disabled}
        onClick={onJump}
        aria-label={label}
        title={label}
        data-chat-jump-to-latest=""
      >
        {isJumping ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronsDown className="h-4 w-4" />
        )}

        {heldCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2
            border-background bg-primary"
            aria-hidden="true"
          />
        )}
      </Button>
    </div>
  );
};

interface NewerMessagesButtonProps {
  isLoading: boolean;
  disabled: boolean;
  onLoad: () => void;
}

/**
 * The last row of a window that stops short of the present: walks one page
 * forward. Centred at the end of the list — the corner belongs to the jump.
 */
const NewerMessagesButton = ({
  isLoading,
  disabled,
  onLoad,
}: NewerMessagesButtonProps): JSX.Element => (
  <div className="flex justify-center pt-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 text-xs"
      disabled={disabled}
      onClick={onLoad}
      data-chat-load-newer=""
    >
      {isLoading ? (
        <Loader className="mr-1 h-3 w-3 animate-spin" />
      ) : (
        <ChevronDown className="mr-1 h-3 w-3" />
      )}
      Mensagens mais recentes
    </Button>
  </div>
);

export {
  JumpToLatestButton,
  NewerMessagesButton,
  MESSAGE_LIST_FAB_INSET_CLASS,
};
