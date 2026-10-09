import * as React from "react";
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  IGNORE_BLUR_ATTRIBUTE,
  canSubmitForm,
  createFieldValidator,
  isDirtyAgainst,
  useLiveValidation,
  type LiveValidation,
  type Rules,
} from "@/components/shared/live-validation";
import { focusInvalidControl } from "@/components/shared/live-validation/dom";
import { objectSchemaOf } from "@/components/shared/live-validation/validate";
import FormInput from "@/components/shared/custom/form-input";

/**
 * The live validation primitive (decision 16.700): a field is checked once it
 * is left, then at every change; a submit checks everything and focuses the
 * first invalid control; the action's field errors clear once their field is
 * edited; an edit form submits only when something changed.
 */

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { React?: typeof React }).React = React;

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "O e-mail é obrigatório.")
    .email("O e-mail informado não é válido."),
  name: z.string().superRefine((value, ctx) => {
    if (value.trim() === "")
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome é obrigatório.",
      });
    else if (/\s{2,}/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome não deve conter espaços consecutivos.",
      });
    }
  }),
});

const confirmSchema = z
  .object({ password: z.string().min(7, "Mínimo de 7."), confirm: z.string() })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

type Values = Record<string, string>;

interface HarnessProps {
  initial: Values;
  schema: z.ZodTypeAny;
  rules?: Rules<Values>;
  serverErrors?: Record<string, string[]> | null;
  resetKey?: unknown;
  onRender?: () => void;
  onSubmit?: (blocked: boolean) => void;
  onLive?: (live: LiveValidation) => void;
}

let root: Root | null = null;
let host: HTMLElement;

function Harness({
  initial,
  schema: harnessSchema,
  rules,
  serverErrors,
  resetKey,
  onRender,
  onSubmit,
  onLive,
}: HarnessProps) {
  const [values, setValues] = useState<Values>(initial);
  const live = useLiveValidation({
    schema: harnessSchema,
    values,
    rules,
    serverErrors,
    resetKey,
  });

  onRender?.();
  onLive?.(live);

  return createElement(
    "form",
    {
      ref: live.ref,
      noValidate: true,
      // The native listener runs first, on the form: what reaches React is
      // already prevented when the form was invalid.
      onSubmit: (event: React.FormEvent) => {
        onSubmit?.(event.nativeEvent.defaultPrevented);
        event.preventDefault();
      },
    },
    ...Object.keys(initial).map((field) =>
      createElement(FormInput, {
        key: field,
        label: `${field} *`,
        htmlfor: field,
        name: field,
        value: values[field],
        errorName: live.errorOf(field),
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
          const value = event.target.value;
          setValues((current) => ({ ...current, [field]: value }));
        },
      }),
    ),
    createElement(
      "button",
      { type: "button", id: "cancel", [IGNORE_BLUR_ATTRIBUTE]: "" },
      "Cancelar",
    ),
    createElement("button", { type: "submit", id: "send" }, "Criar"),
  );
}

async function mount(props: HarnessProps): Promise<void> {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => root!.render(createElement(Harness, props)));
}

async function rerender(props: HarnessProps): Promise<void> {
  await act(async () => root!.render(createElement(Harness, props)));
}

const input = (field: string) =>
  host.querySelector<HTMLInputElement>(`#${field}`)!;
const errorText = (field: string) =>
  host.querySelector(`#${field}-error`)?.textContent ?? null;

