import { useEffect, useRef, useState, type FormEvent } from "react";

import { useLiveValidation } from "@/components/shared/live-validation";

import {
  buildContactMailto,
  contactMessageSchema,
  type ContactField,
  type ContactMessageErrors,
  type ContactMessageInput,
} from "../contact-message";

/** Control ids, in the order the form shows them (first error gets focus). */
const CONTACT_FIELD_IDS: Record<ContactField, string> = {
  firstName: "contact-first-name",
  lastName: "contact-last-name",
  subject: "contact-subject",
  message: "contact-message",
};

/**
 * How long the button says "Abrindo o e-mail...". Nothing is sent from here:
 * the link only hands the message to the mail program, so the feedback just
 * has to outlast the click.
 */
const OPENING_FEEDBACK_MS = 1_500;

const EMPTY_MESSAGE: ContactMessageInput = {
  firstName: "",
  lastName: "",
  subject: "",
  message: "",
};

const CONTACT_FIELDS = Object.keys(CONTACT_FIELD_IDS) as ContactField[];

function useContact() {
  const [values, setValues] = useState<ContactMessageInput>(EMPTY_MESSAGE);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  // The mail program was handed a message: say so, and how to write if nothing opened.
  const [wasOpened, setWasOpened] = useState<boolean>(false);

  const openingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Each field is checked once it is left and then as it changes; the
  // submit checks them all (decision 16.700). The submit is handled below,
  // since it never posts: it hands a link to the mail program.
  const live = useLiveValidation({
    schema: contactMessageSchema,
    values,
    fields: CONTACT_FIELDS,
    controlIds: CONTACT_FIELD_IDS,
    validateOnSubmit: false,
  });

  const errors: ContactMessageErrors = Object.fromEntries(
    CONTACT_FIELDS.map((field) => [field, live.errorOf(field)]),
  );

  useEffect(
    () => () => {
      if (openingTimer.current) clearTimeout(openingTimer.current);
    },
    [],
  );

  const handleChange = (field: ContactField) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setWasOpened(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Shows every message and focuses the first field to fix.
    if (!live.validate()) return;

    const parsed = contactMessageSchema.safeParse(values);
    if (!parsed.success) return;

    setIsOpening(true);
    setWasOpened(true);

    // A timer, not "visibilitychange": on a desktop the mail program opens
    // over a page that stays visible, so that event never came and the
    // button stayed disabled until the person switched tabs.
    if (openingTimer.current) clearTimeout(openingTimer.current);
    openingTimer.current = setTimeout(
      () => setIsOpening(false),
      OPENING_FEEDBACK_MS,
    );

    window.location.assign(buildContactMailto(parsed.data));
  };

  return {
    formRef: live.ref,
    values,
    errors,
    isOpening,
    wasOpened,
    fieldIds: CONTACT_FIELD_IDS,
    // Shake only right after a send attempt, not each time a field turns red.
    shakeOf: live.shakeOf,
    handleChange,
    handleSubmit,
  };
}

export { CONTACT_FIELD_IDS, OPENING_FEEDBACK_MS, useContact };
