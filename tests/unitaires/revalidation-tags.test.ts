// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => revalidateTag(tag),
  revalidatePath: vi.fn(),
}));

import { revalidateTagName, revalidateTags } from "@/actions/revalidate";
import { MAX_TAGS_PER_CALL, REVALIDATION_TAGS } from "@/lib/revalidation-tags";

/**
 * The revalidation actions, called the way an attacker calls them.
 *
 * Their ids ship in the client bundle, so the argument is whatever the POST
 * body says. Every tag used to be passed straight to `revalidateTag`, and in
 * Next 14's file-system cache each one rewrites the whole tag manifest: a few
 * thousand made-up tags froze the only web replica for tens of seconds and
 * grew the manifest for good.
 */
beforeEach(() => {
  revalidateTag.mockClear();
});

describe("a list of made-up tags", () => {
  it("revalidates nothing, however long", async () => {
    const flood = Array.from({ length: 4000 }, (_, index) => `x-${index}`);

    const answer = await revalidateTags(flood);

    expect(revalidateTag).not.toHaveBeenCalled();
    expect(answer).toEqual([
      { message: "Não foi possível revalidar estes dados." },
    ]);
  });

  it("revalidates nothing when one tag in it is unknown", async () => {
    await revalidateTags(["update-driver", "nao-existe"]);

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("revalidates nothing past the ceiling, even with real tags", async () => {
    const real = Array.from(
      { length: MAX_TAGS_PER_CALL + 1 },
      () => "update-driver",
    );

    await revalidateTags(real);

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["an object", { tag: "update-driver" }],
    ["a number", 42],
    ["null", null],
    ["a nested array", [["update-driver"]]],
  ])("refuses %s", async (_label, input) => {
    await revalidateTags(input as never);
    await revalidateTagName(input as never);

    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("what the app itself sends", () => {
  it("revalidates a known tag once", async () => {
    await revalidateTagName("update-driver");

    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith("update-driver");
  });

  it("revalidates the overview's counters, each once", async () => {
    const counters = [
      "update-entity-count",
      "update-vehicle-status",
      "update-maintenance-stats",
      "update-recent-activity",
      "update-vehicle-by-type",
      "update-maintenance-costs",
      "update-vehicle-count",
      "update-driver-count",
      "update-vehicle-count",
    ];

    await revalidateTags(counters);

    expect(revalidateTag).toHaveBeenCalledTimes(new Set(counters).size);
  });
});

/**
 * Every tag the source uses is on the list.
 *
 * The list is closed, so a new screen that declares a new tag without adding
 * it would have its refresh refused — loudly, but in production. This reads
 * the source the same way the list was built and fails first.
 */
describe("the allowlist", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) return sourceFiles(path);

      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });
  }

  it("covers every tag the app declares or revalidates", () => {
    const used = new Set<string>();

    for (const file of sourceFiles(resolve(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(/tags:\s*\[([\s\S]*?)\]/g)) {
        for (const tag of match[1].matchAll(/"([^"]+)"/g)) used.add(tag[1]);
      }

      for (const match of source.matchAll(
        /(?:revalidateTagName|revalidateTags)\(\s*(\[[\s\S]*?\]|"[^"]*")/g,
      )) {
        for (const tag of match[1].matchAll(/"([^"]+)"/g)) used.add(tag[1]);
      }

      // The delivery screens pick their tag from a table of sources.
      for (const match of source.matchAll(/\btag:\s*"([^"]+)"/g)) {
        used.add(match[1]);
      }
    }

    // Only the leftover Sanity webhook route (src/app/api/sanity-revalidate,
    // dead code the owner deletes with the rest of Sanity, PUB-4) still names
    // these, and never through the actions. Remove both lines with it.
    used.delete("blog");
    used.delete("legal");

    const allowed = new Set<string>(REVALIDATION_TAGS);
    const missing = [...used].filter((tag) => !allowed.has(tag));

    expect(missing).toEqual([]);
  });
});
