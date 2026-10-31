import { flushSync } from "react-dom";

/**
 * How a theme switch is shown: one cross-fade of two snapshots of the page.
 *
 * The old way gave every element its own .4s color transition while the
 * `dark` class flipped (`html.theme-switching`). Measured on the dashboard
 * (next dev, 1440px): ~3,700 transitions at once, three ~250 ms style
 * recalcs in a row, frames stalled for ~300 ms and the switch only settled
 * ~1.7 s after the click. Text faded on its own clock against its
 * background (the "blink"), and the rule forced every transition to colors
 * only, so the auth page's sliding cards jumped when toggled.
 *
 * `document.startViewTransition` captures the page once, flips the theme
 * underneath, and cross-fades the old picture into the live new page on the
 * compositor: no per-element transition, nothing paused (the new page is
 * live, so animations keep running), and the old picture cannot flicker.
 * Where the API is missing, or the person asked for less motion, the theme
 * just changes at once.
 */

type ThemeChoice = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

/** Matches `::view-transition-*(root)` in globals.css. */
const THEME_TRANSITION_MS = 240;

/** Set on <html> while the cross-fade runs (the CSS scopes the fade to it). */
const THEME_TRANSITION_ATTRIBUTE = "data-theme-transition";

interface ViewTransitionLike {
  finished: Promise<unknown>;
  skipTransition?: () => void;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike;
};

let latest: ViewTransitionLike | null = null;

/**
 * The switch asked for whose update has not run yet. Between the click and
 * the old snapshot (~70 ms) the class on <html> still shows the old theme;
 * a second click in that window must toggle from the requested theme, and
 * every pending update applies the latest request, not its own.
 */
let pending: { choice: string; target: ResolvedTheme } | null = null;

function resolveTheme(
  choice: string,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (choice === "dark" || choice === "light") return choice;

  return systemPrefersDark ? "dark" : "light";
}

function mediaMatches(view: Window | null, query: string): boolean {
  return (
    typeof view?.matchMedia === "function" && view.matchMedia(query).matches
  );
}

/**
 * What next-themes writes on <html> for `attribute="class"`, written here
 * too so the class is on the page when the browser takes the new snapshot:
 * next-themes applies it from an effect, and the snapshot must not depend
 * on when React flushes that effect.
 */
