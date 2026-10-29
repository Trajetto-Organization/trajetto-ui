/**
 * The answer of a Server Action called from a tab that outlived its build.
 *
 * A deploy that removes, renames or moves a Server Action leaves every tab
 * opened before it calling an id the server no longer knows. Next 14 answers
 * that id with the not-found page, as HTML; the client sees a response that
 * is not RSC and resolves the call with `undefined` instead of throwing. The
 * screens read `result.success` straight away, so the TypeError landed in
 * their own `catch` and the person got "Erro inesperado" — on every retry,
 * until they pressed F5, since nothing told them F5 was the fix.
 *
 * `isStaleActionResult` recognises that answer at the call site and hands it
 * to the `DeploymentSkewGuard`, which already knows what to say: a notice
 * that a new version is out, with a reload button, and a full load on the
 * next navigation. It never reloads on its own: whatever the person was
 * typing is still on the screen, and the action it was meant for never ran.
 *
 * Only where the caller reads the answer, and only for actions that always
 * answer with an object (TypeScript says so wherever a caller reads
 * `result.x` without `?.`). `undefined` is the framework's signal. An action
 * that answers nothing on success (`newResetPasswordVerification`) cannot
 * tell the two apart, so its callers
 * are left alone. An answer that is not an object at all is just as
 * unusable. `null` is NOT a signal: it is the initial state of several
 * `useFormState` forms, and the framework never makes it up.
 *
 * The same `undefined` also comes back when the middleware redirected the
 * call (a session that ended). Reloading is the right way out of that too:
 * the full load goes through the middleware and lands on the login.
 */

/** What the `DeploymentSkewGuard` listens to. */
const STALE_BUILD_EVENT = "trajetto:stale-build";

/** For screens that must put the reason in a message of their own. */
const STALE_ACTION_MESSAGE =
  "Uma nova versão do Trajetto foi publicada. Recarregue a página para continuar.";

function isMissingActionResult(result: unknown): boolean {
  if (result === undefined) return true;
  if (result === null) return false;

  return typeof result !== "object";
}

interface StaleActionOptions {
  /**
   * A read nobody asked for just now: a query on mount, a refetch on focus, a
   * poll. It raises the notice once; after the person has closed it, only
   * something they did brings it back, not a timer in the background.
   */
  background?: boolean;
}

interface StaleBuildDetail {
  background: boolean;
}

/**
 * True when `result` is not an answer this tab can read, after telling the
 * deploy guard. The caller then stops: no error toast of its own, since the
 * guard's notice is the one that says what to do.
 */
function isStaleActionResult(
  result: unknown,
  options: StaleActionOptions = {},
): boolean {
  if (!isMissingActionResult(result)) return false;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<StaleBuildDetail>(STALE_BUILD_EVENT, {
        detail: { background: options.background === true },
      }),
    );
  }

  return true;
}

type FormAction = (state: never, payload: never) => Promise<unknown>;

/**
 * The same check for a `useFormState` action: a stale answer becomes the
 * previous state.
 *
 * `useFormState` keeps whatever the action answers, and the create/update
 * forms read it during render (`state.createFuelError?.amount`), so
 * `undefined` took the whole screen down into the error boundary; the delete
 * dialogs read `state?.x` and simply did nothing. With the previous state the
 * form stays as it was, filled, under the guard's notice.
 *
 * Not for the forms whose action answers nothing on success or redirects
 * (login, two-factor, logout, "Atualizar"), and not for the public
 * forms: a client wrapper gives up the submit that works before hydration.
 */
function guardFormAction<A extends FormAction>(action: A): A {
  const call = action as unknown as (
    state: unknown,
    payload: unknown,
  ) => Promise<unknown>;

  const guarded = async (state: unknown, payload: unknown) => {
    const next = await call(state, payload);

    return isStaleActionResult(next) ? state : next;
  };

  return guarded as unknown as A;
}

export {
  STALE_BUILD_EVENT,
  STALE_ACTION_MESSAGE,
  isStaleActionResult,
  guardFormAction,
};
export type { StaleBuildDetail };
