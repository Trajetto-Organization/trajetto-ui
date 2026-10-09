// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The route check in the promote job, on a rollback.
 *
 * The job checks the source of the image being promoted against the
 * production API. It used to run the checker FROM that source too — and every
 * image built before the checker existed has no scripts/check-api-routes.mjs.
 * Once API_DOCS_URL is set, rolling back to such a build would fail on a
 * missing file, on the one path that has to work when production is broken.
 *
 * So the checker comes from this run's commit, and it reads the promoted
 * image's source from a folder of its own.
 */
const workflow = readFileSync(
  resolve(process.cwd(), ".github", "workflows", "deploy.yml"),
  "utf8",
);

/** The steps of the promote job, each from its `- name:` to the next. */
function promoteSteps(): string[] {
  const job = workflow.slice(workflow.indexOf("\n  promote-production:"));

  return job
    .split(/\n      - name: /)
    .slice(1)
    .map((step) => `- name: ${step}`);
}

const stepCalled = (name: string) =>
  promoteSteps().find((step) => step.startsWith(`- name: ${name}`)) ?? "";

describe("the promote job's route check", () => {
  const steps = promoteSteps();

  const checkouts = steps.filter((step) =>
    step.includes("uses: actions/checkout@"),
  );

  const check = steps.find((step) =>
    step.includes("node scripts/check-api-routes.mjs"),
  );

  it("reads the promoted image's source from a folder of its own", () => {
    const source = checkouts.find((step) =>
      step.includes("steps.revision.outputs.sha"),
    );

    const folder = source?.match(/\n\s+path: ([\w./-]+)/)?.[1];

    expect(
      folder,
      "the image's source is checked out into a path",
    ).toBeTruthy();
    expect(check).toContain(`node scripts/check-api-routes.mjs ${folder}/src`);
  });

  it("runs the checker of this run's commit, which a rollback target may predate", () => {
    const own = checkouts.find(
      (step) => !step.includes("steps.revision.outputs.sha"),
    );

    expect(own, "a checkout of the workflow's own commit").toBeTruthy();
    expect(own).not.toMatch(/\n\s+path: /);
    expect(steps.indexOf(own!)).toBeLessThan(steps.indexOf(check!));
  });

  it("still checks before `stable` moves", () => {
    expect(steps.indexOf(check!)).toBeLessThan(
      steps.indexOf(stepCalled("Promote image to stable")),
    );
  });
});
