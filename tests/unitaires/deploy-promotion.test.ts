// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rolling back through the promote job.
 *
 * The stack read `latest` and the retag to `stable` only ran behind a
 * STAGING_ENABLED switch, so the `image_tag` typed into the promote button was
 * never used: a rollback to a known-good build showed a green run and
 * redeployed the bad `latest`. The Dokploy Applications now pull the moving
 * tags the pipeline owns: `staging` and `stable`.
 */
const read = (...path: string[]) =>
  readFileSync(resolve(process.cwd(), ...path), "utf8").replace(/\r\n/g, "\n");

describe("the web's Dokploy Applications", () => {
  it("pull `staging` and `stable`, never latest", () => {
    const deploy = read("docs", "deploy.md");

    expect(deploy).toContain(
      "Docker Image: `ghcr.io/trajetto-organization/trajetto-ui:staging`",
    );
    expect(deploy).toMatch(
      /\| Docker Image +\| `ghcr\.io\/trajetto-organization\/trajetto-ui:stable` /,
    );
    expect(deploy).not.toContain("trajetto-ui:latest");
    expect(read(".github", "workflows", "deploy.yml")).not.toContain(
      "trajetto-ui:latest",
    );
  });

  it("always moves `stable` to the build being promoted, by digest", () => {
    const workflow = read(".github", "workflows", "deploy.yml");
    const promote = workflow.slice(
      workflow.indexOf("- name: Promote image to stable"),
    );
    const step = promote.slice(0, promote.indexOf("- name:", 10));

    expect(step).not.toMatch(/if:/);
    expect(step).toContain("DIGEST: ${{ steps.revision.outputs.digest }}");
    expect(step).toContain(
      '"ghcr.io/trajetto-organization/trajetto-ui@${DIGEST}"',
    );
    expect(step).toContain("GITHUB_STEP_SUMMARY");
  });
});

/**
 * Only an immutable build can be promoted.
 *
 * `image_tag` defaulted to `latest` — whatever was built last — and took any
 * tag at all: a moving tag promotes something nobody chose, and the value was
 * interpolated straight into `run:`. The tag now comes either from the merged
 * commit (`sha-<commit>`) or from the Run workflow form, and both go through
 * the same validation before the image is even inspected.
 */
describe("the tag given to the promote job", () => {
  const workflow = read(".github", "workflows", "deploy.yml");
  const dispatch = workflow.slice(
    workflow.indexOf("  workflow_dispatch:"),
    workflow.indexOf("\npermissions:"),
  );
  const job = workflow.slice(workflow.indexOf("\n  promote-production:"));
  const steps = job.split(/\n      - name: /).slice(1);
  const index = (name: string) =>
    steps.findIndex((step) => step.startsWith(name));

  it("has no default: whoever promotes by hand names the build", () => {
    expect(dispatch).toContain("image_tag:");
    expect(dispatch).not.toMatch(/default:/);
  });

  it("is validated before the image is even inspected", () => {
    const validate = index("Validate the tag to promote");

    expect(validate, "passo de validação").toBeGreaterThan(-1);
    expect(validate).toBeGreaterThan(index("Resolve the build to promote"));
    expect(validate).toBeLessThan(
      index("Find the commit the image was built from"),
    );
    expect(validate).toBeLessThan(index("Promote image to stable"));
  });

  it("accepts only an immutable build", () => {
    const pattern =
      steps[index("Validate the tag to promote")]?.match(
        /grep -Eq '([^']+)'/,
      )?.[1];

    expect(pattern, "padrão do grep").toBeTruthy();

    const accepts = (tag: string) => new RegExp(pattern!).test(tag);
    const full = "0a1b2c3d".repeat(5);

    expect(accepts("sha-0a1b2c3")).toBe(true);
    expect(accepts(`sha-${full}`)).toBe(true);
    // Builds made before staging existed.
    expect(accepts("main-0a1b2c3")).toBe(true);

    for (const tag of [
      "latest",
      "stable",
      "staging",
      "staging-0a1b2c3",
      "sha-0a1b2c",
      "sha-XYZ1234",
      `sha-${full}; id`,
      "main-0a1b2c3; id",
      "",
    ]) {
      expect(accepts(tag), tag).toBe(false);
    }
  });

  it("never reaches a shell as raw workflow syntax", () => {
    for (const step of steps) {
      const at = step.indexOf("run:");

      if (at < 0) continue;

      expect(step.slice(at), step.split("\n")[0]).not.toContain(
        "${{ inputs.image_tag }}",
      );
    }
  });
});

/**
 * A merge into main promotes the image staging built, never a rebuild.
 *
 * The staging commit is the merge's second parent (or main's head itself on
 * a fast-forward). A merge whose content differs from that commit would ship
 * an image without main's extra change, so it is refused; a commit with no
 * staging image fails with an explanation instead of a registry error.
 */
