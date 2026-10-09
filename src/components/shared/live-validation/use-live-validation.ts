"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ZodTypeAny } from "zod";

import { firstReachableInvalid } from "@/components/ui/use-focus-invalid-on-submit";

import {
  fieldOfElement,
  focusInvalidControl,
  isBlurIntoOwnPopup,
  isBlurToIgnoredControl,
} from "./dom";
import {
  createFieldValidator,
  firstMessage,
  readField,
  sameFieldValue,
  type FieldValidator,
  type FieldValues,
  type Rules,
  type ServerFieldErrors,
} from "./validate";

interface UseLiveValidationOptions<V extends FieldValues> {
  /** The schema the server action parses: the client shows its messages. */
  schema?: ZodTypeAny;

  /** The form's current values, typed as the schema reads them. */
  values: V;

  /**
   * What the client knows and the schema does not: rules between fields or
   * against data already on screen (never a request per keystroke).
   */
  rules?: Rules<V>;

  /** The fields a submit checks, in form order. Default: the schema's and the rules'. */
  fields?: readonly string[];

  /** The action's `fieldErrors`; each one clears once its field is edited. */
  serverErrors?: ServerFieldErrors | null;

  /** Control id per field, when it is not the field's name (FieldShell `htmlFor`). */
  controlIds?: Partial<Record<string, string>>;

  /** A new value starts over (a dialog reopened, a wizard step changed). */
  resetKey?: unknown;

  /**
   * Whether a submit of the enclosing form is checked and stopped while
   * invalid (default). Off for flows that call `validate()` themselves.
   */
  validateOnSubmit?: boolean;
}

interface LiveValidation {
  /**
   * Attach to the form, or to any element inside it that holds the fields.
   * Blur is read from it and the submit from its form.
   */
  ref: (element: HTMLElement | null) => void;

  /** The field's message as FieldShell's `error` / `errorName` takes it. */
  errorOf: (field: string) => string[] | undefined;

  /** The same message as a string, or null. */
  messageOf: (field: string) => string | null;

  /** Marks a field as visited, for controls with no focus of their own (a file drop). */
  touch: (field: string) => void;

  /**
   * Shows every field's message (or those given) and moves focus to the
   * first invalid control. True when all of them are valid.
   */
  validate: (fields?: readonly string[]) => boolean;

  /** Whether every field is valid right now, shown or not. */
  isValid: () => boolean;

  /** Whether one field is valid right now, shown or not (a "done" tick). */
  isFieldValid: (field: string) => boolean;

  /**
   * Whether the field should shake now: only right after a submit (or a
   * `validate()`) that found it invalid, never while typing or on a blur.
   */
  shakeOf: (field: string) => boolean;

  /** Forgets visits and server errors, as on a fresh form. */
  reset: () => void;
}

/** How long a field counts as shaking after an attempt (the tp-shake animation is .45s). */
const SHAKE_MS = 480;

interface ServerState {
  source: ServerFieldErrors | null | undefined;
  /** The values the server answered about. */
  snapshot: FieldValues;
  /** Fields edited since that answer: their server message no longer applies. */
  edited: Set<string>;
}

/**
 * Inline validation, "reward early, punish late" (decision 16.700).
 *
 * - A field is checked once it is left the first time, and from then on at
 *   every change: a message never appears while a person is still typing
 *   their first attempt, and it disappears on the keystroke that fixes it.
 * - A submit checks every field and focuses the first invalid control.
 * - The messages are the schema's own, run on the client: the same trims and
 *   whitespace rules the server action applies, word for word.
 * - The action's field errors still show and each one clears when its field
 *   is edited.
 *
 * Nothing is stored per keystroke: messages are derived from `values` while
 * rendering, each field at most once per render and only when asked for, so
 * typing costs no extra render. The only state is which fields were visited:
 * one render the first time a field is left, and one per submit.
 */