function applyThemeClass(root: HTMLElement, theme: ResolvedTheme): void {
  root.classList.remove(theme === "dark" ? "light" : "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/**
 * During the flip, keeps only motion transitions (transform, opacity, size,
 * position) on every element. Components still carry their own
 * transition-colors/transition-all; without this the flip starts one color
 * transition per element (~3,900 on the dashboard): under the cross-fade
 * some keep fading on their own clock after it ends (41 still running at
 * 700 ms on the site), and on the instant path they cost 100-240 ms long
 * tasks. Unlike next-themes' `transition: none`, a card sliding or growing
 * (the auth page's stack) keeps its running transition: a property that
 * stays in the list is not cancelled.
 */
const MOTION_PROPERTIES = [
  "transform",
  "translate",
  "scale",
  "rotate",
  "opacity",
  "visibility",
  "filter",
  // The site's accordions open through their grid track, and
  // collapsibles/the sidebar animate their size: none of it is a color.
  "grid-template-rows",
  "grid-template-columns",
  "width",
  "height",
  "max-height",
  "min-height",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "margin",
  "padding",
  "stroke-dashoffset",
].join(",");

const SUPPRESS_COLOR_TRANSITIONS = `*,*::before,*::after{transition-property:${MOTION_PROPERTIES}!important}`;

/** Flips the class with color transitions held off for that one style change. */
function flipWithoutColorTransitions(doc: Document, flip: () => void): void {
  if (!doc.querySelector("style[data-theme-switch]")) {
    const style = doc.createElement("style");

    style.setAttribute("data-theme-switch", "");
    style.appendChild(doc.createTextNode(SUPPRESS_COLOR_TRANSITIONS));
    doc.head.appendChild(style);
  }

  flip();

  // Resolve the new colors while the rule is in place; after this no color
  // changes when it goes away, so removing it starts nothing.
  doc.defaultView?.getComputedStyle(doc.body).color;
}

/**
 * Drops the rule. Not in the same task as the flip: taking it out restyles
 * the whole tree again (~50-80 ms on the site in next dev), so it waits for
 * the new theme's first frame, or for the cross-fade to end.
 */
function releaseColorTransitions(doc: Document): void {
  doc.querySelector("style[data-theme-switch]")?.remove();
}

/** How long a retargeted press waits for its click (a slow tap still counts). */
const RETARGET_CLICK_WINDOW_MS = 1500;

/**
 * Hands a press made during the cross-fade to the element under it.
 *
 * While a transition runs, Chromium hit-tests the captured root as <html>:
 * every pointer event lands there, so a second toggle click, or a link
 * clicked right after a switch, was silently dropped for ~300 ms (measured:
 * 6 clicks 100 ms apart gave 2 switches). `pointer-events: none` on the
 * pseudo tree does not help while the root itself is captured (checked on
 * Chromium 141). So the first press on <html> ends the fade at once (the new
 * page is already live underneath, so hit-testing works again right away),
 * and the press and its click are re-dispatched to the real target.
 */
function passInputThrough(
  doc: Document,
  transition: ViewTransitionLike,
): () => void {
  const root = doc.documentElement;
  const view = doc.defaultView;
  let pressed: Element | null = null;
  let pressedAt = 0;

  const onPointerDown = (event: PointerEvent) => {
    if (
      event.target !== root ||
      typeof transition.skipTransition !== "function"
    )
      return;

    transition.skipTransition();

    const target = doc.elementFromPoint(event.clientX, event.clientY);

    if (!target || target === root) return;

    // The original press only reached <html>; replay it on the target so
    // React handlers, Radix triggers (they open on pointerdown) and outside-
    // click detection see the right element. preventDefault also drops the
    // compatibility mousedown that would still go to <html>.
    event.stopImmediatePropagation();
    event.preventDefault();
    target.dispatchEvent(new PointerEvent("pointerdown", event));
    target.dispatchEvent(new MouseEvent("mousedown", event));

    target
      .closest<HTMLElement>(
        "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      )
      ?.focus({ preventScroll: true });

    pressed = target;
    pressedAt = event.timeStamp;
  };

  const onClick = (event: MouseEvent) => {
    const from = pressed;

    pressed = null;

    if (
      !from ||
      event.target !== root ||
      event.timeStamp - pressedAt > RETARGET_CLICK_WINDOW_MS
    ) {
      return;
    }

    // The click goes to the common ancestor of the press (<html>) and the
    // release; send it where the press and the release really were.
    const released = doc.elementFromPoint(event.clientX, event.clientY);
    const target =
      released && (from.contains(released) || released.contains(from))
        ? released
        : null;

    event.stopImmediatePropagation();
    target?.dispatchEvent(new MouseEvent("click", event));
  };

  view?.addEventListener("pointerdown", onPointerDown, true);
  view?.addEventListener("click", onClick, true);

  return () => {
    view?.removeEventListener("pointerdown", onPointerDown, true);

    // A skipped transition finishes before the click of the press that
    // skipped it arrives; keep listening for that click a little longer.
    if (pressed) {
      view?.setTimeout(
        () => view.removeEventListener("click", onClick, true),
        RETARGET_CLICK_WINDOW_MS,
      );
    } else {
      view?.removeEventListener("click", onClick, true);
    }
  };
}

/**
 * Switches the theme through next-themes' `setTheme`, with the cross-fade
 * when it would change what is on screen. Returns how it was shown, for the
 * tests and the measurements.
 */
function switchTheme(
  setTheme: (theme: string) => void,
  choice: ThemeChoice | string,
  doc: Document = document,
): "view-transition" | "instant" {
  const root = doc.documentElement;
  const view = doc.defaultView;
  const target = resolveTheme(
    choice,
    mediaMatches(view, "(prefers-color-scheme: dark)"),
  );
  const changesScreen = pending
    ? pending.target !== target
    : !root.classList.contains(target);
  const start = (doc as ViewTransitionDocument).startViewTransition;

  if (!changesScreen) {
    // Same picture: no fade. A pending update stores this choice instead.
    if (pending) pending.choice = choice;
    else setTheme(choice);

    return "instant";
  }

  pending = { choice, target };

  const flip = () => {
    const request = pending ?? { choice, target };

    pending = null;
    flipWithoutColorTransitions(doc, () => {
      // Render the consumers (icons, labels) in this same frame/snapshot.
      flushSync(() => setTheme(request.choice));
      applyThemeClass(root, request.target);
    });
  };

  if (
    typeof start !== "function" ||
    mediaMatches(view, "(prefers-reduced-motion: reduce)")
  ) {
    flip();

    const release = () =>
      view?.setTimeout(() => releaseColorTransitions(doc), 0);

    if (typeof view?.requestAnimationFrame === "function")
      view.requestAnimationFrame(release);
    else release();

    return "instant";
  }

  root.setAttribute(THEME_TRANSITION_ATTRIBUTE, "");

  const transition = start.call(doc, flip);

  // A second click mid-fade starts a new transition and skips this one; only
  // the latest one removes the marker when it ends.
  latest = transition;

  const stopPassingInput = passInputThrough(doc, transition);

  void transition.finished
    .catch(() => undefined)
    .then(() => {
      stopPassingInput();

      if (latest !== transition) return;

      latest = null;
      root.removeAttribute(THEME_TRANSITION_ATTRIBUTE);
      releaseColorTransitions(doc);
    });

  return "view-transition";
}

/**
 * The theme the round toggle should switch to, read at click time: from the
 * switch still in flight, else from the class on <html>. React state lags
 * behind a click made before the previous update ran.
 */
function toggleTarget(doc: Document = document): ResolvedTheme {
  const current =
    pending?.target ??
    (doc.documentElement.classList.contains("dark") ? "dark" : "light");

  return current === "dark" ? "light" : "dark";
}

export {
  RETARGET_CLICK_WINDOW_MS,
  SUPPRESS_COLOR_TRANSITIONS,
  THEME_TRANSITION_ATTRIBUTE,
  THEME_TRANSITION_MS,
  applyThemeClass,
  resolveTheme,
  switchTheme,
  toggleTarget,
};
export type { ResolvedTheme, ThemeChoice };
