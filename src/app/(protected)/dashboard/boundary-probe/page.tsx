import { notFound } from "next/navigation";

/**
 * A screen that throws on purpose, so the error boundary can be tested.
 *
 * `error.tsx` is the one piece of a Next application that cannot be exercised
 * without something failing, and "we added the file" is not the same as "the
 * boundary catches, the recovery buttons work and the sidebar survives". This
 * page is what makes `tests/ui/error-boundary.spec.ts` a real test instead of
 * a check that a file exists.
 *
 * Open in development, and in a production build only with E2E_PROBES=1,
 * which only the browser-suites job sets: it runs the production build, and
 * a guard on NODE_ENV alone made the spec fail there. Any other production
 * server answers 404 for this path like any other unknown one.
 */

// The flag is set when the server starts, not when it is built: decided per
// request so a build never bakes either answer in.
export const dynamic = "force-dynamic";

function probesEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" || process.env.E2E_PROBES === "1"
  );
}

const BoundaryProbe = (): JSX.Element => {
  if (!probesEnabled()) notFound();

  throw new Error("sonda do limite de erro");
};

export default BoundaryProbe;
