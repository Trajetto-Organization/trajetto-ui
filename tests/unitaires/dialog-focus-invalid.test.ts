import * as React from "react";
import { act, createElement, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A long modal scrolled to its footer showed nothing when the main button was
 * pressed with an empty form: the errors appeared at the top, out of sight
 * (visual sweep, wave 4b — Criar Novo Tipo at 375px and 1440px). After a
 * submit, the dialog now moves focus to the first field that comes back
 * invalid, including errors that arrive later from a server action.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

import {
  Dialog,
  DialogContent,
  DialogScrollContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";

(globalThis as { React?: typeof React }).React = React;

let root: Root | null = null;

async function mount(element: ReactElement): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(element);
  });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

const flush = () =>
  act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

function form(): ReactElement {
  return createElement(
    "form",
    { onSubmit: (event: React.FormEvent) => event.preventDefault() },
    // A hidden mirror (Radix Select's native select) must never get focus.
    createElement("select", {
      "aria-hidden": "true",
      "aria-invalid": undefined,
      id: "mirror",
    }),
    createElement("input", { id: "name", name: "name" }),
    createElement("input", { id: "email", name: "email" }),
    createElement("button", { type: "submit", id: "send" }, "Criar"),
  );
}

for (const [label, Content] of [
  ["DialogContent", DialogContent],
  ["DialogScrollContent", DialogScrollContent],
] as const) {
  describe(label, () => {
    const dialog = () =>
      createElement(
        Dialog,
        { open: true },
        createElement(
          Content as React.ElementType,
          null,
          createElement(
            DialogHeader,
            null,
            createElement(DialogTitle, null, "Criar Novo Tipo"),
            createElement(DialogDescription, null, "descrição"),
          ),
          form(),
        ),
      );

    it("focuses the first invalid field that arrives after submitting", async () => {
      await mount(dialog());

      const send = document.getElementById("send") as HTMLButtonElement;
      const email = document.getElementById("email") as HTMLInputElement;
      const name = document.getElementById("name") as HTMLInputElement;
      const mirror = document.getElementById("mirror") as HTMLSelectElement;

      send.focus();

      await act(async () => {
        send.click();
      });

      // The answer arrives later, as a server action's would.
      mirror.setAttribute("aria-invalid", "true");
      email.setAttribute("aria-invalid", "true");
      name.setAttribute("aria-invalid", "true");

      await flush();

      expect(document.activeElement).toBe(name);
    });

    it("resubmitting with different errors: waits for the answer and focuses the new error", async () => {
      await mount(dialog());

      const send = document.getElementById("send") as HTMLButtonElement;
      const email = document.getElementById("email") as HTMLInputElement;
      const name = document.getElementById("name") as HTMLInputElement;

      // The previous submit's error is still on screen.
      name.setAttribute("aria-invalid", "true");
      send.focus();

      await act(async () => {
        send.click();
      });

      // Pending: the stale error must not take the focus yet.
      send.setAttribute("disabled", "");
      await flush();
      expect(document.activeElement).not.toBe(name);

      // The answer: the name is fine now, the e-mail is not.
      name.removeAttribute("aria-invalid");
      email.setAttribute("aria-invalid", "true");
      send.removeAttribute("disabled");
      await flush();

      expect(document.activeElement).toBe(email);
    });

    it("skips an invalid field that is not rendered (inactive tab)", async () => {
      await mount(dialog());

      const send = document.getElementById("send") as HTMLButtonElement;
      const email = document.getElementById("email") as HTMLInputElement;
      const name = document.getElementById("name") as HTMLInputElement;

      name.style.display = "none";
      send.focus();

      await act(async () => {
        send.click();
      });

      name.setAttribute("aria-invalid", "true");
      email.setAttribute("aria-invalid", "true");
      await flush();

      expect(document.activeElement).toBe(email);
    });

    it("with no error, does not move focus from where it is", async () => {
      await mount(dialog());

      const send = document.getElementById("send") as HTMLButtonElement;

      send.focus();

      await act(async () => {
        send.click();
      });

      document.getElementById("send")!.setAttribute("disabled", "");
      document.getElementById("send")!.removeAttribute("disabled");

      await flush();

      expect(document.activeElement).not.toBe(document.getElementById("name"));
    });
  });
}
