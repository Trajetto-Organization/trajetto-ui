import * as React from "react";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Copiar ID" in every table (spec §5): it copies the FULL id, whatever the
 * table shows, and a refused clipboard reads as a Portuguese sentence.
 *
 * Twenty-two row menus each wrote their own copy, most of them toasting
 * `"Erro ao copiar o ID: " + error` — the browser's raw English
 * DOMException ("NotAllowedError: Write permission denied.") in a Portuguese
 * toast. They now share lib/copy-with-feedback, and a scan keeps it so.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

const toasts = vi.hoisted(() => ({
  success: [] as string[],
  error: [] as string[],
  info: [] as string[],
}));

vi.mock("sonner", () => ({
  toast: {
    success: (message: string) => toasts.success.push(message),
    error: (message: string) => toasts.error.push(message),
    info: (message: string) => toasts.info.push(message),
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  usePathname: () => "/dashboard/control-tower",
}));

// The Radix menu needs pointer events happy-dom does not have; the items and
// what selecting one does are what is proven, so they render flat.
vi.mock("@/components/shared/custom/row-actions", () => ({
  RowActions: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  RowActionSeparator: () => null,
  RowActionItem: ({
    label,
    onSelect,
  }: {
    label: string;
    onSelect: () => void;
  }) =>
    createElement("button", { "data-label": label, onClick: onSelect }, label),
}));

// Dialogs that only open on select, backed by Server Actions.
vi.mock("@/features/deliveries/deliveries/detail-dialog/lazy", () => ({
  DeliveryDetailDialog: () => null,
}));
vi.mock("@/features/deliveries/chat/tickets/occurrence-history-dialog", () => ({
  OccurrenceHistoryDialog: () => null,
}));
vi.mock("@/actions/chat/tickets", () => ({ openTicket: vi.fn() }));
vi.mock("@/features/deliveries/hooks/use-deliveries-business-id", () => ({
  useDeliveriesBusinessId: () => "018f0000-0000-7000-8000-00000000000a",
}));
vi.mock("@/lib/check-multiple-permissions", () => ({
  useCheckMultiplePermissions: () => ({
    hasAllPermissions: true,
    tooltipMessage: "",
  }),
  getPermissionName: () => "Gerenciar Entregas",
}));
vi.mock("@/features/vehicle-type/form-dialog", () => ({
  VehicleTypeFormDialog: () => null,
}));
vi.mock("@/features/vehicle-type/delete-dialog", () => ({
  VehicleTypeDeleteDialog: () => null,
}));

import {
  COPY_FAILED,
  copyWithFeedback,
  type CopyDeps,
} from "@/lib/copy-with-feedback";
import { OccurrenceRowActions } from "@/features/deliveries/occurrences/row-actions";
import { VehicleTypeRowActions } from "@/features/vehicle-type/row-actions";

(globalThis as { React?: typeof React }).React = React;

const OCCURRENCE_ID = "019a2f3c-7d8e-7abc-9def-279d9fb8f0bd";
const DELIVERY_ID = "019a2f3c-0000-7000-8000-00000000de11";

describe("copyWithFeedback", () => {
  function recorder(write: CopyDeps["writeText"]) {
    const said = { success: [] as string[], error: [] as string[] };
    const deps: CopyDeps = {
      writeText: write,
      success: (message) => said.success.push(message),
      error: (message) => said.error.push(message),
      log: () => {},
    };

    return { said, deps };
  }

  it("writes the full value it is given and names it", async () => {
    const written: string[] = [];
    const { said, deps } = recorder(async (value) => {
      written.push(value);
    });

    expect(await copyWithFeedback(OCCURRENCE_ID, "ID", deps)).toBe(true);
    expect(written).toEqual([OCCURRENCE_ID]);
    expect(said.success).toEqual(["ID copiado para a área de transferência!"]);
  });

  it("copies nothing and says nothing for a missing value", async () => {
    const written: string[] = [];
    const { said, deps } = recorder(async (value) => {
      written.push(value);
    });

    expect(await copyWithFeedback(null, "ID do fornecedor", deps)).toBe(false);
    expect(await copyWithFeedback(undefined, "ID", deps)).toBe(false);
    expect(written).toEqual([]);
    expect(said).toEqual({ success: [], error: [] });
  });

  it("says a fixed sentence when the browser refuses, never its error", async () => {
    const { said, deps } = recorder(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError");
    });

    expect(await copyWithFeedback(OCCURRENCE_ID, "ID", deps)).toBe(false);
    expect(said.error).toEqual([COPY_FAILED]);
  });

  it("agrees with a feminine label: Placa copiada, not copiado", async () => {
    const { said, deps } = recorder(async () => {});

    expect(
      await copyWithFeedback("ABC1D23", "Placa", { ...deps, feminine: true }),
    ).toBe(true);
    expect(said.success).toEqual([
      "Placa copiada para a área de transferência!",
    ]);

    // The vehicle menu is the one feminine label among the row menus.
    const menu = readFileSync(
      resolve(__dirname, "../../src/features/vehicle/row-actions.tsx"),
      "utf8",
    );

    expect(menu).toMatch(
      /copyWithFeedback\(vehicle\.license_plate, "Placa", \{\s*feminine: true,?\s*\}\)/,
    );
  });
});