describe("the promotion of a merge into main", () => {
  const workflow = read(".github", "workflows", "deploy.yml");
  const job = workflow.slice(workflow.indexOf("\n  promote-production:"));
  const steps = job.split(/\n      - name: /).slice(1);
  const step = (name: string) =>
    steps.find((text) => text.startsWith(name)) ?? "";

  it("runs on main only, behind the production environment", () => {
    expect(job).toContain("github.ref == 'refs/heads/main'");
    expect(job).toMatch(/environment:\n\s+name: production\n/);
  });

  it("finds the staging commit of a merge, or takes main's head on a fast-forward", () => {
    const resolveStep = step("Resolve the build to promote");

    expect(resolveStep).toContain("git rev-list --parents -n 1 HEAD");
    expect(resolveStep).toContain("git rev-parse HEAD^2");
    expect(resolveStep).toContain('source="$GITHUB_SHA"');
    // The tag comes from the build staging served for that commit
    // (staged-build.mjs, tests/unitaires/staged-build.test.ts).
    expect(resolveStep).toContain(
      'SOURCE_SHA="$source" node .github/scripts/staged-build.mjs',
    );
    expect(resolveStep).toContain("GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}");
    // The whole history: the script walks back to the nearest staged build.
    expect(step("Checkout the checker")).toContain("fetch-depth: 0");
    // It reads the staging runs of deploy.yml (a run still going is waited
    // for), and GHCR, logged in before it.
    expect(job).toMatch(/\n {6}actions: read\n/);
    expect(
      steps.findIndex((text) =>
        text.startsWith("Log in to GitHub Container Registry"),
      ),
    ).toBeLessThan(
      steps.findIndex((text) =>
        text.startsWith("Resolve the build to promote"),
      ),
    );
  });

  it("refuses a merge whose content is not the staging commit's", () => {
    expect(step("Resolve the build to promote")).toContain(
      "git diff --quiet \"$source\" HEAD -- . ':(exclude)CHANGELOG.md'",
    );
  });

  it("fails clearly when the commit has no staging image", () => {
    const find = step("Find the commit the image was built from");

    // ghcr.mjs: exit 3 is the registry's "not found"; any other failure is
    // GHCR not answering (retried, then reported as such), never "missing".
    expect(find).toContain(
      'digest=$(node .github/scripts/ghcr.mjs digest "$image") || rc=$?',
    );
    expect(find).toMatch(
      /if \[ "\$rc" -eq 3 \]; then\n\s+echo "::error::A imagem \$\{image\} não existe no GHCR/,
    );
    expect(find).toContain('echo "digest=${digest}"');
    // The commit label from the registry, without pulling the image.
    expect(find).toContain("node .github/scripts/ghcr.mjs revision");
    expect(find).not.toContain("docker pull");
  });

  // A transport error of the registry read as "this tag does not exist" (or
  // skipped a check) wherever the workflow asked `… 2>/dev/null || true`.
  it("never takes a GHCR error for a missing tag", () => {
    expect(workflow).not.toMatch(/imagetools inspect[^\n]*2>\/dev\/null/);
    expect(workflow).not.toMatch(/imagetools[^\n]*\|\| true/);
    // Every read and every tag move goes through ghcr.mjs.
    expect(workflow).not.toMatch(/docker buildx imagetools/);
  });

  it("builds nothing", () => {
    expect(job).not.toContain("docker/build-push-action@");
  });

  /**
   * The image is pushed before the Trivy scan reads it by digest, and stays
   * in GHCR when the scan, the staging rollout or the run fails. Finding
   * `sha-<commit>` alone let a merge promote a build staging never ran.
   */
  it("promotes a merge only when staging ran that exact build", () => {
    const names = steps.map((text) => text.split("\n")[0]);
    const check = step("Check that staging ran this build");

    expect(check).toContain("if: github.event_name == 'push'");
    expect(check).toContain(
      'marker="ghcr.io/trajetto-organization/trajetto-ui:staged-${IMAGE_TAG#sha-}"',
    );
    expect(check).toContain(
      'staged=$(node .github/scripts/ghcr.mjs digest "$marker") || rc=$?',
    );
    expect(check).toContain('if [ "$staged" != "$DIGEST" ]; then');
    expect(check).toContain("exit 1");
    expect(names.indexOf("Check that staging ran this build")).toBeLessThan(
      names.indexOf("Promote image to stable"),
    );
    expect(names.indexOf("Check that staging ran this build")).toBeGreaterThan(
      names.indexOf("Find the commit the image was built from"),
    );
  });

  it("gets the staged marker only as staging's last step, after the rollout check", () => {
    const staging = workflow.slice(
      workflow.indexOf("\n  deploy-staging:"),
      workflow.indexOf("\n  promote-production:"),
    );
    const stagingSteps = staging.split(/\n      - name: /).slice(1);
    const last = stagingSteps[stagingSteps.length - 1];

    expect(last.startsWith("Mark this build as staged")).toBe(true);
    expect(last).toContain("DIGEST: ${{ needs.build.outputs.digest }}");
    expect(last).toContain(
      '--tag "ghcr.io/trajetto-organization/trajetto-ui:staged-${GITHUB_SHA::7}"',
    );
    expect(staging).toContain("- name: Wait for the site to serve this build");
    // Nothing else writes the marker.
    expect(workflow.match(/--tag "?[^\s"]*:staged-/g) ?? []).toHaveLength(1);
  });
});

