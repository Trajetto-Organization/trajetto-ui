/**
 * Turning a window load into an answer that cannot surprise its caller.
 *
 * The conversation pane walks its window with four loads, and every one of
 * them holds something that has to be given back: a slot in the in-flight
 * counter that is the real mutual exclusion between the three buttons, and
 * the spinner state that draws them disabled. Both used to be released on
 * the line after the await, in straight-line code — which a rejection skips.
 *
 * A single rejected fetch therefore left `inFlightLoads` permanently above
 * zero and all three buttons disabled for the rest of the session, "Ir para
 * a última mensagem" included: the only way back to the arrivals the pane
 * was holding. The dot stayed lit announcing content nothing could show.
 *
 * So the rule is stated once, here, as a plain function: a load answers
 * either a page or a message, never an exception. The action itself was
 * fixed not to reject (`list-chat-messages` read its cookie outside its own
 * try), and this covers what that fix cannot — a server action can fail in
 * transport, where none of its own code runs at all.
 *
 * Pure: no React, no fetching, no clock.
 */

/** The shape every chat action answers with. */
interface WindowLoadAnswer<T> {
  success: boolean;
  message: string;
  data?: T | null;
}

/**
 * A settled load: a page, or a sentence to show the reader.
 *
 * Never "a page that might be null": `success: true` with no payload is the
 * same nothing as a refusal, and telling the two apart at every call site is
 * how three of them ended up not telling them apart at all.
 */
type WindowLoadOutcome<T> =
  { ok: true; page: T } | { ok: false; message: string };

/**
 * Runs one window load and answers what happened, whatever happened.
 *
 * `fallbackMessage` is what a rejection is shown as: an exception carries no
 * sentence anybody should read, and a load that fails silently is exactly
 * the failure this module exists to end.
 */
async function settleWindowLoad<T>(
  request: () => Promise<WindowLoadAnswer<T>>,
  fallbackMessage: string,
): Promise<WindowLoadOutcome<T>> {
  try {
    const answer = await request();

    if (!answer.success || !answer.data) {
      return { ok: false, message: answer.message || fallbackMessage };
    }

    return { ok: true, page: answer.data };
  } catch {
    return { ok: false, message: fallbackMessage };
  }
}

export { settleWindowLoad };
export type { WindowLoadAnswer, WindowLoadOutcome };
