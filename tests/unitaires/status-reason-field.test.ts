import { createElement } from "react";

import { describe, expect, it, vi } from "vitest";

import { renderHtml } from "./helpers/render-html";

/**
 * "Motivo da mudança" in the delivery's status change and in Cancelar entrega
 * (decisions 3.3 and 3.4, UI-INPUT-3).
 *
 * The selector was the last hand-built field of those dialogs: the error
 * REPLACED the label, so a refused change showed a red sentence over an
 * unnamed select, and nothing told a screen reader the field was invalid or
 * required. Through the shared shell the label stays, the message goes under
 * the control and the control carries the wiring.
 */
vi.mock(
  "@/app/(protected)/_components/shared/selectors/status-reason-selector/hooks",
  () => ({
    useStatusReasons: () => ({
      reasons: [
        { id: "r1", name: "Cliente ausente", description: "Ninguém atendeu." },
        { id: "r2", name: "Endereço errado", description: null },
      ],
      isLoading: false,
      hasError: false,
      errorMessage: null,
      refetch: () => undefined,
    }),
  }),
);

import { StatusReasonSelector } from "@/app/(protected)/_components/shared/selectors/status-reason-selector";

function render(props: { error?: string; reasonId?: string; note?: string }) {
  return renderHtml(
    createElement(StatusReasonSelector, {
      businessId: "b1",
      reasonId: props.reasonId ?? "",
      onReasonChange: () => undefined,
      note: props.note ?? "",
      onNoteChange: () => undefined,
      error: props.error,
    }),
  );
}

describe("the status reason field", () => {
  it("keeps its label when it is in error, with the message under it", () => {
    const html = render({ error: "Escolha o motivo da mudança." });

    expect(html).toContain("Motivo da mudança");
    expect(html).toMatch(/role="alert"[^>]*>Escolha o motivo da mudança\.</);

    // The label comes first, the message after the control.
    expect(html.indexOf("Motivo da mudança")).toBeLessThan(
      html.indexOf("Escolha o motivo da mudança."),
    );
  });

  it("marks the select invalid and required, pointing at the message", () => {
    const html = render({ error: "Escolha o motivo da mudança." });

    const trigger = /<button[^>]*role="combobox"[^>]*>/.exec(html)?.[0] ?? "";

    expect(trigger).toContain('aria-invalid="true"');
    expect(trigger).toContain('aria-required="true"');
    expect(trigger).toMatch(/aria-describedby="[^"]*-error/);
  });

  it("is required and says so without an error too", () => {
    const html = render({});

    const trigger = /<button[^>]*role="combobox"[^>]*>/.exec(html)?.[0] ?? "";

    expect(trigger).toContain('aria-required="true"');
    expect(trigger).not.toContain("aria-invalid");
  });

  it("marks the note optional in the product's spelling", () => {
    const html = render({});

    expect(html).toContain("Anotação (opcional)");
  });

  it("describes the chosen reason under the select", () => {
    const html = render({ reasonId: "r1" });

    expect(html).toContain("Ninguém atendeu.");
  });
});
