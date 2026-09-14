/**
 * The rules a voice note recorded in the browser has to obey.
 *
 * Two families live here. The ceiling and the countdown, mirrored from the
 * driver's app (`features/chat/chat-rules.ts` in the mobile repo) so that a
 * note recorded at the base and one recorded on the road behave the same;
 * and the format negotiation, which is what decides whether this browser is
 * allowed to record at all.
 *
 * Pure on purpose: no React, no MediaRecorder, no clock of its own. The
 * recorder hands its own `isTypeSupported` in, which is also what makes the
 * negotiation testable without a browser that happens to support MP4.
 */

/**
 * The ceiling on a voice note, mirroring the API's
 * `CHAT_AUDIO_MAX_DURATION_MS` — two minutes.
 *
 * Two minutes is a decision, not a technical limit, and it is the same
 * decision on all three sides: the server refuses anything longer, the
 * driver's app stops itself there, and so does this. Nothing here may drift
 * from that number on its own.
 */
const MAX_AUDIO_DURATION_MS = 2 * 60 * 1000;

/** A click that barely grazed the microphone is noise, not a voice note. */
const MIN_AUDIO_DURATION_MS = 1_000;

/**
 * How long before the ceiling the countdown starts.
 *
 * Long enough to finish the sentence being spoken, short enough that it is
 * not a nag on every note — the same fifteen seconds the app uses.
 */
const AUDIO_COUNTDOWN_LEAD_MS = 15_000;

/** How the ceiling is written wherever it has to be explained. */
const AUDIO_LIMIT_LABEL = "2 minutos";

/** Why a finished recording cannot be sent, or `null` when it can. */
type RecordingRejection = "too-short" | "too-long";

/** What is left of the allowance, never negative. */
function recordingRemainingMs(elapsedMs: number): number {
  return Math.max(0, MAX_AUDIO_DURATION_MS - elapsedMs);
}

/** Whether the recorder has to stop itself now. */
function recordingReachedLimit(elapsedMs: number): boolean {
  return elapsedMs >= MAX_AUDIO_DURATION_MS;
}

/**
 * The seconds to show in "faltam Ns", or `null` while the ceiling is still
 * far enough away to be nobody's business.
 *
 * Rounded UP, so the number on screen is never optimistic: "faltam 1s" means
 * there is still up to a second left, not that the cut already happened.
 */
function recordingCountdownSeconds(elapsedMs: number): number | null {
  const remaining = recordingRemainingMs(elapsedMs);

  if (remaining > AUDIO_COUNTDOWN_LEAD_MS) return null;

  return Math.ceil(remaining / 1000);
}

/**
 * The length to declare for a finished recording.
 *
 * The clock is read on a beat, so a recording the ceiling stopped can
 * measure PAST it. Refusing a note for overrunning a limit this very code
 * enforced would be indefensible, so an overshoot within the tolerance is
 * reported as the ceiling exactly. Anything beyond it is reported as
 * measured — rounding that down would lie to the server instead of refusing
 * honestly.
 *
 * What the tolerance has to be is `tickToleranceMs`, and it is the whole of
 * the fix: it is how late the beat ACTUALLY was, never how late it was
 * supposed to be.
 */
function reportedRecordingMs(elapsedMs: number, toleranceMs: number): number {
  const overshoot = elapsedMs - MAX_AUDIO_DURATION_MS;

  if (overshoot > 0 && overshoot <= toleranceMs) return MAX_AUDIO_DURATION_MS;

  return elapsedMs;
}

/**
 * How much overshoot a beat has earned the recording.
 *
 * The ceiling is checked on a beat, so the overshoot the check can possibly
 * see is bounded by how long that beat actually took: at the previous beat
 * the limit had not been reached, so everything past it happened inside this
 * one. Forgiving the NOMINAL beat instead is what destroyed real recordings:
 * Chrome clamps `setInterval` in a background tab to a second or more, and a
 * main thread busy with a photo album does the same for a few hundred
 * milliseconds — the clock then reads 120.700 ms, only 250 ms of it is
 * forgiven, and a note this very code stopped at two minutes comes back
 * refused for being longer than two minutes.
 *
 * The overshoot forgiven here is precisely the overshoot this code caused by
 * not looking sooner. The speaker did not choose to keep talking; the
 * recorder failed to stop them, and they must not pay for it.
 *
 * Reading the length off the recorder instead — the way the driver app took
 * the wall clock out of the loop — has no equivalent in the browser worth
 * the risk: `MediaRecorder` reports no duration, chunk sizes describe a
 * bitrate and not a time, and an `AudioContext` clock only advances while
 * its graph is rendering, so getting it wrong silently disables the ceiling
 * altogether. A beat that reports its own lateness cannot fail that way.
 */
function tickToleranceMs(nominalTickMs: number, actualTickMs: number): number {
  if (!Number.isFinite(actualTickMs) || actualTickMs <= 0) return nominalTickMs;

  return Math.max(nominalTickMs, actualTickMs);
}

