"use client";

import { useCallback, useEffect, useRef, type FormEvent } from "react";

/** How long after a submit an error may still arrive (a server action). */
const WATCH_MS = 10_000;

const INVALID = '[aria-invalid="true"]';

/**
 * Whether the element is drawn at all. A field in an inactive tab is
 * `display: none`: focus() does nothing there, and counting it as handled
 * left the visible error unfocused.
 */
function isRendered(element: HTMLElement): boolean {
  const withCheck = element as HTMLElement & {
    checkVisibility?: () => boolean;
  };

  if (typeof withCheck.checkVisibility === "function") {
    return withCheck.checkVisibility();
  }

  // Older engines (and jsdom): walk up looking for a hidden ancestor.
  for (
    let node: HTMLElement | null = element;
    node;
    node = node.parentElement
  ) {
    if (node.hidden || getComputedStyle(node).display === "none") return false;
  }

  return true;
}

/** The first invalid control a person can reach, not a hidden mirror of it. */
function firstReachableInvalid(root: HTMLElement): HTMLElement | null {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(INVALID));

  return (
    candidates.find(
      (element) =>
        !element.closest('[aria-hidden="true"]') &&
        !(element instanceof HTMLInputElement && element.type === "hidden") &&
        !element.hasAttribute("disabled") &&
        isRendered(element),
    ) ?? null
  );
}

function isSubmitButton(node: Node): node is HTMLButtonElement {
  return node instanceof HTMLButtonElement && node.type === "submit";
}

/** A mutation that brings an invalid field in: a flag set or a field mounted. */
function bringsInvalid(record: MutationRecord): boolean {
  if (record.type === "attributes") {
    return (
      record.attributeName === "aria-invalid" &&
      (record.target as Element).getAttribute("aria-invalid") === "true"
    );
  }

  return Array.from(record.addedNodes).some(
    (node) =>
      node instanceof Element &&
      (node.matches(INVALID) || node.querySelector(INVALID) !== null),
  );
}

/**
 * After a submit, moves focus to the first field that came back invalid.
 *
 * A long modal (Criar Novo Tipo, Nova Entrega) is scrolled to its footer when
 * the person presses the main button; the errors appear at the top, out of
 * sight, and the press looked like it did nothing. Most of these forms are
 * server actions: the errors arrive later, as `aria-invalid` on the fields,
 * so this watches the dialog for them for a while instead of checking once.
 * React Hook Form forms already focus their first error; landing on the same
 * field again is harmless.
 *
 * Returns a submit handler for the element that contains the form (bubbling
 * `submit` reaches it from any form inside).
 */
function useFocusInvalidOnSubmit(): (event: FormEvent<HTMLElement>) => void {
  const stopWatching = useRef<(() => void) | null>(null);

  useEffect(() => () => stopWatching.current?.(), []);

  return useCallback((event: FormEvent<HTMLElement>) => {
    stopWatching.current?.();

    const root = event.currentTarget;

    const focusFirstInvalid = (): boolean => {
      const target = firstReachableInvalid(root);

      if (!target) return false;

      if (document.activeElement !== target) {
        target.focus({ preventScroll: true });
        target.scrollIntoView?.({ block: "center" });
      }

      return true;
    };

    // While the submit button is disabled the answer has not arrived: the
    // errors still on screen are the previous submit's. Wait for it to come
    // back, then focus whatever is invalid now.
    let pending = false;

    const observer = new MutationObserver((records) => {
      let settled = false;
      let invalidArrived = false;

      for (const record of records) {
        if (
          record.attributeName === "disabled" &&
          isSubmitButton(record.target)
        ) {
          pending = record.target.disabled;
          settled = !pending;
        } else if (bringsInvalid(record)) {
          invalidArrived = true;
        }
      }

      if (pending) return;

      if (settled) {
        focusFirstInvalid();
        stop();
      } else if (invalidArrived && focusFirstInvalid()) {
        stop();
      }
    });

    const timer = setTimeout(() => stop(), WATCH_MS);

    function stop(): void {
      observer.disconnect();
      clearTimeout(timer);
      stopWatching.current = null;
    }

    // `disabled` too: re-sending the same mistakes leaves `aria-invalid`
    // untouched, and the submit button going pending and back is the only
    // change the answer makes.
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-invalid", "disabled"],
    });

    stopWatching.current = stop;
  }, []);
}

export { useFocusInvalidOnSubmit, firstReachableInvalid };
