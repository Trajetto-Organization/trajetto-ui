// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The Cookie Policy against the code, in both directions: a cookie the code
 * sets and the policy omits is a broken promise; a cookie the policy lists
 * and the code never sets is a false statement.
 *
 * Only the ways of touching a cookie listed below are recognised. A new way
 * needs its pattern and a case in "the ways of writing a cookie".
 */
const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");
const POLICY = resolve(SRC, "content", "legal", "cookies.mdx");
const API_SRC = resolve(ROOT, "..", "trajetto-api", "src");

/** Build output and dependencies, skipped wherever they appear. */
const IGNORED_DIRS = new Set(["node_modules", ".next"]);

/**
 * The policy itself is not code that sets cookies. Skipped by full path:
 * features and lib have content/ folders of their own, and those are code.
 */
const IGNORED_PATHS = new Set([resolve(SRC, "content")]);

/** A string literal, or an identifier resolved against the same file. */
const ARG = String.raw`(?:["'\x60]([^"'\x60$]+)["'\x60]|([A-Za-z_$][\w$]*))`;

const DIRECT = [
  // cookies().get("x"), req.cookies.get("x"), response.cookies.set("x", …)
  new RegExp(
    String.raw`(?:\bcookies\(\)|\b[\w$]+\.cookies|\bcookieStore)\s*\.(?:set|get|delete)\(\s*${ARG}`,
    "g",
  ),
  // getCookies("x"), deleteCookies("x")
  new RegExp(String.raw`\b(?:getCookies|deleteCookies)\(\s*${ARG}`, "g"),
];

/** `const jar = cookies()` (Next 14) or `await cookies()` (Next 15). */
const STORE_BINDING =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?cookies\(\)/g;

/** document.cookie = `${NAME}=…` or "name=…" */
const CLIENT_WRITE = /document\.cookie\s*=\s*(`[^`]*`|"[^"]*"|'[^']*')/g;

/** Only real writes: a log redaction naming the header is not one. */
const API_COOKIE_WRITE =
  /\.setCookie\(|\.(?:header|setHeader)\(\s*["'`][Ss]et-[Cc]ookie["'`]/;

function constantValue(name: string, source: string): string | null {
  const declaration = new RegExp(
    String.raw`\b(?:const|let|var)\s+${name}\s*=\s*["'\x60]([^"'\x60]+)["'\x60]`,
  ).exec(source);

  return declaration ? declaration[1] : null;
}

function nameFrom(match: RegExpMatchArray, source: string): string | null {
  if (match[1]) return match[1];
  // A parameter or variable with no constant behind it: a generic helper,
  // whoever calls it decides the name.
  return match[2] ? constantValue(match[2], source) : null;
}

export function cookieNamesIn(source: string): Set<string> {
  const names = new Set<string>();

  for (const pattern of DIRECT) {
    for (const match of source.matchAll(pattern)) {
      const name = nameFrom(match, source);
      if (name) names.add(name);
    }
  }

  for (const binding of source.matchAll(STORE_BINDING)) {
    const calls = new RegExp(
      String.raw`\b${binding[1]}\.(?:set|get|delete)\(\s*${ARG}`,
      "g",
    );

    for (const match of source.matchAll(calls)) {
      const name = nameFrom(match, source);
      if (name) names.add(name);
    }
  }

  for (const match of source.matchAll(CLIENT_WRITE)) {
    const beforeEquals = match[1].slice(1, -1).split("=")[0].trim();
    const interpolated = /^\$\{([A-Za-z_$][\w$]*)\}$/.exec(beforeEquals);
    const name = interpolated
      ? constantValue(interpolated[1], source)
      : beforeEquals || null;

    if (name) names.add(name);
  }

  return names;
}

export function policyNamesIn(source: string): Set<string> {
  const names = new Set<string>();

  for (const match of source.matchAll(
    /<CookieName>\s*([^<\s][^<]*?)\s*<\/CookieName>/g,
  )) {
    names.add(match[1]);
  }

  return names;
}

function sourceFiles(
  dir: string,
  ignoredPaths: ReadonlySet<string> = IGNORED_PATHS,
): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) {
      const ignored = IGNORED_DIRS.has(name) || ignoredPaths.has(resolve(path));
      return ignored ? [] : sourceFiles(path, ignoredPaths);
    }

    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function cookiesFromCode(): Map<string, string[]> {
  const found = new Map<string, string[]>();

  for (const file of sourceFiles(SRC)) {
    for (const name of cookieNamesIn(readFileSync(file, "utf8"))) {
      const files = found.get(name) ?? [];
      files.push(relative(ROOT, file).replace(/\\/g, "/"));
      found.set(name, files);
    }
  }

  return found;
}

describe("the Cookie Policy describes exactly the web app's cookies", () => {
  it("documents every cookie the code touches, and no other", () => {
    const fromCode = cookiesFromCode();
    const documented = policyNamesIn(readFileSync(POLICY, "utf8"));

    const missing = [...fromCode.keys()].filter(
      (name) => !documented.has(name),
    );
    const extra = [...documented].filter((name) => !fromCode.has(name));

    expect(missing, "set by the code and missing from the policy").toEqual([]);
    expect(extra, "in the policy and never set by the code").toEqual([]);

    // Two empty sets would pass both checks above.
    expect(fromCode.size).toBeGreaterThan(0);
  });

  it("stays true because the API sets no cookie of its own", () => {
    // Every cookie is born in this app; a dependency or a reply.setCookie in
    // the API would add one the policy cannot see from here.
    if (!existsSync(API_SRC)) return;

    const manifest = JSON.parse(
      readFileSync(resolve(API_SRC, "..", "package.json"), "utf8"),
    );
    const cookieDeps = Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    }).filter((name) => /cookie/i.test(name));

    const writers = sourceFiles(API_SRC).filter((file) =>
      API_COOKIE_WRITE.test(readFileSync(file, "utf8")),
    );

    expect(cookieDeps).toEqual([]);
    expect(writers.map((file) => relative(API_SRC, file))).toEqual([]);
  });
});

