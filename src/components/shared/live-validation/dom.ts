/**
 * How live validation reads the DOM: which field a focus event belongs to,
 * and whether leaving a control is really leaving it. Kept apart from the
 * hook so these decisions are tested on plain elements.
 */

/** Put on a button whose press must not count as leaving a field (Cancelar, Voltar). */
const IGNORE_BLUR_ATTRIBUTE = "data-live-validation-ignore";

/** Put on an element when neither its id nor its name says which field it is. */
const FIELD_ATTRIBUTE = "data-live-field";

/**
 * The field a focused element belongs to.
 *
 * Tried in order: an explicit `data-live-field` on it or an ancestor, its id
 * (the FieldShell `htmlFor`, which is also what the label points at), then its
 * `name`. A Radix Select or a date picker is a button carrying the id; the
 * hidden input carrying the name is never focused.
 */
function fieldOfElement(
  element: Element | null,
  fieldByControlId: ReadonlyMap<string, string>,
  fields: ReadonlySet<string>,
): string | null {
  if (!element) return null;

  const explicit = element
    .closest(`[${FIELD_ATTRIBUTE}]`)
    ?.getAttribute(FIELD_ATTRIBUTE);
  if (explicit) return explicit;

  if (element.id && fieldByControlId.has(element.id)) {
    return fieldByControlId.get(element.id)!;
  }

  const name = element.getAttribute("name");
  if (name && fields.has(name)) return name;

  return null;
}

/**
 * Whether focus moved into the control's own popup: a select's list, a date
 * picker's calendar, a combobox's options. Those live in a portal outside the
 * form, so a plain focusout reads as "left the field" the moment the list
 * opens, and a required select would turn red before anything could be
 * picked. Leaving through the popup's own close (Escape, a click elsewhere)
 * brings focus back or away, and THAT blur is the one that counts.
 */
function isBlurIntoOwnPopup(
  target: Element,
  next: Element | null,
  scope: Element,
): boolean {
  if (!next || scope.contains(next)) return false;

  const controls = target.getAttribute("aria-controls");
  if (controls) {
    const popup = target.ownerDocument.getElementById(controls);
    if (popup?.contains(next)) return true;
  }

  // Not `[role="dialog"]`: the form itself usually sits in one, and focus
  // moving to the dialog's own X must still count as leaving the field.
  return Boolean(
    next.closest('[data-radix-popper-content-wrapper], [role="listbox"]'),
  );
}

/**
 * Whether the blur goes to a control marked as not a "leave" (Cancelar,
 * Voltar) BECAUSE it was pressed with a pointer. The exemption exists so a
 * click on Cancelar does not flash a message on the field being left; a
 * keyboard Tab onto the same button is a real "leave" and is checked, or the
 * last field's message would never show before the submit.
 */
function isBlurToIgnoredControl(
  next: Element | null,
  pressed: Element | null,
): boolean {
  const ignored = next?.closest(`[${IGNORE_BLUR_ATTRIBUTE}]`);

  return Boolean(ignored && pressed && ignored.contains(pressed));
}

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), ' +
  'button:not([disabled]), [role="radio"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

/**
 * Focuses an invalid control, or the control inside it when the element
 * carrying `aria-invalid` cannot take focus (a radio group's fieldset): the
 * checked option first, the first option otherwise. True when focus landed.
 */
function focusInvalidControl(target: HTMLElement): boolean {
  const doc = target.ownerDocument;

  const focusInside = (): boolean => {
    const inner =
      target.querySelector<HTMLElement>(
        'input:checked, [role="radio"][aria-checked="true"]',
      ) ?? target.querySelector<HTMLElement>(FOCUSABLE);

    inner?.focus({ preventScroll: true });

    return Boolean(inner) && doc.activeElement === inner;
  };

  // A group never takes the focus itself in a browser: its option does.
  if (
    target.matches('fieldset, [role="radiogroup"], [role="group"]') &&
    focusInside()
  )
    return true;

  target.focus({ preventScroll: true });
  if (doc.activeElement === target) return true;

  return focusInside();
}

export {
  FIELD_ATTRIBUTE,
  IGNORE_BLUR_ATTRIBUTE,
  fieldOfElement,
  focusInvalidControl,
  isBlurIntoOwnPopup,
  isBlurToIgnoredControl,
};
