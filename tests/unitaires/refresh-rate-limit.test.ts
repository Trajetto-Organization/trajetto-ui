import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * Every "Atualizar" in the product, and whether it is actually limited.
 *
 * Thirty-nine tables refresh through `DataTableRevalidate`: three presses in
 * thirty seconds and the button locks for fifteen, counting down on its own
 * face. Five panels had their own `<Button onClick={() => refetch()}>` with no
 * limit of any kind — the control tower, and all four tabs of Integrações.
 *
 * Those five are the heaviest reads the product has: a map of every vehicle
 * position, a webhook delivery log, an hourly aggregate over API usage. So the
 * rule was enforced everywhere it was cheap and absent everywhere it was
 * expensive, which is exactly backwards, and nobody would notice because each
 * button looks like the next one.
 *
 * Read as source text on purpose. What is being checked is a property of the
 * WHOLE repository — including the file somebody adds next week — and no
 * rendered test can ask that question.
 */
const SOURCE = resolve(__dirname, "../../src");

/** The components that own the limit. Everything else must go through them. */
const RATE_LIMITED = [
  "src/app/(protected)/_components/shared/tanstack-table/data-table-revalidate/index.tsx",
  "src/app/(protected)/_components/shared/revalidate-button-ui/index.tsx",
  "src/components/shared/custom/refresh-button/index.tsx",
  "src/app/(protected)/_components/kanban/revalidate-button/index.tsx",
];

function tsxFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      found.push(...tsxFiles(path));
      continue;
    }

    if (path.endsWith(".tsx") || path.endsWith(".ts")) found.push(path);
  }

  return found;
}

const FILES = tsxFiles(SOURCE).map((path) => ({
  path,
  rel: relative(resolve(__dirname, "../.."), path).split("\\").join("/"),
  source: readFileSync(path, "utf8"),
}));

/** A plain button wired straight to a refetch. */
const RAW_REFRESH = /onClick=\{\(\)\s*=>\s*(?:void\s+)?refetch\(\)\}/g;

/**
 * The button around a match, from its opening tag to its close.
 *
 * Needed because the answer depends on what the button SAYS. A control
 * labelled "Atualizar" is a refresh and must be limited; one labelled "Tentar
 * novamente" is an error retry, which exists only while a failure is on
 * screen — and locking the single way out of an error for fifteen seconds is
 * worse than the traffic it would save.
 */
function buttonAround(source: string, at: number): string {
  const open = source.lastIndexOf("<Button", at);

  if (open === -1) return source.slice(Math.max(0, at - 200), at + 200);

  const close = source.indexOf("</Button>", at);

  return source.slice(open, close === -1 ? at + 200 : close);
}

const NAMED_REFRESH = /Atualizar|Revalidar/;

describe("the scan itself", () => {
  it("is reading the product", () => {
    expect(FILES.length).toBeGreaterThan(200);

    // And the shared components it exempts really exist, or the allow-list is
    // quietly excusing nothing while the rule below passes over an empty set.
    for (const rel of RATE_LIMITED) {
      expect(
        FILES.some((file) => file.rel === rel),
        `componente compartilhado não encontrado: ${rel}`,
      ).toBe(true);
    }
  });

  it("still finds the retry buttons it means to exempt", () => {
    /**
     * The exemption has to be exercised, or it is indistinguishable from a
     * rule that matches nothing. These are the "Tentar novamente" controls
     * inside error states, and there are several.
     */
    const retries = FILES.flatMap((file) =>
      [...file.source.matchAll(RAW_REFRESH)]
        .map((match) => buttonAround(file.source, match.index ?? 0))
        .filter((button) => !NAMED_REFRESH.test(button)),
    );

    expect(retries.length).toBeGreaterThan(3);
  });
});