/**
 * Why a finished recording cannot be sent — or `null` when it can.
 *
 * The reason is part of the answer because "não deu para enviar" is not one:
 * a graze and a marathon are opposite mistakes, fixed in opposite ways.
 */
function whyRecordingIsNotSendable(
  durationMs: number,
): RecordingRejection | null {
  if (durationMs < MIN_AUDIO_DURATION_MS) return "too-short";
  if (durationMs > MAX_AUDIO_DURATION_MS) return "too-long";

  return null;
}

/** Whether a finished recording is worth sending. */
function recordingIsSendable(durationMs: number): boolean {
  return whyRecordingIsNotSendable(durationMs) === null;
}

// ===================================================== format negotiation

/**
 * What the API takes for a chat attachment of the audio kind — the exact
 * list in its `src/config/upload.ts`, and the reason this negotiation exists
 * at all.
 *
 * WebM/Opus, which is what a browser's MediaRecorder produces by default, is
 * deliberately NOT on it: iOS cannot play it back, so a note recorded that
 * way would be a message half the fleet cannot hear. The upload is refused
 * at the presign, which means there is nothing to gain from trying.
 */
const SERVER_AUDIO_MIME_TYPES = [
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
] as const;

/**
 * What to ask MediaRecorder for, best first.
 *
 * AAC-LC inside MP4 is the target: it is what the driver's app records and
 * the one compressed format every browser and every phone plays back. The
 * bare `audio/mp4` is the same request without naming the codec, which is
 * how Safari prefers to be asked.
 */
const RECORDER_MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/aac",
  "audio/m4a",
] as const;

/** The name the note travels under; the API keys it by content type anyway. */
const VOICE_NOTE_FILE_NAME = "voice-note.m4a";

interface RecorderFormat {
  /** Handed to `new MediaRecorder(stream, { mimeType })`. */
  recorderMimeType: string;

  /** Handed to the presign — and it has to be one the API's list contains. */
  uploadContentType: string;

  fileName: string;
}

/** `audio/mp4;codecs=mp4a.40.2` → `audio/mp4`. */
function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

/**
 * The content type to sign an upload with, or `null` when what came out of
 * the recorder is not something the server takes.
 *
 * Separate from the negotiation because the two questions are asked at
 * different moments: the second one is asked of the blob that actually came
 * out, which is not always the format that was requested.
 */
function uploadContentTypeFor(producedMimeType: string): string | null {
  const base = baseMimeType(producedMimeType);

  return (SERVER_AUDIO_MIME_TYPES as readonly string[]).includes(base)
    ? base
    : null;
}

/**
 * What to sign the finished recording with, or `null` when there is nothing
 * honest to sign it with.
 *
 * The rule is that what the browser PRODUCED decides, and only a browser
 * that says nothing at all falls back on what was asked of it. That is the
 * one case a fallback may cover: "the recorder did not report a type", never
 * "the recorder reported one the server does not take".
 *
 * The recorder used to fall back whenever the produced type was off the
 * server list, which made the refusal below unreachable and did the exact
 * thing the negotiation exists to prevent: a blob the browser wrote as
 * WebM/Opus was relabelled `audio/mp4`, sailed through the presign — the API
 * only compares the string — and became a voice note no iPhone in the fleet
 * can play back.
 */
function uploadContentTypeForRecording(
  producedMimeType: string,
  requestedContentType: string | null,
): string | null {
  if (!producedMimeType.trim()) return requestedContentType;

  return uploadContentTypeFor(producedMimeType);
}

/**
 * The format to record in, or `null` when this browser has none the fleet
 * can listen to.
 *
 * `null` is a real answer and the caller has to honour it by turning the
 * microphone off with an explanation. Recording WebM anyway would produce a
 * message the API refuses and, if it somehow got through, a message half the
 * drivers cannot play — and transcoding in the browser is a different, much
 * larger decision than a record button.
 */
function pickRecorderFormat(
  isTypeSupported: (mimeType: string) => boolean,
): RecorderFormat | null {
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    if (!isTypeSupported(candidate)) continue;

    const uploadContentType = uploadContentTypeFor(candidate);

    if (!uploadContentType) continue;

    return {
      recorderMimeType: candidate,
      uploadContentType,
      fileName: VOICE_NOTE_FILE_NAME,
    };
  }

  return null;
}

export {
  MAX_AUDIO_DURATION_MS,
  MIN_AUDIO_DURATION_MS,
  AUDIO_COUNTDOWN_LEAD_MS,
  AUDIO_LIMIT_LABEL,
  SERVER_AUDIO_MIME_TYPES,
  RECORDER_MIME_CANDIDATES,
  VOICE_NOTE_FILE_NAME,
  recordingRemainingMs,
  recordingReachedLimit,
  recordingCountdownSeconds,
  reportedRecordingMs,
  tickToleranceMs,
  whyRecordingIsNotSendable,
  recordingIsSendable,
  baseMimeType,
  uploadContentTypeFor,
  uploadContentTypeForRecording,
  pickRecorderFormat,
};

export type { RecordingRejection, RecorderFormat };
