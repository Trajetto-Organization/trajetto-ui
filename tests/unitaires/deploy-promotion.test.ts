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
    expect(resolveStep).toContain('echo "tag=sha-${source::7}"');
    // Depth 2 brings both parents of a merge commit.
    expect(step("Checkout the checker")).toContain("fetch-depth: 2");
  });

  it("refuses a merge whose content is not the staging commit's", () => {
    expect(step("Resolve the build to promote")).toContain(
      "git diff --quiet \"$source\" HEAD -- . ':(exclude)CHANGELOG.md'",
    );
  });

  it("fails clearly when the commit has no staging image", () => {
    const find = step("Find the commit the image was built from");

    expect(find).toContain("docker buildx imagetools inspect");
    expect(find).toContain("não existe no GHCR");
    expect(find).toContain('echo "digest=${digest}"');
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
    const builds = workflow.match(/docker\/build-push-action@/g) ?? [];

    expect(builds).toHaveLength(1);
    expect(workflow).not.toMatch(
      /\n {2}build-staging:|\n {2}build-production:/,
    );

    const args =
      job("build").match(/build-args: \|\n((?: {12}.+\n)+)/)?.[1] ?? "";

    expect(
      args
        .trim()
        .split("\n")
        .map((line) => line.trim().split("=")[0]),
    ).toEqual(["METADATA_BASE", "GIT_SHA"]);
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

  it("deploys through the Dokploy webhook, and waits only when something was deployed", () => {
    expect(job("deploy-staging")).toContain(
      "WEBHOOK_URL: ${{ secrets.DOKPLOY_STAGING_WEBHOOK_URL }}",
    );
    expect(job("promote-production")).toContain(
      "WEBHOOK_URL: ${{ secrets.DOKPLOY_PRODUCTION_WEBHOOK_URL }}",
    );

    for (const name of ["deploy-staging", "promote-production"]) {
      expect(job(name), name).toContain(
        "run: node .github/scripts/dokploy-webhook.mjs",
      );
      expect(job(name), name).toMatch(
        /if: .*steps\.dokploy\.outputs\.deployed == 'true'/,
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
