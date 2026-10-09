"use client";

import { useEffect, useRef } from "react";

import { leavesPage } from "../../lib/leave-guard";

/**
 * Asks before leaving while `dirty` (decision 14.7, §5.3): a dragged order
 * that was not saved used to vanish on the "Voltar" action or any menu link.
 *
 * Two exits are covered. Closing or reloading the tab gets the browser's own
 * prompt (beforeunload). An in-app link is caught in the capture phase on
 * the document, before Next's Link handler runs on the React root, and only
 * goes ahead if the dispatcher confirms.
 */
function useLeaveGuard(dirty: boolean, message: string): void {
  // Read in the listeners, so they bind once.
  const dirtyRef = useRef<boolean>(dirty);
  const messageRef = useRef<string>(message);

  dirtyRef.current = dirty;
  messageRef.current = message;

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;

      event.preventDefault();
      // Some browsers still need returnValue set to show the prompt.
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (!dirtyRef.current) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href]");

      if (!(anchor instanceof HTMLAnchorElement)) return;

      const leaving = leavesPage(
        event,
        {
          href: anchor.getAttribute("href") ?? "",
          target: anchor.target,
          download: anchor.hasAttribute("download"),
        },
        window.location,
      );

      if (!leaving || window.confirm(messageRef.current)) return;

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
}

export { useLeaveGuard };