describe("no row menu writes to the clipboard on its own", () => {
  const ROOT = resolve(__dirname, "../..");

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) return sourceFiles(path);

      return /\.(tsx|ts)$/.test(entry.name) ? [path] : [];
    });
  }

  it("every file offering Copiar ID copies through copyWithFeedback", () => {
    // A menu item (`label="Copiar ID…"` / `label: "Copiar ID…"`), plus the
    // kanban card's button, whose text is the label.
    const KANBAN_CARD = resolve(
      ROOT,
      "src/app/(protected)/_components/kanban/card/card-modal/index.tsx",
    );
    const offering = sourceFiles(resolve(ROOT, "src")).filter(
      (path) =>
        path === KANBAN_CARD ||
        /label(?:=|:\s*)["']Copiar ID/.test(readFileSync(path, "utf8")),
    );

    // The tables' menus, the kanban card and the fuel ones: at least these.
    expect(offering.length).toBeGreaterThanOrEqual(25);

    const inline = offering
      .filter((path) =>
        readFileSync(path, "utf8").includes("navigator.clipboard"),
      )
      .map((path) => relative(ROOT, path).split("\\").join("/"));

    // Red before: 22 menus (and the kanban card) had their own copy.
    expect(inline).toEqual([]);

    for (const path of offering) {
      const source = readFileSync(path, "utf8");

      expect(source, path).toContain("copyWithFeedback");
      expect(source, path).not.toContain("Erro ao copiar");
    }
  });
});

describe("the row menus copy the full id the row stands for", () => {
  let root: Root | null = null;
  let host: HTMLElement;
  const written: string[] = [];

  function clipboard(write: (value: string) => Promise<void>): void {
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText: write },
    });
  }

  async function render(element: React.ReactElement): Promise<void> {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root!.render(element));
  }

  async function select(label: string): Promise<void> {
    const item = host.querySelector(
      `[data-label="${label}"]`,
    ) as HTMLButtonElement;

    await act(async () => item.click());
    await act(async () => {
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    toasts.success.length = 0;
    toasts.error.length = 0;
    written.length = 0;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const occurrence = {
    id: OCCURRENCE_ID,
    occurrenceType: { name: "Avaria", blocks_delivery: false },
    delivery: {
      id: DELIVERY_ID,
      code: null,
      recipient_name: "Mercado Central",
    },
  };

  it("Ocorrências: Copiar ID is the occurrence's, Copiar ID da Entrega the delivery's", async () => {
    clipboard(async (value) => {
      written.push(value);
    });

    await render(
      createElement(OccurrenceRowActions, {
        row: { original: occurrence } as never,
      }),
    );

    await select("Copiar ID");
    await select("Copiar ID da Entrega");

    // Whole ids, never the twelve characters the table shows.
    expect(written).toEqual([OCCURRENCE_ID, DELIVERY_ID]);
    expect(toasts.success).toEqual([
      "ID da ocorrência copiado para a área de transferência!",
      "ID da entrega copiado para a área de transferência!",
    ]);
  });

  it("Tipos de veículo: a refused clipboard reads as a sentence, not the DOMException", async () => {
    // Red before: "Erro ao copiar o ID: NotAllowedError: Write permission denied."
    clipboard(async () => {
      throw new DOMException("Write permission denied.", "NotAllowedError");
    });

    await render(
      createElement(VehicleTypeRowActions, {
        row: {
          original: {
            id: OCCURRENCE_ID,
            description: "Truck",
            businessId: "018f0000-0000-7000-8000-00000000000a",
          },
        } as never,
        businessId: "018f0000-0000-7000-8000-00000000000a",
      } as never),
    );

    await select("Copiar ID");

    expect(toasts.error).toEqual([COPY_FAILED]);
    expect(toasts.error.join(" ")).not.toContain("NotAllowedError");
  });
});