function useLiveValidation<V extends FieldValues>(
  options: UseLiveValidationOptions<V>,
): LiveValidation {
  const { schema, values, rules, fields, serverErrors, controlIds, resetKey } =
    options;

  const [, rerender] = useReducer((count: number) => count + 1, 0);

  const touched = useRef<Set<string>>(new Set());
  const focusPending = useRef<boolean>(false);
  const shaking = useRef<Set<string>>(new Set());
  const shakeTimer = useRef<number | undefined>(undefined);
  const scope = useRef<HTMLElement | null>(null);

  // Starting over is decided during render, so a reopened dialog never
  // flashes the previous attempt's messages.
  const lastResetKey = useRef<unknown>(resetKey);
  if (lastResetKey.current !== resetKey) {
    lastResetKey.current = resetKey;
    touched.current = new Set();
    focusPending.current = false;
  }

  const server = useRef<ServerState>({
    source: serverErrors,
    snapshot: values,
    edited: new Set(),
  });
  if (server.current.source !== serverErrors) {
    server.current = {
      source: serverErrors,
      snapshot: values,
      edited: new Set(),
    };
  }

  const validator: FieldValidator = createFieldValidator({
    schema,
    values,
    rules,
    fields,
  });

  const serverMessageOf = (field: string): string | null => {
    const state = server.current;
    const message = firstMessage(readField(state.source, field));

    if (!message || state.edited.has(field)) return null;

    // Edited once is edited: typing the refused value back does not bring
    // back a message about an answer that is now stale.
    if (
      !sameFieldValue(
        readField(values, field),
        readField(state.snapshot, field),
      )
    ) {
      state.edited.add(field);
      return null;
    }

    return message;
  };

  const messageOf = (field: string): string | null => {
    const client = touched.current.has(field)
      ? validator.messageOf(field)
      : null;

    return client ?? serverMessageOf(field);
  };

  // Handlers attached to the DOM read the latest render through this.
  const latest = useRef({ validator, options, rerender });
  latest.current = { validator, options, rerender };

  const touch = useCallback((field: string) => {
    if (touched.current.has(field)) return;

    touched.current.add(field);
    latest.current.rerender();
  }, []);

  const validate = useCallback((only?: readonly string[]): boolean => {
    const { validator: current } = latest.current;
    const checked = only ?? current.fields;

    for (const field of checked) touched.current.add(field);

    const invalid = checked.filter(
      (field) => current.messageOf(field) !== null,
    );
    const valid = invalid.length === 0;

    if (!valid) {
      focusPending.current = true;

      // The shake answers the attempt; a class that stayed on would not
      // replay on the next one, so it is taken off once the animation ends.
      shaking.current = new Set(invalid);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => {
        shaking.current = new Set();
        latest.current.rerender();
      }, SHAKE_MS);
    }
    latest.current.rerender();

    return valid;
  }, []);

  const isValid = useCallback(
    () =>
      latest.current.validator.fields.every(
        (field) => latest.current.validator.messageOf(field) === null,
      ),
    [],
  );

  useEffect(() => () => window.clearTimeout(shakeTimer.current), []);

  const reset = useCallback(() => {
    touched.current = new Set();
    shaking.current = new Set();
    focusPending.current = false;
    server.current = {
      ...server.current,
      edited: new Set(Object.keys(server.current.source ?? {})),
    };
    latest.current.rerender();
  }, []);

  // Focus after the messages are on screen: the invalid controls carry
  // aria-invalid only once this render has committed.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;

    const root = scope.current?.closest("form") ?? scope.current;
    const candidate: HTMLElement | null = root
      ? firstReachableInvalid(root)
      : null;

    // A radio group's fieldset carries aria-invalid but takes no focus:
    // focusInvalidControl moves into it, and when nothing at all could take
    // focus the first invalid field's control id is tried instead.
    let target: HTMLElement | null = null;
    if (
      candidate &&
      (document.activeElement === candidate || focusInvalidControl(candidate))
    ) {
      target = candidate;
    } else {
      const { validator: current, options: currentOptions } = latest.current;
      const first = current.fields.find(
        (field) => current.messageOf(field) !== null,
      );
      const id = first ? (currentOptions.controlIds?.[first] ?? first) : null;
      const byId = id ? document.getElementById(id) : null;

      if (byId && focusInvalidControl(byId)) target = byId;
    }

    target?.scrollIntoView?.({ block: "center" });
  });

  const detach = useRef<(() => void) | null>(null);

  const ref = useCallback(
    (element: HTMLElement | null) => {
      detach.current?.();
      detach.current = null;
      scope.current = element;

      if (!element) return;

      const doc = element.ownerDocument;

      // The last pointer press, so a click on Cancelar can be told from a
      // keyboard Tab onto it (isBlurToIgnoredControl). A key press forgets it.
      let pressed: Element | null = null;
      const onPointerDown = (event: Event) => {
        pressed = event.target as Element | null;
      };
      const onKeyDown = () => {
        pressed = null;
      };

      const onFocusOut = (event: FocusEvent) => {
        const target = event.target as Element | null;
        const next = event.relatedTarget as Element | null;

        if (
          !target ||
          isBlurIntoOwnPopup(target, next, element) ||
          isBlurToIgnoredControl(next, pressed)
        ) {
          return;
        }

        const { validator: current, options: currentOptions } = latest.current;
        const byId = new Map<string, string>();

        for (const field of current.fields) {
          byId.set(currentOptions.controlIds?.[field] ?? field, field);
        }

        const known = new Set(current.fields);
        const field = fieldOfElement(target, byId, known);
        if (!field) return;

        // Moving inside one field is not leaving it: a combobox's input to
        // its own option list, both under one data-live-field wrapper.
        if (next && fieldOfElement(next, byId, known) === field) return;

        // After the focus has landed, never inside the blur. Between this
        // focusout and the next element's focus the active element is
        // <body>; a render here mutates the dialog, and Radix's FocusScope,
        // seeing a mutation with nothing focused, pulled focus back to the
        // dialog itself: Tab from "E-mail" landed nowhere instead of on "Nome".
        window.setTimeout(() => touch(field), 0);
      };

      // On the form itself, so it runs before React's root listener and a
      // preventDefault here keeps a `<form action>` from being dispatched.
      const form = element.closest("form");

      const onSubmit = (event: Event) => {
        if (latest.current.options.validateOnSubmit === false) return;
        if (!validate()) event.preventDefault();
      };

      element.addEventListener("focusout", onFocusOut);
      form?.addEventListener("submit", onSubmit);
      // Capture on the document: the pressed button may sit outside the
      // scope (a dialog footer) and the press precedes the focusout.
      doc.addEventListener("pointerdown", onPointerDown, true);
      doc.addEventListener("mousedown", onPointerDown, true);
      doc.addEventListener("keydown", onKeyDown, true);

      detach.current = () => {
        element.removeEventListener("focusout", onFocusOut);
        form?.removeEventListener("submit", onSubmit);
        doc.removeEventListener("pointerdown", onPointerDown, true);
        doc.removeEventListener("mousedown", onPointerDown, true);
        doc.removeEventListener("keydown", onKeyDown, true);
      };
    },
    [touch, validate],
  );

  const errorOf = (field: string): string[] | undefined => {
    const message = messageOf(field);
    return message ? [message] : undefined;
  };

  const isFieldValid = (field: string): boolean =>
    validator.messageOf(field) === null;

  const shakeOf = (field: string): boolean =>
    shaking.current.has(field) && messageOf(field) !== null;

  return {
    ref,
    errorOf,
    messageOf,
    touch,
    validate,
    isValid,
    isFieldValid,
    shakeOf,
    reset,
  };
}

export { useLiveValidation };
export type { LiveValidation, UseLiveValidationOptions };
