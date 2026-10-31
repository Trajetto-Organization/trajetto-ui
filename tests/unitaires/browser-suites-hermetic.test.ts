// @vitest-environment node
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import RunSummaryReporter, {
  collectRunFindings,
  escapeProperty,
  suiteName,
  summaryMarkdown,
  workflowCommands,
  type TestLike,
} from "../ui/support/run-summary-reporter";

/**
 * What keeps the browser suites from failing for a reason outside the code.
 *
 * The suites gate the staging image. They failed on a slow Cloudflare or
 * OpenStreetMap, waited 61 s whenever nine logins landed in one minute, and a
 * test that only passed on its retry left a green job and no trace. Each of
 * those had a cause in the test harness; these checks keep the causes from
 * coming back:
 * - every spec takes `test` from tests/ui/support/test.ts, the one that makes
 *   each browser context hermetic and a person of its own;
 * - the three configs share retries, forbidOnly, the run summary and the
 *   local siteverify double; the pure-rule suite never retries;
 * - the login helpers never wait the API's window out;
 * - a flaky test becomes a warning and a line in the run summary.
 */
const read = (...path: string[]) =>
  readFileSync(resolve(process.cwd(), ...path), "utf8").replace(/\r\n/g, "\n");

const SUITES = ["tests/ui", "tests/a11y", "tests/responsive"];

const specs = SUITES.flatMap((dir) =>
  readdirSync(resolve(process.cwd(), dir))
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => `${dir}/${name}`),
);

