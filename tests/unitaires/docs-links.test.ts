import { describe, expect, it } from "vitest";

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Links, anchors and badges of README.md and docs/*.md (spec §11.1).
 *
 * GitHub fails a broken anchor silently: the reader lands at the top of the
 * page. Anchors follow GitHub's slug rules — the heading's rendered text,
 * lower-cased, with everything but letters, marks, digits, spaces, `_` and
 * `-` removed, spaces turned into `-`, and `-1`, `-2`… on repeats. Links into
 * the sibling repositories are checked only when they sit next to this one
 * (the same skip the other cross-repo tests use). The API keeps the fuller
 * version of this check, tour included (trajetto-api
 * tests/unitaires/docs/architecture-docs.test.ts).
 */

const ROOT = process.cwd();
const ORG_BLOB =
  /^https:\/\/github\.com\/Trajetto-Organization\/(trajetto-api|trajetto-ui|trajetto-mobile)\/blob\/staging\/([^#?]+)(?:#(.*))?$/;

function read(path: string): string {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function repoRoot(repo: string): string | null {
  if (repo === "trajetto-ui") return ROOT;

  const sibling = resolve(ROOT, "..", repo);

  return existsSync(sibling) ? sibling : null;
}

/** Prose lines (fenced code blanked out) and the Mermaid blocks. */
function parse(text: string): { prose: string[]; mermaid: string[][] } {
  const prose: string[] = [];
  const mermaid: string[][] = [];
  let block: string[] | null = null;
  let lang = "";

  for (const line of text.split("\n")) {
    const fence = line.match(/^\s*```\s*([\w-]*)/);

    if (block) {
      if (fence && !fence[1]) {
        if (lang === "mermaid") mermaid.push(block);
        block = null;
      } else {
        block.push(line);
      }

      prose.push("");
      continue;
    }

    if (fence) {
      block = [];
      lang = fence[1];
      prose.push("");
      continue;
    }

    prose.push(line);
  }

  return { prose, mermaid };
}

function githubSlug(heading: string): string {
  return heading
    .replace(/<[^>]+>/g, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split("`")
    .map((part, index) => (index % 2 === 1 ? part : part.replace(/\*/g, "")))
    .join("")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N} _-]/gu, "")
    .replace(/ /g, "-");
}

function anchorsOf(path: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();

  for (const line of parse(read(path)).prose) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);

    if (!heading) continue;

    const base = githubSlug(heading[1]);
    const count = seen.get(base);

    seen.set(base, (count ?? -1) + 1);
    anchors.add(count === undefined ? base : `${base}-${count + 1}`);
  }

  return anchors;
}

/** `[text](target)` targets, with balanced parentheses (route groups). */
function links(line: string): string[] {
  const text = line.replace(/`[^`]*`/g, "");
  const targets: string[] = [];
  let from = 0;

  while (true) {
    const start = text.indexOf("](", from);

    if (start < 0) break;

    let depth = 1;
    let end = start + 2;

    while (end < text.length && depth > 0) {
      if (text[end] === "(") depth += 1;
      if (text[end] === ")") depth -= 1;
      end += 1;
    }

    const target = text
      .slice(start + 2, end - 1)
      .trim()
      .split(/\s+/)[0];

    if (target) targets.push(target);
    from = end;
  }

  return targets;
}

function broken(from: string, target: string): string | null {
  let file: string | null;
  let anchor: string | null;
  const blob = target.match(ORG_BLOB);

  if (blob) {
    const root = repoRoot(blob[1]);

    if (!root) return null;

    file = join(root, decodeURIComponent(blob[2]));
    anchor = blob[3] ?? null;
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
    return null;
  } else {
    const [path, hash] = target.split("#", 2);

    file = path
      ? join(ROOT, dirname(from), decodeURIComponent(path))
      : join(ROOT, from);
    anchor = hash ?? null;
  }

  if (!existsSync(file)) return "missing file";
  if (anchor && file.endsWith(".md")) {
    const wanted = decodeURIComponent(anchor);

    if (!anchorsOf(file).has(wanted)) return `missing anchor #${wanted}`;
  }

  return null;
}

