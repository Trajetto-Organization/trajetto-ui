/**
 * The ephemeral hints a conversation shows about the other side, and the
 * rules that govern them.
 *
 * Pure on purpose: no React, no socket, no clock of its own. Which sentence
 * wins, how often it is re-sent and how long it survives silence are
 * decisions, and a decision that can be read on its own can be tested on
 * its own.
 *
 * Both hints work the same way, and that is the contract: presence is told
 * by REPEATING while it is true, never by a pair of start/stop events. The
 * receiving side lights up on a pulse and puts itself out when the pulses
 * stop, so nothing has to arrive for it to be correct — a tab that closes,
 * a socket that drops, a phone that loses signal all end the hint by saying
 * nothing at all.
 */

/**
 * How often "digitando..." goes out while the keyboard is busy.
 *
 * A throttle read from the other end: the hint is not sent per keystroke,
 * it is sent on this beat for as long as keys keep arriving, and the beat
 * stops when the hands do.
 */
const TYPING_PULSE_INTERVAL_MS = 2_500;

/**
 * How often "gravando áudio..." goes out while the microphone is capturing.
 *
 * The pulse follows the CAPTURE and nothing else — not the intent to
 * record, not a status on screen. A pause, a lost microphone, a pane that
 * went away and a tab that closed all stop the capture, so they all stop
 * the pulse, and the hint dies of silence without anybody having to notice
 * what happened and send word.
 *
 * A voice note is capped at two minutes, so the worst case is some fifty
 * events for a whole recording — less than the keyboard already produces
 * for a couple of sentences.
 */
const RECORDING_PULSE_INTERVAL_MS = 2_000;

/**
 * How long "digitando..." survives with nothing else arriving.
 *
 * One whole missed pulse plus a second of network, which is what makes
 * silence mean "the hands stopped" instead of "a packet was late".
 */
const TYPING_HINT_VISIBLE_MS = 3_500;

/**
 * How long "gravando áudio..." survives with nothing else arriving.
 *
 * Four seconds, on the same reasoning as the typing one and NOT on the
 * length of a recording. It used to be the audio ceiling plus twenty
 * seconds, because the hint announced itself twice and never in between:
 * any lost `false` then left a sentence standing over a dead conversation
 * for two and a half minutes. The pulse is what removed the need for a net
 * that big, and the ceiling has nothing to do with this number any more.
 */
const RECORDING_HINT_VISIBLE_MS = 4_000;

/**
 * The least slack a window may leave over the pulse feeding it.
 *
 * The invariant, stated where the numbers are: a window has to outlast its
 * own pulse by enough that ONE late packet does not put the hint out. Set
 * the two numbers too close together and the bubble blinks on every hiccup
 * — which reads as a broken chat, not as a careful one.
 */
const MIN_HINT_PULSE_SLACK_MS = 1_000;

/** The two things the other side can be doing, in the order they are told. */
type ChatHint = "recording" | "typing";

interface ChatHintFlags {
  typing: boolean;
  recording: boolean;
}

/**
 * Which hint is announced, including when both are lit.
 *
 * Both can be true at the very same instant on the web — a hand on the
 * keyboard and a voice note recording beside it — and the line has room for
 * one sentence. Recording wins because it is the more specific news: it
 * says what is coming and roughly how long the wait is, where "digitando"
 * only says somebody is busy.
 */
function activeChatHint(flags: ChatHintFlags): ChatHint | null {
  if (flags.recording) return "recording";
  if (flags.typing) return "typing";

  return null;
}

/**
 * Everything that varies per hint, in one table.
 *
 * A `Record<ChatHint, …>` and not three ternaries, because a ternary has an
 * else: a third hint added to the union would silently inherit the typing
 * sentence, the typing beat and the typing window — pulsing slower than its
 * own window and blinking on the other side — with the compiler and the whole
 * suite green. Here, adding a member to `ChatHint` fails to compile until its
 * row exists, and `EVERY_HINT` is derived from these keys instead of being
 * typed out a second time.
 */
const HINT_TIMINGS: Record<
  ChatHint,
  { label: string; pulseMs: number; visibleMs: number }
> = {
  recording: {
    label: "gravando áudio...",
    pulseMs: RECORDING_PULSE_INTERVAL_MS,
    visibleMs: RECORDING_HINT_VISIBLE_MS,
  },
  typing: {
    label: "digitando...",
    pulseMs: TYPING_PULSE_INTERVAL_MS,
    visibleMs: TYPING_HINT_VISIBLE_MS,
  },
};

/** Every hint, so a test can walk all of them and never miss a new one. */
const EVERY_HINT = Object.keys(HINT_TIMINGS) as ChatHint[];

/** The sentence for each hint, decided in one place for every surface. */
function chatHintLabel(hint: ChatHint): string {
  return HINT_TIMINGS[hint].label;
}

/** How often this hint is re-sent while what it describes is still true. */
function chatHintPulseMs(hint: ChatHint): number {
  return HINT_TIMINGS[hint].pulseMs;
}

/** How long a hint of this kind is kept alive without another pulse. */
function chatHintVisibleMs(hint: ChatHint): number {
  return HINT_TIMINGS[hint].visibleMs;
}

export {
  EVERY_HINT,
  activeChatHint,
  chatHintLabel,
  chatHintPulseMs,
  chatHintVisibleMs,
  TYPING_PULSE_INTERVAL_MS,
  RECORDING_PULSE_INTERVAL_MS,
  TYPING_HINT_VISIBLE_MS,
  RECORDING_HINT_VISIBLE_MS,
  MIN_HINT_PULSE_SLACK_MS,
};

export type { ChatHint, ChatHintFlags };