describe("the specs of the three browser suites", () => {
  it("are all found", () => {
    expect(specs.length).toBeGreaterThan(40);
  });

  it("take test and expect from the hermetic test, never from @playwright/test", () => {
    for (const spec of specs) {
      const source = read(spec);

      expect(source, spec).not.toMatch(/["']@playwright\/test["']/);
      expect(source, spec).toMatch(
        /^import \{[^}]*\btest\b[^}]*\} from "(?:\.\/|\.\.\/ui\/)support\/test";$/m,
      );
    }
  });

  it("never sleep in place of the socket's connect frame", () => {
    // routes-realtime waited 2.5 s for the socket to join; a slower
    // handshake let the event go by.
    expect(read("tests/ui/routes-realtime.spec.ts")).not.toMatch(
      /waitForTimeout\(/,
    );
  });

  it("wait for the state they read, never a fixed time in its place", () => {
    // The keyboard drag waited 250 ms between keys (now: dnd-kit's
    // announcement of each move), the ⌘K read its list 300 ms after typing
    // (now: a list that only exists once filtered), and the e-mail link of
    // /contato was measured 1.2 s after showing (now: its entrance
    // animations finished). Each fixed time stretched past its budget on a
    // loaded runner and failed with nothing wrong.
    for (const file of [
      "tests/ui/route-detail.spec.ts",
      "tests/ui/support/palette.ts",
      "tests/ui/contact-email.spec.ts",
    ]) {
      expect(read(file), file).not.toMatch(/waitForTimeout\(/);
    }
  });
});

describe("the configs", () => {
  const BROWSER_CONFIGS = [
    "playwright.ui.config.ts",
    "playwright.a11y.config.ts",
    "playwright.responsive.config.ts",
  ];

  it("share the browser suites' defaults, and set none of them on their own", () => {
    for (const config of BROWSER_CONFIGS) {
      const source = read(config);

      expect(source, config).toContain("...browserSuiteDefaults,");
      expect(source, config).not.toMatch(/^\s*(retries|reporter|forbidOnly):/m);
    }
  });

  it("keep their results apart, so a later suite does not empty an earlier one's traces", () => {
    const folders = BROWSER_CONFIGS.map(
      (config) => /^\s*outputDir: "([^"]+)",/m.exec(read(config))?.[1],
    );

    expect(folders).toEqual([
      "./test-results/ui",
      "./test-results/a11y",
      "./test-results/responsive",
    ]);
    expect(read("playwright.config.ts")).toMatch(
      /^\s*outputDir: "\.\/test-results\/rules",/m,
    );
  });

  it("never retry the pure rules, and refuse a stray test.only in CI", () => {
    const source = read("playwright.config.ts");

    expect(source).toMatch(/^\s*retries: 0,/m);
    expect(source).toContain("forbidOnly: !!process.env.CI");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("retry once in CI only, forbid test.only there, and start the siteverify double", async () => {
    vi.stubEnv("CI", "true");
    vi.resetModules();

    const ci = (await import("../ui/support/suite-config"))
      .browserSuiteDefaults;

    expect(ci.retries).toBe(1);
    expect(ci.forbidOnly).toBe(true);
    expect(ci.reporter).toEqual([
      ["list"],
      ["./tests/ui/support/run-summary-reporter.ts"],
    ]);
    expect(ci.webServer).toMatchObject({
      command: "node tests/ui/support/turnstile-siteverify-double.mjs",
      url: "http://127.0.0.1:3199/health",
      reuseExistingServer: false,
    });

    vi.stubEnv("CI", "");
    vi.resetModules();

    const local = (await import("../ui/support/suite-config"))
      .browserSuiteDefaults;

    expect(local.retries).toBe(0);
    expect(local.forbidOnly).toBe(false);
  });
});

describe("the login helpers", () => {
  const login = read("tests/ui/support/login.ts");

  it("never wait the API's per-address window out", () => {
    expect(login).not.toMatch(/61_000|waitForTimeout\(6\d/);
  });

  it("send API logins as a person of their own, through the forwarder headers", () => {
    expect(login).toContain('"x-trajetto-client-ip": nextClientAddress()');
    expect(login).toContain('"x-trajetto-forwarder-secret": secret');
  });
});

/** A finished test, as the reporter sees one. */
function testLike(
  title: string,
  outcome: string,
  results: TestLike["results"],
  annotations: TestLike["annotations"] = [],
): TestLike {
  return {
    titlePath: () => ["", "", "auth-login.spec.ts", "the login form", title],
    location: {
      file: "/work/trajetto-ui/tests/ui/auth-login.spec.ts",
      line: 86,
    },
    outcome: () => outcome,
    annotations,
    results,
  };
}

describe("the run summary", () => {
  const flaky = testLike("refuses the wrong password", "flaky", [
    {
      status: "failed",
      error: { message: "\u001b[31mError: timeout\u001b[39m\n    at x" },
    },
    { status: "passed" },
  ]);

  const blocked = testLike(
    "opens the map",
    "expected",
    [{ status: "passed" }],
    [
      {
        type: "external-request-blocked",
        description: "https://example.com/x",
      },
    ],
  );

  const steady = testLike("lands on the dashboard", "expected", [
    { status: "passed" },
  ]);

  it("finds the flaky tests with their first attempt's error, and what the helpers noted", () => {
    const findings = collectRunFindings([flaky, blocked, steady], "/work");

    expect(findings.flaky).toEqual([
      {
        title: "the login form › refuses the wrong password",
        file: "trajetto-ui/tests/ui/auth-login.spec.ts",
        line: 86,
        detail: "Error: timeout",
      },
    ]);
    expect(findings.blocked.map((finding) => finding.detail)).toEqual([
      "https://example.com/x",
    ]);
    expect(findings.repeatedClicks).toEqual([]);
  });

  it("turns each flaky test into a GitHub warning, escaped", () => {
    const [command] = workflowCommands(collectRunFindings([flaky], "/work"));

    expect(command).toBe(
      "::warning file=trajetto-ui/tests/ui/auth-login.spec.ts,line=86," +
        "title=Teste instável (passou só na nova tentativa)::" +
        "the login form › refuses the wrong password — primeira tentativa: Error: timeout",
    );
    expect(escapeProperty("a:b,c%d\ne")).toBe("a%3Ab%2Cc%25d%0Ae");
  });

  it("says so when nothing was flaky", () => {
    const markdown = summaryMarkdown(
      "ui",
      collectRunFindings([steady], "/work"),
    );

    expect(markdown).toContain("### Suíte de navegador: ui");
    expect(markdown).toContain("Nenhum teste instável");
  });

  it("names the suite after its config", () => {
    expect(suiteName("/x/playwright.ui.config.ts")).toBe("ui");
    expect(suiteName("C:\\x\\playwright.a11y.config.ts")).toBe("a11y");
    expect(suiteName(undefined)).toBe("playwright.config.ts");
  });

  it("writes the warnings to the log and the section to the job summary, without failing", () => {
    const dir = mkdtempSync(join(tmpdir(), "run-summary-"));
    const summary = join(dir, "summary.md");
    const logged: string[] = [];

    vi.stubEnv("GITHUB_ACTIONS", "true");
    vi.stubEnv("GITHUB_WORKSPACE", "/work");
    vi.stubEnv("GITHUB_STEP_SUMMARY", summary);
    vi.spyOn(console, "log").mockImplementation((line: string) => {
      logged.push(line);
    });

    try {
      const reporter = new RunSummaryReporter();

      reporter.onBegin(
        { configFile: "/work/trajetto-ui/playwright.ui.config.ts" } as never,
        { allTests: () => [flaky, steady] } as never,
      );

      const result = reporter.onEnd({ status: "passed" } as never);

      expect(result).toBeUndefined();
      expect(logged).toHaveLength(1);
      expect(logged[0]).toMatch(
        /^::warning file=trajetto-ui\/tests\/ui\/auth-login\.spec\.ts,line=86,/,
      );

      const written = readFileSync(summary, "utf8");

      expect(written).toContain("### Suíte de navegador: ui");
      expect(written).toContain("1 teste(s) instável(is)");
      expect(written).toContain("the login form › refuses the wrong password");
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllEnvs();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
