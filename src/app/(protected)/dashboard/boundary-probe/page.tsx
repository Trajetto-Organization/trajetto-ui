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
 * Unreachable in production: the guard runs before the throw, so a build with
 * `NODE_ENV=production` answers 404 for this path like any other unknown one.
 * It exists in development and in the test stack, where the suite runs.
 */
const BoundaryProbe = (): JSX.Element => {
  if (process.env.NODE_ENV === "production") notFound();

  throw new Error("sonda do limite de erro");
};

export default BoundaryProbe;
