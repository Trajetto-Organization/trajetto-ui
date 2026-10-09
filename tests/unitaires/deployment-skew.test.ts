import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  isDeploymentSkewError,
  isNewBuild,
  reloadOnce,
} from "@/lib/deployment-skew";

/**
 * A tab opened before a deploy, talking to the build after it.
 *
 * Two ways it broke, both until the person pressed F5 on their own:
 *
 *   - the old page asks the new server for a JavaScript chunk that no longer
 *     exists (the image ships only its own `.next/static`). That is a
 *     ChunkLoadError, and the error boundary's "Tentar novamente" —
 *     `router.refresh()` + `reset()` — asks the same stale client to load the
 *     same missing chunk again;
 *   - the old page calls a Server Action the new build no longer has. Next 14
 *     answers with the not-found page, the action resolves `undefined`, and
 *     every form showed "Erro inesperado" for as long as the tab stayed open.
 *
 * The fix is to notice the build changed and load the page again, once.
 */
function memoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe("isDeploymentSkewError", () => {
  it.each([
    Object.assign(new Error("Loading chunk 123 failed."), {
      name: "ChunkLoadError",
    }),
    new Error("Loading chunk app/dashboard/page failed. (error: …)"),
    new Error("Loading CSS chunk 7 failed"),
    new TypeError("Failed to fetch dynamically imported module: /_next/x.js"),
    new Error(
      'Failed to find Server Action "abc". This request might be from an older or newer deployment.',
    ),
  ])("recognises %s", (error) => {
    expect(isDeploymentSkewError(error)).toBe(true);
  });

  it.each([
    new TypeError("Cannot read properties of undefined (reading 'map')"),
    new Error("Houve um erro ao carregar"),
    "Loading chunk 1 failed",
    null,
    undefined,
  ])("leaves %s to the error screen", (error) => {
    expect(isDeploymentSkewError(error)).toBe(false);
  });
});

describe("reloadOnce", () => {
  it("reloads the first time for a build, and never again for it", () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(reloadOnce(storage, "sha-1", reload)).toBe(true);
    expect(reloadOnce(storage, "sha-1", reload)).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("reloads again for the NEXT build", () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    reloadOnce(storage, "sha-1", reload);
    reloadOnce(storage, "sha-2", reload);

    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload without somewhere to remember it did", () => {
    // Without the mark, a chunk that is really gone would reload forever.
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    } as unknown as Storage;

    const reload = vi.fn();

    expect(reloadOnce(broken, "sha-1", reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});

describe("isNewBuild", () => {
  it("is a different, known build", () => {
    expect(isNewBuild("aaa111", "bbb222")).toBe(true);
    expect(isNewBuild("aaa111", "aaa111")).toBe(false);
  });

  it("never fires when either side does not know its build", () => {
    for (const [mine, served] of [
      [undefined, "bbb"],
      ["aaa", undefined],
      ["dev", "bbb"],
      ["aaa", ""],
      ["aaa", null],
    ] as const) {
      expect(isNewBuild(mine, served)).toBe(false);
    }
  });
});

describe("where it is wired", () => {
  const read = (...path: string[]) =>
    readFileSync(resolve(process.cwd(), ...path), "utf8");

  it("every error boundary reloads on a skew error instead of retrying it", () => {
    // The three boundaries (root, protected, global) all render ErrorSurface.
    const surface = read("src/components/shared/error-surface/index.tsx");

    expect(surface).toContain("isDeploymentSkewError(error)");
    expect(surface).toContain("reloadOnce(");
  });

  it("the root layout watches for a new build", () => {
    expect(read("src/app/layout.tsx")).toContain("<DeploymentSkewGuard");
  });

  it("the image knows which commit it was built from", () => {
    const dockerfile = read("Dockerfile");

    expect(dockerfile).toMatch(/ARG GIT_SHA/);
    expect(dockerfile).toMatch(/ENV NEXT_PUBLIC_BUILD_SHA=\$GIT_SHA/);

    const workflow = read(".github", "workflows", "deploy.yml");
    const buildArgs = workflow.match(/GIT_SHA=\$\{\{ github\.sha \}\}/g) ?? [];

    // The one build, promoted from staging to production (decision 12.2).
    expect(buildArgs.length).toBe(1);
  });

  it("the build id is served outside the middleware", () => {
    // A path with an extension skips the middleware (see its matcher), so
    // polling it never refreshes a session behind the person's back.
    const route = read("src/app/build-id.json/route.ts");

    expect(route).toContain("NEXT_PUBLIC_BUILD_SHA");
    expect(route).toContain("no-store");
  });
});