/**
 * A commit that only changes documentation (decision D11, 30/10/2026).
 *
 * A `[skip ci]` commit on staging runs no pipeline, so it has no image and
 * no `staged-<7>` marker, and the promote of a merge whose staging head was
 * such a commit failed for good ("rode de novo" could not help: there was
 * no run to repeat). The promote now ships the build of the nearest staged
 * ancestor when everything between is documentation, which the image never
 * contains; and the run that deploys staging still deploys when the newer
 * head only adds documentation. The rule and its behaviour are tested in
 * docs-only.test.ts, staged-build.test.ts and deploy-staging-head.test.ts;
 * this holds the wiring and the documentation together.
 */
describe("a commit that only changes documentation", () => {
  const workflow = read(".github", "workflows", "deploy.yml");
  const staging = workflow.slice(
    workflow.indexOf("\n  deploy-staging:"),
    workflow.indexOf("\n  promote-production:"),
  );

  it("is deployed by the run it sits on", () => {
    const head = staging.slice(
      staging.indexOf("- name: Is this run still staging's head?"),
    );

    expect(head).toContain(
      'git merge-base --is-ancestor "$GITHUB_SHA" "$head"',
    );
    expect(head).toContain(
      'node .github/scripts/docs-only.mjs "$GITHUB_SHA" "$head"',
    );
  });

  it("is promoted through the build of its nearest staged ancestor, with the same rule", () => {
    const script = read(".github", "scripts", "staged-build.mjs");

    expect(script).toContain('from "./docs-only.mjs"');
    expect(workflow).toContain(
      'SOURCE_SHA="$source" node .github/scripts/staged-build.mjs',
    );
  });

  it("is documented as the one safe use of [skip ci]", () => {
    const deploy = read("docs", "deploy.md");

    expect(deploy).toContain("**Commit só de documentação (`[skip ci]`).**");
    // The GitHub behaviour that still needs a hand: required PR checks of a
    // `[skip ci]` head never run on their own.
    expect(deploy).toContain("**PR para `main` com `[skip ci]` na ponta:**");
    expect(deploy).not.toMatch(
      /Re-run failed jobs|dê Re-run|\(Re-run do job\)/,
    );
  });
});

/**
 * One image, staging first, then production (decision 12.2).
 *
 * The web was built twice per commit, once per environment, because Next
 * inlined the NEXT_PUBLIC_* values (API URL, captcha key) at build: the
 * production image was the same commit rebuilt, not the artifact staging
 * validated. The public values are read at run time now (src/env), so one
 * build is moved by digest to `staging` and then, by the promote, to
 * `stable`.
 */
