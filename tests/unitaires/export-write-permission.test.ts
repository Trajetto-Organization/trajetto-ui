import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Exporting counts as a write (decision 4.2, DLV-RO-3).
 *
 * The page passed `writePermission` to the export button, but the click
 * handler ignored it, and the disabled button said nothing about why. A
 * read-only profile now sees the button disabled with the reason, and the
 * handler refuses on the same rule before the server action is called.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("search=abc"),
}));

const toast = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

import { useExportButton } from "@/app/(protected)/_components/shared/custom/export-button/hooks";
import {
  exportBlocker,
  EXPORT_NEEDS_DATA,
  EXPORT_NEEDS_WRITE,
} from "@/app/(protected)/_components/shared/custom/export-button/export-rules";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

const roots: Root[] = [];

afterEach(async () => {
  while (roots.length) {
    const root = roots.pop()!;
    await act(async () => root.unmount());
  }

  vi.clearAllMocks();
});

async function exportWith(writePermission: boolean | undefined) {
  const exportAction = vi.fn(async () => ({
    success: false,
    message: "falhou",
  }));

  let handle: ((format: "csv" | "excel") => Promise<void>) | null = null;

  const Harness = () => {
    handle = useExportButton({ exportAction, writePermission }).handleExport;

    return null;
  };

  const host = document.createElement("div");
  document.body.appendChild(host);

  const root = createRoot(host);
  roots.push(root);

  await act(async () => root.render(createElement(Harness)));
  await act(async () => handle!("csv"));

  return exportAction;
}

describe("the rule behind the button", () => {
  it("names the missing write permission first, then the empty table", () => {
    expect(
      exportBlocker({ writePermission: false, isMaster: false, hasData: true }),
    ).toBe(EXPORT_NEEDS_WRITE);

    expect(
      exportBlocker({
        writePermission: undefined,
        isMaster: false,
        hasData: false,
      }),
    ).toBe(EXPORT_NEEDS_WRITE);

    expect(
      exportBlocker({ writePermission: true, isMaster: false, hasData: false }),
    ).toBe(EXPORT_NEEDS_DATA);
  });

  it("lets a writer (and the MASTER) export a table with rows", () => {
    expect(
      exportBlocker({ writePermission: true, isMaster: false, hasData: true }),
    ).toBeNull();
    expect(
      exportBlocker({ writePermission: false, isMaster: true, hasData: true }),
    ).toBeNull();
  });
});

describe("the click handler", () => {
  it("refuses a read-only profile before calling the server action", async () => {
    const exportAction = await exportWith(false);

    expect(exportAction).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(EXPORT_NEEDS_WRITE);
  });

  it("calls the action for a writer, with the table's search", async () => {
    const exportAction = await exportWith(true);

    expect(exportAction).toHaveBeenCalledWith("abc", "csv");
  });
});