const FILES = [
  "README.md",
  ...readdirSync(join(ROOT, "docs"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs/${name}`),
];

describe("links and anchors in README.md and docs/*.md", () => {
  it("checks a real number of links and catches a broken anchor", () => {
    const total = FILES.flatMap((file) =>
      parse(read(join(ROOT, file))).prose.flatMap(links),
    );

    expect(total.length).toBeGreaterThan(50);
    expect(
      broken("README.md", "docs/arquitetura.md#fluxo-de-dados"),
    ).toBeNull();
    expect(broken("README.md", "docs/arquitetura.md#não-existe")).toMatch(
      /anchor/,
    );
  });

  it.each(FILES)(
    "every link, #anchor and Mermaid click resolves in %s",
    (file) => {
      const { prose, mermaid } = parse(read(join(ROOT, file)));
      const problems: string[] = [];

      prose.forEach((line, index) => {
        for (const target of links(line)) {
          const reason = broken(file, target);

          if (reason) problems.push(`${index + 1}: ${target} (${reason})`);
        }
      });

      for (const block of mermaid) {
        for (const line of block) {
          const click = line.match(/^\s*click\s+\w+\s+(?:href\s+)?"([^"]+)"/);
          const reason = click ? broken(file, click[1]) : null;

          if (reason) problems.push(`click ${click?.[1]} (${reason})`);
        }
      }

      expect(problems).toEqual([]);
    },
  );
});

/** Every version yarn.lock resolved for a package name. */
function lockVersions(name: string): string[] {
  const lock = read(join(ROOT, "yarn.lock"));

  return lock
    .split("\n\n")
    .filter((block) =>
      (block.split("\n")[0] ?? "")
        .replace(/:$/, "")
        .split(/,\s*/)
        .some((spec) => {
          const clean = spec.replace(/^"|"$/g, "");

          return clean.slice(0, clean.lastIndexOf("@")) === name;
        }),
    )
    .map((block) => block.match(/\n\s+version "([^"]+)"/)?.[1] ?? "")
    .filter(Boolean);
}

describe("the README badges name what the web really runs", () => {
  const readme = read(join(ROOT, "README.md"));
  const dockerfile = read(join(ROOT, "Dockerfile"));
  const badges = [
    ...readme.matchAll(/img\.shields\.io\/badge\/([^"?)\s]+)/g),
  ].map((match) => {
    const fields = match[1]
      .replace(/--/g, "\u0000")
      .split("-")
      .map((field) =>
        decodeURIComponent(field.replace(/\u0000/g, "-").replace(/_/g, " ")),
      );

    return { label: fields[0], version: fields.length > 2 ? fields[1] : "" };
  });

  const SOURCES: Record<string, string[]> = {
    "Next.js": lockVersions("next"),
    React: lockVersions("react"),
    TypeScript: lockVersions("typescript"),
    "Node.js": [dockerfile.match(/FROM node:(\d+\.\d+\.\d+)/)?.[1] ?? ""],
    "Tailwind CSS": lockVersions("tailwindcss"),
    "React Query": lockVersions("react-query"),
    Zod: lockVersions("zod"),
    "Socket.IO": lockVersions("socket.io-client"),
    Leaflet: lockVersions("leaflet"),
    MDX: lockVersions("@mdx-js/mdx"),
    Vitest: lockVersions("vitest"),
    Playwright: lockVersions("@playwright/test"),
    Alpine: [dockerfile.match(/FROM alpine:(\d+\.\d+\.\d+)/)?.[1] ?? ""],
  };

  it("never names a technology the web does not use", () => {
    const labels = badges.map((badge) => badge.label.toLowerCase());

    for (const gone of ["sanity", "framer", "rabbitmq", "anthropic"]) {
      expect(labels.some((label) => label.includes(gone))).toBe(false);
    }
  });

  it.each(Object.keys(SOURCES))(
    "pins %s to a version the repository resolves",
    (label) => {
      const badge = badges.find((b) => b.label === label);

      expect(badge, `badge ${label}`).toBeDefined();
      expect(
        SOURCES[label].filter(Boolean).length,
        `source of ${label}`,
      ).toBeGreaterThan(0);
      expect(
        SOURCES[label].some((version) =>
          `${version}.`.startsWith(`${badge?.version}.`),
        ),
      ).toBe(true);
    },
  );
});
