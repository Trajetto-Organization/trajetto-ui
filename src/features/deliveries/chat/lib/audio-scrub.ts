/**
 * Position ↔ proportion for the voice-note track.
 *
 * Pure and isolated on purpose: click, drag and keyboard must land on the
 * same number, and three lookalike formulas spread over an event-handler
 * file is exactly how they stop agreeing. Everything here is a plain
 * function over plain numbers — no DOM, no audio element, no React.
 */

/**
 * The area the track is actually *drawn* in, in client coordinates.
 *
 * The distinction matters: the clickable box and the painted bars have to be
 * the same rectangle. When they are not — a padded box, or bars that only
 * reach part-way across a wider container — every seek lands a few percent
 * off, always in the same direction, and the player feels broken rather than
 * imprecise. `bounds` is the painted one.
 */
interface TrackBounds {
  left: number;
  width: number;
}

/** Horizontal padding of the track element, in pixels. */
interface TrackInsets {
  left: number;
  right: number;
}

const clampRatio = (value: number): number =>
  Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;

/**
 * The painted rectangle: the element's border box minus its padding.
 *
 * The gaps *between* the bars are deliberately not discounted — they sit
 * inside the painted area, between the first bar's left edge and the last
 * bar's right edge, and the bars themselves flex to fill exactly this box.
 * Subtracting them would shrink the map below what the eye is given.
 */
const boundsFromRect = (
  rect: { left: number; width: number },
  insets: TrackInsets,
): TrackBounds => ({
  left: rect.left + insets.left,
  width: Math.max(rect.width - insets.left - insets.right, 0),
});

/** Where a pointer landed, as a proportion of the painted track. */
const ratioFromClientX = (clientX: number, bounds: TrackBounds): number =>
  bounds.width > 0 ? clampRatio((clientX - bounds.left) / bounds.width) : 0;

/** A moment of the audio, as a proportion of it. */
const ratioFromSeconds = (seconds: number, duration: number): number =>
  duration > 0 ? clampRatio(seconds / duration) : 0;

/** A proportion of the audio, as a moment of it. */
const secondsFromRatio = (ratio: number, duration: number): number =>
  duration > 0 ? clampRatio(ratio) * duration : 0;

/**
 * Whether a bar is behind the playhead.
 *
 * Half a bar of offset so the bar *under* the finger is the one that flips,
 * instead of the one after it.
 */
const isBarPlayed = (index: number, barCount: number, ratio: number): boolean =>
  barCount > 0 && (index + 0.5) / barCount <= ratio;

/**
 * A seek that was asked for and is still being waited on: where the audio
 * was when the finger let go, and where it was asked to go.
 */
interface ScrubTarget {
  from: number;
  to: number;
}

/**
 * How far off the asked-for position the element may report and still count
 * as having arrived.
 *
 * A media element snaps a seek to a decodable point, so it lands *near* the
 * request and almost never exactly on it. A quarter of a second is well
 * inside what a finger can aim at on a two-minute note, and comfortably
 * outside the frame-boundary rounding.
 */
const SCRUB_SETTLE_TOLERANCE_SECONDS = 0.25;

/**
 * Whether the element has actually taken the position the scrub asked for.
 *
 * This is the rule behind "letting go must not bounce back". Setting
 * `currentTime` starts a seek that finishes later, and for the frames in
 * between the element keeps reporting where the audio still is — so the
 * handle has to stay where the finger left it until this answers true.
 *
 * Direction is part of the question and not a detail: playback carries on
 * after the release, so a forward scrub is equally arrived once the audio
 * has gone PAST what was asked for, while a backward one is arrived once it
 * is at or before it. Comparing only the distance would leave a forward
 * scrub unconfirmed forever on a note that kept playing.
 */
const hasSettledAt = (
  reportedSeconds: number,
  target: ScrubTarget,
  toleranceSeconds: number = SCRUB_SETTLE_TOLERANCE_SECONDS,
): boolean => {
  if (!Number.isFinite(reportedSeconds)) return false;

  if (Math.abs(reportedSeconds - target.to) <= toleranceSeconds) return true;

  return target.to >= target.from
    ? reportedSeconds >= target.to
    : reportedSeconds <= target.to;
};

export {
  clampRatio,
  boundsFromRect,
  ratioFromClientX,
  ratioFromSeconds,
  secondsFromRatio,
  isBarPlayed,
  hasSettledAt,
  SCRUB_SETTLE_TOLERANCE_SECONDS,
};

export type { TrackBounds, TrackInsets, ScrubTarget };