describe("the files the audit reads", () => {
  const files = sourceFiles(SRC).map((file) =>
    relative(SRC, file).replace(/\\/g, "/"),
  );

  it("skips the policy's own folder", () => {
    expect(files.filter((file) => file.startsWith("content/"))).toEqual([]);
  });

  // A cookie set in a feature's content/ folder is still a cookie. The
  // folders are found, not listed: other teams add, rename and remove them.
  it("reads every source file of every other folder named content", () => {
    const scanned = new Set(files);
    const expected: string[] = [];

    function collect(dir: string) {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        const skipped =
          !statSync(path).isDirectory() ||
          IGNORED_DIRS.has(name) ||
          IGNORED_PATHS.has(resolve(path));
        if (skipped) continue;

        if (name === "content") {
          const inside = sourceFiles(path).map((file) =>
            relative(SRC, file).replace(/\\/g, "/"),
          );
          expected.push(...inside);
        }

        collect(path);
      }
    }

    collect(SRC);

    expect(expected.filter((file) => !scanned.has(file))).toEqual([]);
    // src/lib/content is part of the public site itself; it always exists.
    expect(expected.some((file) => file.startsWith("lib/content/"))).toBe(true);
  });

  it("skips exactly the ignored path, never another folder of that name", () => {
    const root = mkdtempSync(join(tmpdir(), "cookie-audit-"));

    try {
      const tree = [
        "src/content/legal/politica.ts",
        "src/lib/content/loader.ts",
        "src/features/entregas/content/texto.tsx",
        "src/node_modules/pacote/index.ts",
        "src/app/page.tsx",
      ];

      for (const file of tree) {
        mkdirSync(dirname(join(root, file)), { recursive: true });
        writeFileSync(join(root, file), "export {};\n");
      }

      const src = join(root, "src");
      const found = sourceFiles(src, new Set([resolve(src, "content")]))
        .map((file) => relative(src, file).replace(/\\/g, "/"))
        .sort();

      expect(found).toEqual([
        "app/page.tsx",
        "features/entregas/content/texto.tsx",
        "lib/content/loader.ts",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the ways of writing a cookie", () => {
  it.each([
    ['response.cookies.set("tkey", token, options)', "tkey"],
    ['req.cookies.get("rkey")?.value', "rkey"],
    ['response.cookies.delete("tkey")', "tkey"],
    ['const value = await getCookies("tkey");', "tkey"],
    ['cookieStore.set("vkey", value)', "vkey"],
  ])("finds the cookie in %s", (source, expected) => {
    expect([...cookieNamesIn(source)]).toContain(expected);
  });

  it("follows a cookie store bound to any variable name", () => {
    const source = [
      "const jar = cookies();",
      'jar.set("novo", value, options);',
    ].join("\n");

    expect([...cookieNamesIn(source)]).toEqual(["novo"]);
  });

  it("resolves a name written through a constant, as two-factor does", () => {
    const source = [
      'const CHALLENGE_COOKIE = "tfc";',
      "const jar = cookies();",
      "jar.set(CHALLENGE_COOKIE, challenge, {});",
      "cookies().delete(CHALLENGE_COOKIE);",
    ].join("\n");

    expect([...cookieNamesIn(source)]).toEqual(["tfc"]);
  });

  it("resolves the client-side write of the sidebar", () => {
    const source = [
      'const SIDEBAR_COOKIE_NAME = "sidebar:state";',
      "document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/`;",
    ].join("\n");

    expect([...cookieNamesIn(source)]).toEqual(["sidebar:state"]);
  });

  it("does not invent a cookie from a generic helper", () => {
    const source = [
      "async function getCookies(cookieName: string) {",
      "  const store = cookies();",
      "  return store.get(cookieName)?.value;",
      "}",
    ].join("\n");

    expect([...cookieNamesIn(source)]).toEqual([]);
  });

  it("does not take unrelated maps for cookies", () => {
    const source = [
      'forwardedHeaders.set("x-pathname", pathname);',
      'url.searchParams.set("reason", errorType);',
    ].join("\n");

    expect([...cookieNamesIn(source)]).toEqual([]);
  });
});

describe("the names declared in the policy", () => {
  it("reads every CookieName and trims the space around it", () => {
    const source =
      "| <CookieName>tkey</CookieName> | sessão |\n| <CookieName> rkey </CookieName> | renovação |";

    expect([...policyNamesIn(source)].sort()).toEqual(["rkey", "tkey"]);
  });

  it("ignores an empty tag instead of declaring a nameless cookie", () => {
    expect([...policyNamesIn("<CookieName></CookieName>")]).toEqual([]);
  });
});

describe("what counts as the API setting a cookie", () => {
  it("catches a real write", () => {
    for (const source of [
      'reply.setCookie("sid", value, { path: "/" });',
      "reply.header('Set-Cookie', serialized);",
    ]) {
      expect(API_COOKIE_WRITE.test(source)).toBe(true);
    }
  });

  it("does not count a log redaction of the header", () => {
    expect(API_COOKIE_WRITE.test(`redact: ["res.headers['set-cookie']"]`)).toBe(
      false,
    );
  });
});
