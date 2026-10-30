/**
 * Inputs only a person makes. Lighthouse, crawlers and link previews make
 * none, so on their visit the captcha loads nothing of Cloudflare's: no
 * frame, no cookie and no console message of its own. A browser holding
 * cloudflare.com cookies sent them along with the widget's requests, and
 * Lighthouse counted them as third-party cookies: Best Practices 77 on
 * /login and /forgot (100 once the widget waits for the person).
 *
 * Focus is not one of them: the forgot form focuses its field on load.
 */
const PERSON_INPUTS = ["pointerdown", "keydown", "touchstart"] as const;

/**
 * A pointer moving over the form also counts. Firefox before 119 and Safari
 * before 17.5 dispatch nothing for a press on a disabled button, so someone
 * whose password the browser filled in and who goes straight for the
 * disabled submit would otherwise never start the check.
 */
const AREA_INPUTS = ["pointermove"] as const;

const LISTENER = { capture: true, passive: true } as const;

/**
 * Calls back once a person is using the page (or moves a pointer over
 * `area`); returns what stops waiting.
 *
 * A page the person already used calls back at once, through the browser's
 * sticky activation: the quote's step 3, reached by clicking on the same
 * page, and, in Chrome, a page reached by a click on a link of the site.
 */
function whenPersonActs(
  callback: () => void,
  area: Element | null = null,
): () => void {
  // Missing before Firefox 120 and Safari 16.4 (and in jsdom): those wait
  // for the next input.
  const activation = (navigator as { userActivation?: UserActivation })
    .userActivation;

  if (activation?.hasBeenActive) {
    callback();

    return () => undefined;
  }

  const stop = (): void => {
    for (const type of PERSON_INPUTS) {
      window.removeEventListener(type, act, LISTENER);
    }
    for (const type of AREA_INPUTS) {
      area?.removeEventListener(type, act, LISTENER);
    }
  };

  function act(): void {
    stop();
    callback();
  }

  for (const type of PERSON_INPUTS) {
    window.addEventListener(type, act, LISTENER);
  }
  for (const type of AREA_INPUTS) {
    area?.addEventListener(type, act, LISTENER);
  }

  return stop;
}

export { AREA_INPUTS, PERSON_INPUTS, whenPersonActs };
