// @vitest-environment node
import { isNotFoundError } from "next/dist/client/components/not-found";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as probe from "@/app/(protected)/dashboard/boundary-probe/page";

/**
 * dashboard/boundary-probe, the page that throws on purpose so
 * tests/ui/error-boundary.spec.ts can prove the error boundary (TEST-CI-1).
 *
 * It answered 404 whenever NODE_ENV was production, and the browser suites
 * run the production build (browser-suites.yml), so the spec could only
 * fail there. The probe now opens on an explicit test flag, E2E_PROBES=1,
 * set only by that job; a production server without it still answers 404.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

function render(): unknown {
  try {
    probe.default();
  } catch (error) {
    return error;
  }

  return null;
}

describe("the error boundary probe", () => {
  it("in production, without the test flag, it is a 404 like any unknown route", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_PROBES", "");

    expect(isNotFoundError(render())).toBe(true);
  });

  it.each([["0"], ["true"], ["yes"]])(
    "E2E_PROBES=%s does not open the probe",
    (value) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("E2E_PROBES", value);

      expect(isNotFoundError(render())).toBe(true);
    },
  );

  it("in the production build of the browser suite (E2E_PROBES=1), it breaks on purpose", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("E2E_PROBES", "1");

    const error = render();

    expect(isNotFoundError(error)).toBe(false);
    expect((error as Error).message).toBe("sonda do limite de erro");
  });

  it("in development, it breaks on purpose", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_PROBES", "");

    expect((render() as Error).message).toBe("sonda do limite de erro");
  });

  // The flag arrives at run time (the job's start step), so the answer must
  // be decided per request, never baked into the build's output.
  it("is decided on every request", () => {
    expect(probe.dynamic).toBe("force-dynamic");
  });
});