async function type(field: string, value: string): Promise<void> {
  const element = input(field);
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;

  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function leave(
  field: string,
  next: Element | null = null,
): Promise<void> {
  await act(async () => {
    input(field).dispatchEvent(
      new FocusEvent("focusout", { bubbles: true, relatedTarget: next }),
    );
    // The visit is recorded once the focus has landed (a timer).
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function submit(): Promise<void> {
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  // The focus moves in an effect after the messages commit.
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

describe("useLiveValidation: when a message shows", () => {
  it("shows nothing while a field was never left, even when it is invalid", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    await type("email", "ana@");

    expect(errorText("email")).toBeNull();
    expect(input("email").hasAttribute("aria-invalid")).toBe(false);
  });

  it("shows the schema's message, wired to the field, when it is left the first time", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    await type("email", "ana@");
    await leave("email", input("name"));

    expect(errorText("email")).toBe("O e-mail informado não é válido.");
    expect(input("email").getAttribute("aria-invalid")).toBe("true");
    expect(input("email").getAttribute("aria-describedby")).toContain(
      "email-error",
    );
  });

  it("re-checks at every change after the first visit and clears on the keystroke that fixes it", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    await leave("email", input("name"));
    expect(errorText("email")).toBe("O e-mail é obrigatório.");

    await type("email", "ana@");
    expect(errorText("email")).toBe("O e-mail informado não é válido.");

    await type("email", "ana@trajetto.com.br");
    expect(errorText("email")).toBeNull();
    expect(input("email").hasAttribute("aria-invalid")).toBe(false);

    // And it comes back as soon as the value breaks again.
    await type("email", "");
    expect(errorText("email")).toBe("O e-mail é obrigatório.");
  });

  it("uses the server schema's whitespace rules: spaces only is missing, double spaces are refused", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    await type("name", "   ");
    await leave("name");
    expect(errorText("name")).toBe("O nome é obrigatório.");

    await type("name", "Ana  Souza");
    expect(errorText("name")).toBe(
      "O nome não deve conter espaços consecutivos.",
    );

    // trim() in the schema: a trailing space after an e-mail is not an error.
    await type("email", "ana@trajetto.com.br ");
    await leave("email");
    expect(errorText("email")).toBeNull();
  });

  it("does not count opening the field's own popup (a select list in a portal) as leaving it", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    const popup = document.createElement("div");
    popup.id = "email-list";
    popup.setAttribute("role", "listbox");
    const option = document.createElement("div");
    option.tabIndex = -1;
    popup.appendChild(option);
    document.body.appendChild(popup);
    input("email").setAttribute("aria-controls", "email-list");

    await leave("email", option);

    expect(errorText("email")).toBeNull();
  });

  it("does not count a pointer press on a control marked to be ignored (Cancelar) as leaving", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    const cancel = host.querySelector("#cancel")!;
    cancel.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await leave("email", cancel);

    expect(errorText("email")).toBeNull();
  });

  it("counts a keyboard Tab onto Cancelar as leaving, so the last field's message shows", async () => {
    await mount({ initial: { email: "", name: "" }, schema });

    // A stale press elsewhere, then the keyboard: the press is forgotten.
    input("name").dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
    );
    await leave("name", host.querySelector("#cancel"));

    expect(errorText("name")).toBe("O nome é obrigatório.");
  });

  it("costs no extra render per keystroke once a field is visited", async () => {
    let renders = 0;
    await mount({
      initial: { email: "", name: "" },
      schema,
      onRender: () => (renders += 1),
    });

    await leave("email");
    renders = 0;

    await type("email", "a");
    await type("email", "an");
    await type("email", "ana@trajetto.com");

    // One render per keystroke: the value's own. Messages are derived.
    expect(renders).toBe(3);
  });
});

describe("useLiveValidation: submit", () => {
  it("shows every message, stops the submit and focuses the first invalid control", async () => {
    const submits: boolean[] = [];
    await mount({
      initial: { email: "ana@trajetto.com", name: "" },
      schema,
      onSubmit: (blocked) => submits.push(blocked),
    });

    await submit();

    expect(submits).toEqual([true]);
    expect(errorText("email")).toBeNull();
    expect(errorText("name")).toBe("O nome é obrigatório.");
    expect(document.activeElement).toBe(input("name"));
  });

  it("lets a valid form through", async () => {
    const submits: boolean[] = [];
    await mount({
      initial: { email: "ana@trajetto.com", name: "Ana Souza" },
      schema,
      onSubmit: (blocked) => submits.push(blocked),
    });

    await submit();

    expect(submits).toEqual([false]);
    expect(host.querySelector('[aria-invalid="true"]')).toBeNull();
  });
});

