// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One request per save.
 *
 * About forty dialogs answered a successful write by calling a second Server
 * Action, `revalidateTagName`. Its tag cleared nothing (the protected tree
 * runs with `fetchCache = "only-no-store"`, there is no Data Cache), but the
 * call made Next re-render the whole page in its answer — layout, `/user/me`,
 * notifications, the page's own fetches — and drop the prefetch cache: a
 * second round trip after every save, queued in the router's one-at-a-time
 * action line. The write action revalidates itself now, so its own answer
 * carries the re-rendered screen; the dialog only refreshes its pickers.
 */
const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => revalidateTag(tag),
  revalidatePath: vi.fn(),
}));
vi.mock("@/actions/cookies", () => ({ getCookies: async () => "token" }));
vi.mock("@/lib/log-action-error", () => ({ logActionError: () => undefined }));

import { handleDeleteShipper } from "@/actions/shipper/delete-shipper";
import { updateDeliveryStatus } from "@/actions/delivery/update-delivery-status";

let answer: { status: number; body: unknown } = { status: 200, body: {} };

beforeEach(() => {
  process.env.HTTP_REQUEST = "http://api.test";
  revalidateTag.mockClear();

  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(answer.body), {
          status: answer.status,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SHIPPER = {
  businessId: "018f0000-0000-7000-8000-00000000000a",
  shipperId: "018f0000-0000-7000-8000-0000000000c1",
};

describe("a write action", () => {
  it("re-renders the screen in its own answer when the API accepts", async () => {
    answer = { status: 200, body: { message: "Embarcador removido." } };

    const result = await handleDeleteShipper(SHIPPER);

    expect(result).toEqual({ successMessage: "Embarcador removido." });
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("update-shipper");
  });

  it("re-renders nothing when the API refuses", async () => {
    answer = {
      status: 409,
      body: { code: "SHIPPER_IN_USE", message: "Embarcador em uso." },
    };

    const result = await handleDeleteShipper(SHIPPER);

    expect(result).toEqual({ deleteShipperError: "Embarcador em uso." });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("does the same for an answer-shaped action (a delivery's status)", async () => {
    answer = { status: 200, body: { message: "Status atualizado." } };

    const result = await updateDeliveryStatus(
      SHIPPER.businessId,
      "018f0000-0000-7000-8000-0000000000d1",
      "DELIVERED",
      {
        reasonId: "018f0000-0000-7000-8000-0000000000e1",
        receivedBy: "Maria Souza",
      },
    );

    expect(result).toMatchObject({ success: true });
    expect(revalidateTag).toHaveBeenCalledWith("update-delivery");
  });
});

/**
 * The second request is gone from the client: no component or hook calls
 * the revalidation action after a write any more. The routes' dialogs and
 * the imports are the exceptions still to move (src/features/routes is
 * reserved for its own change; the imports belong to the import work).
 */
describe("the dialogs after a save", () => {
  const SRC = resolve(__dirname, "../../src");

  const PENDING = new Set([
    "features/routes/add-to-route-dialog/index.tsx",
    "features/routes/cancel-dialog/index.tsx",
    "features/routes/form-dialog/hooks/index.ts",
    "features/routes/row-actions.tsx",
    "features/deliveries/deliveries/import-spreadsheet-dialog/index.tsx",
    "features/deliveries/deliveries/import-xml-dialog/index.tsx",
    "features/deliveries/imports/reverse-dialog/index.tsx",
  ]);

  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) return files(path);

      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });

  it("ask the server for nothing more than the write itself", () => {
    const callers = files(SRC)
      .filter((file) => !file.includes(`${join("src", "actions")}`))
      .filter((file) =>
        /from "@\/actions\/revalidate"/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(SRC, file).replace(/\\/g, "/"))
      .filter((file) => !PENDING.has(file));

    expect(callers).toEqual([]);
  });
});
