/**
 * The chat composer's length feedback (decision 16.700, applied to a chat).
 *
 * A chat box is not a form: no message under it on blur, and the send button
 * already says "nothing to send". The one rule a person can break is the
 * length, and the field cuts the text at the limit, so a long paste lost its
 * end without a word. The count appears as the limit nears and says so when
 * it is reached.
 */
const CHAT_MESSAGE_MAX = 2000;

interface ComposerLengthNotice {
  /** "1.850/2.000". */
  count: string;
  /** The sentence at the limit, or null below it. */
  limitMessage: string | null;
}

const format = (value: number): string => value.toLocaleString("pt-BR");

function composerLengthNotice(
  length: number,
  max: number = CHAT_MESSAGE_MAX,
): ComposerLengthNotice | null {
  // The count shows from 90% of the limit: early enough to trim, late
  // enough not to sit under every short message.
  if (length < Math.floor(max * 0.9)) return null;

  return {
    count: `${format(length)}/${format(max)}`,
    limitMessage:
      length >= max
        ? `Limite de ${format(max)} caracteres atingido: o que passar disso não entra na mensagem.`
        : null,
  };
}

export { CHAT_MESSAGE_MAX, composerLengthNotice };
export type { ComposerLengthNotice };