describe("useLiveValidation: shake", () => {
  it("shakes a field only right after a failed submit, never on a blur or while typing", async () => {
    let live: LiveValidation | null = null;
    await mount({
      initial: { email: "", name: "" },
      schema,
      onLive: (current) => (live = current),
    });

    await leave("email", input("name"));
    expect(errorText("email")).toBe("O e-mail é obrigatório.");
    expect(live!.shakeOf("email")).toBe(false);

    await submit();
    expect(live!.shakeOf("email")).toBe(true);
    expect(live!.shakeOf("name")).toBe(true);

    // Taken off once the animation is over, so the next attempt replays it.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 520)));
    expect(live!.shakeOf("email")).toBe(false);

    // A field fixed meanwhile does not shake.
    await submit();
    await type("email", "ana@trajetto.com");
    expect(live!.shakeOf("email")).toBe(false);
    expect(live!.shakeOf("name")).toBe(true);
  });
});

describe("useLiveValidation: rules between fields and against loaded data", () => {
  it("runs an object-level refine live: the confirmation follows the password", async () => {
    await mount({
      initial: { password: "", confirm: "" },
      schema: confirmSchema,
    });

    await type("password", "segredo1");
    await type("confirm", "segredo");
    await leave("confirm");
    expect(errorText("confirm")).toBe("As senhas não coincidem");

    // Fixing the OTHER field clears it too.
    await type("password", "segredo");
    expect(errorText("password")).toBeNull();
    await type("password", "segredo1");
    await type("confirm", "segredo1");
    expect(errorText("confirm")).toBeNull();
  });

  it("applies the caller's rule after the field's own schema message", async () => {
    const rules: Rules<Values> = (values) => ({
      name: values.name === "Ana Souza" ? "Este nome já está em uso." : null,
    });
    await mount({ initial: { email: "", name: "" }, schema, rules });

    await leave("name");
    expect(errorText("name")).toBe("O nome é obrigatório.");

    await type("name", "Ana Souza");
    expect(errorText("name")).toBe("Este nome já está em uso.");

    await type("name", "Ana Lima");
    expect(errorText("name")).toBeNull();
  });
});

describe("useLiveValidation: server errors", () => {
  it("shows the action's field error until that field is edited, and not again after", async () => {
    const serverErrors = { email: ["Este e-mail já está cadastrado."] };
    await mount({
      initial: { email: "ana@trajetto.com", name: "Ana Souza" },
      schema,
      serverErrors,
    });

    expect(errorText("email")).toBe("Este e-mail já está cadastrado.");

    await type("email", "ana@trajetto.com.br");
    expect(errorText("email")).toBeNull();

    // Typing the refused value back does not resurrect a stale answer.
    await type("email", "ana@trajetto.com");
    expect(errorText("email")).toBeNull();
  });

  it("shows a new answer from the server again", async () => {
    const props: HarnessProps = {
      initial: { email: "ana@trajetto.com", name: "Ana Souza" },
      schema,
    };
    await mount({
      ...props,
      serverErrors: { email: ["Este e-mail já está cadastrado."] },
    });
    await type("email", "bia@trajetto.com");

    await rerender({
      ...props,
      serverErrors: { email: ["Também cadastrado."] },
    });

    expect(errorText("email")).toBe("Também cadastrado.");
  });
});

describe("useLiveValidation: starting over", () => {
  it("forgets visits when resetKey changes", async () => {
    const props: HarnessProps = {
      initial: { email: "", name: "" },
      schema,
      resetKey: 1,
    };
    await mount(props);
    await leave("email");
    expect(errorText("email")).toBe("O e-mail é obrigatório.");

    await rerender({ ...props, resetKey: 2 });

    expect(errorText("email")).toBeNull();
  });
});

