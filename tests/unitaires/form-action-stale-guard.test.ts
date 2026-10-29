import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every `useFormState` form goes through `guardFormAction`.
 *
 * After a deploy a tab from the previous build calls actions the server may
 * no longer have, and Next 14 answers them with `undefined`. `useFormState`
 * stores that as the form state, and the create/update forms read it during
 * render (`state.createFuelError?.amount`): the screen fell into the error
 * boundary. `guardFormAction` keeps the previous state and raises the
 * new-version notice instead (lib/action-result).
 *
 * The exceptions are deliberate, each for a reason that is not "forgot".
 */
const EXCEPTIONS: Record<string, string> = {
  // Logging out must still happen from an old tab, not stop at the
  // new-version notice.
  "app/(protected)/_components/layout/protected-account-settings/index.tsx":
    "logOutUser reads a stale answer itself: it still logs out, through the middleware's force_logout",

  // Their actions redirect on success, so `undefined` is not a signal there.
  "components/auth/login-form/index.tsx": "handleLoginUser redirects",
  "components/auth/two-factor-authentication-form/index.tsx":
    "handleTwoFactorAuthenticationUser redirects",

  // Public pages: a client wrapper would give up the submit that works
  // before hydration.
  "components/auth/forgot-password-form/index.tsx": "public page",
  "components/auth/reset-password-form/index.tsx": "public page",
  "components/quote-form/index.tsx": "public page",
};

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const forms = sourceFiles(SRC)
  .filter((file) => /useFormState\s*[<(]/.test(readFileSync(file, "utf8")))
  .map((file) => relative(SRC, file).split(sep).join("/"));

describe("the useFormState forms", () => {
  it("are all found (the scan itself works)", () => {
    // Merging the admin/dashboard copies (decision 8.7) took the forms from
    // over a hundred to 53 on 29/09/2026; the rule below still reads each.
    expect(forms.length).toBeGreaterThan(50);
  });

  it("wrap their action in guardFormAction, save the listed exceptions", () => {
    const unguarded = forms.filter(
      (file) =>
        !(file in EXCEPTIONS) &&
        !/useFormState\s*(<[^>]*>)?\s*\(\s*guardFormAction\(/.test(
          readFileSync(join(SRC, file), "utf8").replace(/\s+/g, " "),
        ),
    );

    expect(unguarded).toEqual([]);
  });

  it("keeps no exception for a form that is gone", () => {
    expect(
      Object.keys(EXCEPTIONS).filter((file) => !forms.includes(file)),
    ).toEqual([]);
  });
});