describe("no refresh button bypasses the limit", () => {
  it("has no Atualizar wired straight to a refetch", () => {
    const offenders = FILES.filter((file) => {
      if (RATE_LIMITED.includes(file.rel)) return false;

      return [...file.source.matchAll(RAW_REFRESH)].some((match) =>
        NAMED_REFRESH.test(buttonAround(file.source, match.index ?? 0)),
      );
    }).map((file) => file.rel);

    /*
      The five that were: the control tower and all four tabs of Integrações.
      They hit the heaviest reads the product has — a map of every vehicle
      position, a webhook delivery log, an hourly aggregate over API usage —
      while thirty-nine cheap tables were the ones being limited.
    */
    expect(
      offenders,
      `botões de atualizar sem rate limit: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});

/** Every rate-limit configuration written anywhere in the product. */
const CONFIGS = FILES.flatMap((file) =>
  [
    ...file.source.matchAll(
      /storageKey:\s*"([^"]+)"[\s\S]{0,200}?maxClicks:\s*(\d+)[\s\S]{0,80}?timeWindowMs:\s*(\d+)[\s\S]{0,80}?cooldownTimeMs:\s*(\d+)/g,
    ),
  ].map((match) => ({
    file: file.rel,
    storageKey: match[1],
    maxClicks: Number(match[2]),
    timeWindowMs: Number(match[3]),
    cooldownTimeMs: Number(match[4]),
  })),
).concat(
  FILES.flatMap((file) =>
    [
      ...file.source.matchAll(
        /maxClicks:\s*(\d+)[\s\S]{0,80}?timeWindowMs:\s*(\d+)[\s\S]{0,80}?cooldownTimeMs:\s*(\d+)[\s\S]{0,200}?storageKey:\s*"([^"]+)"/g,
      ),
    ].map((match) => ({
      file: file.rel,
      storageKey: match[4],
      maxClicks: Number(match[1]),
      timeWindowMs: Number(match[2]),
      cooldownTimeMs: Number(match[3]),
    })),
  ),
);

describe("and the limit is the same limit everywhere", () => {
  it("found the configurations", () => {
    // A floor for the scan itself, not a quota: the admin/dashboard copies
    // were merged into one screen per entity (decision 8.7), which took the
    // count from 39 to 22 on 29/09/2026 without losing a single button.
    expect(CONFIGS.length).toBeGreaterThan(20);
  });

  it.each(CONFIGS.map((config) => [config.storageKey, config] as const))(
    "%s",
    (_key, config) => {
      /**
       * Three presses in thirty seconds, then fifteen locked.
       *
       * Not a number pulled out of the air: it is what the product already
       * does on thirty-nine screens, and a page that waits ten seconds while
       * its neighbour waits fifteen teaches the user that the wait is
       * arbitrary.
       */
      expect(config.maxClicks, `${config.file}: maxClicks`).toBe(3);
      expect(config.timeWindowMs, `${config.file}: timeWindowMs`).toBe(30_000);
      expect(config.cooldownTimeMs, `${config.file}: cooldownTimeMs`).toBe(
        15_000,
      );
    },
  );
});

describe("and no two screens share a cooldown", () => {
  /**
   * One exception, written down rather than excused by loosening the rule.
   *
   * The Kanban button declares its key as a default AND receives the same one
   * from the board that renders it. One control, named twice.
   */
  const ALLOWED_TWICE = new Set(["kanban-revalidation"]);

  it("every storage key belongs to exactly one control", () => {
    const seen = new Map<string, string[]>();

    for (const config of CONFIGS) {
      seen.set(config.storageKey, [
        ...(seen.get(config.storageKey) ?? []),
        config.file,
      ]);
    }

    const collisions = [...seen.entries()]
      .filter(
        ([key, files]) => new Set(files).size > 1 && !ALLOWED_TWICE.has(key),
      )
      .map(([key, files]) => `${key} → ${[...new Set(files)].join(" + ")}`);

    /*
      A shared key is not cosmetic: the cooldown lives in `localStorage` under
      it, so two screens sharing one means pressing Atualizar on Veículos locks
      the button on Motoristas, for fifteen seconds, with no explanation.
    */
    expect(
      collisions,
      `telas diferentes dividindo o mesmo cooldown: ${collisions.join(" ; ")}`,
    ).toEqual([]);
  });
});

describe("and a retry is called the same thing everywhere", () => {
  it("has one wording, not three", () => {
    /**
     * The product had "Tentar novamente", "Tentar de novo", "Tentar
     * Novamente" and — on the notifications panel — "Revalidar Notificações",
     * which is the vocabulary of a REFRESH on a control that is a retry.
     *
     * That last one is why this rule sits in this file: the label is what
     * decides whether the rate limit applies, so a retry wearing the refresh
     * word is both a consistency defect and a hole in the rule above.
     */
    const offenders = FILES.filter((file) =>
      /Tentar de novo|Tentar Novamente|Revalidar Notifica/.test(file.source),
    ).map((file) => file.rel);

    expect(
      offenders,
      `outras grafias de "Tentar novamente": ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("and the wording it standardised on is actually used", () => {
    // Without this the rule above passes over a product that says nothing at
    // all, which is not what was asked for.
    const users = FILES.filter((file) =>
      file.source.includes("Tentar novamente"),
    );

    expect(users.length).toBeGreaterThan(8);
  });
});