describe("the pure rules", () => {
  it("validates one field with the shape behind a refine, so other fields do not hide it", () => {
    const validator = createFieldValidator({
      schema: confirmSchema,
      values: { password: "123", confirm: "" },
    });

    expect(objectSchemaOf(confirmSchema)).not.toBeNull();
    expect(validator.messageOf("password")).toBe("Mínimo de 7.");
    expect(validator.fields).toEqual(["password", "confirm"]);
  });

  it("enables a create form's submit always, an edit form's only when something changed", () => {
    expect(canSubmitForm({ isEdit: false, isDirty: false })).toBe(true);
    expect(canSubmitForm({ isEdit: true, isDirty: false })).toBe(false);
    expect(canSubmitForm({ isEdit: true, isDirty: true })).toBe(true);
  });

  it("counts '' and an absent value as the same when deciding dirty", () => {
    expect(
      isDirtyAgainst({ notes: "", km: 10 }, { notes: undefined, km: "10" }),
    ).toBe(false);
    expect(isDirtyAgainst({ notes: "" }, { notes: "Pneu careca" })).toBe(true);
  });
});

const sizeSchema = z.object({
  size: z.enum(["small", "large"], {
    errorMap: () => ({ message: "Selecione o tamanho." }),
  }),
  pick: z.string().min(1, "Selecione um item."),
});

function GroupHarness() {
  const [values, setValues] = useState<Values>({ size: "", pick: "" });
  const live = useLiveValidation({ schema: sizeSchema, values });
  const sizeError = live.messageOf("size");

  return createElement(
    "form",
    {
      ref: live.ref,
      noValidate: true,
      onSubmit: (event: React.FormEvent) => event.preventDefault(),
    },
    createElement(
      "fieldset",
      {
        id: "size",
        role: "radiogroup",
        "aria-invalid": sizeError ? true : undefined,
      },
      ...["small", "large"].map((option) =>
        createElement("input", {
          key: option,
          id: `size-${option}`,
          type: "radio",
          name: "size",
          value: option,
          checked: values.size === option,
          onChange: () =>
            setValues((current) => ({ ...current, size: option })),
        }),
      ),
    ),
    // A combobox: its input id is generated, the wrapper names the field.
    createElement(
      "div",
      { "data-live-field": "pick" },
      createElement("input", {
        id: "generated-id",
        "aria-invalid": live.messageOf("pick") ? true : undefined,
      }),
      createElement("div", { id: "pick-list", tabIndex: -1 }, "Opção"),
    ),
    createElement("p", { id: "pick-error" }, live.messageOf("pick") ?? ""),
    createElement("button", { type: "submit", id: "go" }, "Continuar"),
  );
}

describe("useLiveValidation: groups and wrapped controls", () => {
  it("on submit moves focus into an invalid radio group, onto its first option", async () => {
    await mount({ initial: {}, schema });
    await act(async () => root!.render(createElement(GroupHarness)));

    const go = host.querySelector<HTMLButtonElement>("#go")!;
    go.focus();
    await submit();

    expect(host.querySelector("#size")!.getAttribute("aria-invalid")).toBe(
      "true",
    );
    expect(document.activeElement).toBe(host.querySelector("#size-small"));
  });

  it("does not count moving inside one data-live-field wrapper as leaving, but leaving the wrapper counts", async () => {
    await mount({ initial: {}, schema });
    await act(async () => root!.render(createElement(GroupHarness)));

    const control = host.querySelector<HTMLInputElement>("#generated-id")!;
    const focusOut = async (next: Element | null) =>
      act(async () => {
        control.dispatchEvent(
          new FocusEvent("focusout", { bubbles: true, relatedTarget: next }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

    await focusOut(host.querySelector("#pick-list"));
    expect(host.querySelector("#pick-error")!.textContent).toBe("");

    await focusOut(host.querySelector("#go"));
    expect(host.querySelector("#pick-error")!.textContent).toBe(
      "Selecione um item.",
    );
  });
});

describe("focusInvalidControl", () => {
  // happy-dom focuses any element, a fieldset included; a browser does not.
  // The group delegates inward first, so the result is the same in both.
  it("focuses the checked option of a group, not the group, and reports success", () => {
    const group = document.createElement("fieldset");
    group.innerHTML =
      '<input type="radio" name="g" id="a"><input type="radio" name="g" id="b" checked>';
    document.body.appendChild(group);

    expect(focusInvalidControl(group)).toBe(true);
    expect(document.activeElement?.id).toBe("b");
  });
});