describe("the single web image", () => {
  const workflow = read(".github", "workflows", "deploy.yml");
  const dockerfile = read("Dockerfile");
  const envExample = read(".env.example");
  const deploy = read("docs", "deploy.md");

  /** A job's text, from its key to the next top-level job. */
  const job = (name: string) => {
    const from = workflow.indexOf(`\n  ${name}:\n`);

    expect(from, `job ${name}`).toBeGreaterThan(-1);

    const rest = workflow.slice(from + 1);
    const next = rest.slice(1).search(/\n {2}[a-z][\w-]*:\n/);

    return next < 0 ? rest : rest.slice(0, next + 1);
  };

  it("is built once per commit, with nothing that belongs to one environment", () => {
    // One image pushed per commit. The step before it is the smoke test's:
    // the same build loaded into the runner, pushing nothing
    // (tests/unitaires/image-smoke.test.ts).
    const pushes = workflow
      .split("uses: docker/build-push-action@")
      .slice(1)
      .map((step) => step.slice(0, step.search(/\n\s*- name:|\n {2}\w/)))
      .map((step) => /\n {10}push: (true|false)\n/.exec(step)?.[1]);

    expect(pushes).toEqual(["false", "true"]);
    expect(workflow).not.toMatch(
      /\n {2}build-staging:|\n {2}build-production:/,
    );

    const args = [
      ...job("build").matchAll(/build-args: \|\n((?: {12}.+\n)+)/g),
    ].map((match) =>
      match[1]
        .trim()
        .split("\n")
        .map((line) => line.trim().split("=")[0]),
    );

    expect(args).toEqual([
      ["METADATA_BASE", "GIT_SHA"],
      ["METADATA_BASE", "GIT_SHA"],
    ]);
    expect(workflow).not.toMatch(/_STAGING \}\}\n[\s\S]*build-args/);
  });

  it("is built from staging only, after the same validation as every branch", () => {
    const build = job("build");

    expect(build).toContain(
      "github.ref == 'refs/heads/staging' && github.event_name == 'push'",
    );
    expect(build).toMatch(/needs: \[validate, browser-suites\]\n/);
    expect(job("validate")).toContain("uses: ./.github/workflows/ci.yml");
    expect(job("browser-suites")).toContain(
      "uses: ./.github/workflows/browser-suites.yml",
    );
  });

  it("goes to staging by the digest just built, under the immutable sha tag", () => {
    const staging = job("deploy-staging");

    expect(staging).toMatch(/needs: build\n/);
    expect(staging).not.toContain("STAGING_ENABLED");
    expect(staging).toContain("DIGEST: ${{ needs.build.outputs.digest }}");
    expect(staging).toContain(
      '"ghcr.io/trajetto-organization/trajetto-ui@${DIGEST}"',
    );
    expect(job("build")).toContain("type=sha,prefix=sha-");
  });

  it("deploys through the Dokploy API like the API repository, and waits only when something was deployed", () => {
    // It was the Application's deploy webhook, which answers 200 the moment
    // the deploy is queued: on 27/10/2026 the image pull failed in Dokploy
    // after 5 s and the run only found out 10 minutes later, from the site.
    // dokploy-deploy.mjs follows the deployment and deploys again on error.
    for (const [name, environment] of [
      ["deploy-staging", "staging"],
      ["promote-production", "production"],
    ] as const) {
      const steps = job(name);

      expect(steps, name).not.toContain("dokploy-webhook");
      expect(steps, name).not.toContain("WEBHOOK_URL");
      expect(steps, name).toContain(
        "run: node .github/scripts/dokploy-deploy.mjs",
      );
      expect(steps, name).toContain("DOKPLOY_URL: ${{ secrets.DOKPLOY_URL }}");
      expect(steps, name).toContain(
        "DOKPLOY_API_KEY: ${{ secrets.DOKPLOY_API_KEY }}",
      );
      expect(steps, name).toContain(
        "DOKPLOY_APPLICATION_ID: ${{ secrets.DOKPLOY_UI_APPLICATION_ID }}",
      );
      expect(steps, name).toContain("DOKPLOY_APP_LABEL: trajetto-ui");
      // None of the three = not set up yet (a notice); some = a mistake.
      expect(steps, name).toMatch(/echo "enabled=true" >> "\$GITHUB_OUTPUT"/);
      expect(steps, name).toMatch(
        new RegExp(
          `::error::Configuração parcial do Dokploy no environment ${environment}`,
        ),
      );
      expect(steps, name).toMatch(
        /if: .*steps\.dokploy\.outputs\.enabled == 'true'.*\n(?:.*\n)*?\s+run: node \.github\/scripts\/dokploy-deploy\.mjs/,
      );
      expect(steps, name).toMatch(
        /- name: Wait for the site to serve [^\n]*\n\s+if: .*steps\.dokploy\.outputs\.enabled == 'true'/,
      );
    }
  });

  it("takes no NEXT_PUBLIC_ value but the build id", () => {
    const publicArgs = [
      ...dockerfile.matchAll(/^(?:ARG|ENV) (NEXT_PUBLIC_\w+)/gm),
    ].map((match) => match[1]);

    expect(publicArgs).toEqual(["NEXT_PUBLIC_BUILD_SHA"]);
    expect(dockerfile).not.toMatch(/^ARG APP_ENV/m);
  });

  it("gets its public values from the Application's environment at run time", () => {
    // The Environment block docs/deploy.md section 6.2 has the owner paste.
    const environment =
      deploy
        .slice(deploy.indexOf("### 6.2 Environment"))
        .match(/```dotenv\n([\s\S]*?)```/)?.[1] ?? "";

    for (const name of ["PUBLIC_API_URL", "TURNSTILE_SITE_KEY"]) {
      expect(environment, name).toMatch(new RegExp(`^${name}=`, "m"));
    }

    expect(environment).not.toContain("NEXT_PUBLIC_");

    for (const name of [
      "PUBLIC_API_URL",
      "TURNSTILE_SITE_KEY",
      "MAP_TILE_URL",
      "MAP_TILE_ATTRIBUTION",
    ]) {
      expect(envExample, name).toMatch(new RegExp(`^${name}=`, "m"));
    }

    expect(envExample).not.toMatch(/^NEXT_PUBLIC_/m);
  });
});
