import { test, expect } from "@playwright/test";

import {
  AUDIO_COUNTDOWN_LEAD_MS,
  MAX_AUDIO_DURATION_MS,
  MIN_AUDIO_DURATION_MS,
  SERVER_AUDIO_MIME_TYPES,
  baseMimeType,
  pickRecorderFormat,
  recordingCountdownSeconds,
  recordingIsSendable,
  recordingReachedLimit,
  recordingRemainingMs,
  reportedRecordingMs,
  tickToleranceMs,
  uploadContentTypeFor,
  uploadContentTypeForRecording,
  whyRecordingIsNotSendable,
} from "../../src/features/deliveries/chat/lib/audio-recording";

/** The beat the recorder reads its clock on. */
const TICK_MS = 250;

test.describe("voice note ceiling", () => {
  test("mirrors the two minutes the server enforces", () => {
    // Not a knob: the API refuses anything past it and the driver's app
    // stops itself at the same number.
    expect(MAX_AUDIO_DURATION_MS).toBe(120_000);
  });

  test("stops itself at the ceiling and not before", () => {
    expect(recordingReachedLimit(119_999)).toBe(false);
    expect(recordingReachedLimit(120_000)).toBe(true);
    expect(recordingReachedLimit(130_000)).toBe(true);
  });

  test("never reports a negative allowance", () => {
    expect(recordingRemainingMs(30_000)).toBe(90_000);
    expect(recordingRemainingMs(200_000)).toBe(0);
  });

  test("shows the countdown only in the last stretch", () => {
    const quiet = MAX_AUDIO_DURATION_MS - AUDIO_COUNTDOWN_LEAD_MS - 1;

    expect(recordingCountdownSeconds(quiet)).toBeNull();

    // Rounded UP, so "faltam 1s" never means the cut already happened.
    expect(recordingCountdownSeconds(MAX_AUDIO_DURATION_MS - 15_000)).toBe(15);
    expect(recordingCountdownSeconds(MAX_AUDIO_DURATION_MS - 1)).toBe(1);
    expect(recordingCountdownSeconds(MAX_AUDIO_DURATION_MS)).toBe(0);
  });

  test("does not refuse a note for a limit it enforced itself", () => {
    // One beat of overshoot is the timer's own latency, and the recording is
    // worth more than the millisecond.
    expect(reportedRecordingMs(120_120, TICK_MS)).toBe(MAX_AUDIO_DURATION_MS);
    expect(reportedRecordingMs(120_250, TICK_MS)).toBe(MAX_AUDIO_DURATION_MS);

    // Past that the clock was genuinely starved, and lying about it to get
    // the note through would be worse than refusing it.
    expect(reportedRecordingMs(126_000, TICK_MS)).toBe(126_000);

    expect(reportedRecordingMs(45_000, TICK_MS)).toBe(45_000);
  });

  test("forgives the beat that actually ran, not the one on paper", () => {
    /**
     * The two minutes this module swears not to destroy were being destroyed
     * here. Chrome clamps `setInterval` in a background tab to a second or
     * more, so the ceiling reads 120.700 ms; forgiving only the nominal
     * 250 ms made `whyRecordingIsNotSendable` answer "too-long" and refused
     * a recording this very code had stopped at two minutes.
     *
     * The overshoot forgiven is exactly the overshoot the beat caused: at
     * the previous beat the limit had not been reached, so everything past
     * it happened inside a beat whose length the browser chose.
     */
    const starved = tickToleranceMs(TICK_MS, 1_000);

    expect(starved).toBe(1_000);
    expect(reportedRecordingMs(120_700, starved)).toBe(MAX_AUDIO_DURATION_MS);
    expect(recordingIsSendable(reportedRecordingMs(120_700, starved))).toBe(
      true,
    );

    // A beat that ran on time earns nothing extra, and a punctual beat can
    // never have let a 700 ms overshoot happen in the first place.
    expect(tickToleranceMs(TICK_MS, 60)).toBe(TICK_MS);
    expect(reportedRecordingMs(120_700, tickToleranceMs(TICK_MS, 60))).toBe(
      120_700,
    );
  });

  test("a beat with no measurement falls back on the nominal one", () => {
    // The first beat of a recording, and anything a clock going backwards
    // produces: never a tolerance smaller than the one already promised.
    expect(tickToleranceMs(TICK_MS, 0)).toBe(TICK_MS);
    expect(tickToleranceMs(TICK_MS, -5_000)).toBe(TICK_MS);
    expect(tickToleranceMs(TICK_MS, Number.NaN)).toBe(TICK_MS);
  });

  test("tells a graze apart from a marathon", () => {
    expect(whyRecordingIsNotSendable(MIN_AUDIO_DURATION_MS - 1)).toBe(
      "too-short",
    );
    expect(whyRecordingIsNotSendable(MAX_AUDIO_DURATION_MS + 1)).toBe(
      "too-long",
    );

    expect(whyRecordingIsNotSendable(30_000)).toBeNull();

    expect(recordingIsSendable(MIN_AUDIO_DURATION_MS)).toBe(true);
    expect(recordingIsSendable(MAX_AUDIO_DURATION_MS)).toBe(true);
    expect(recordingIsSendable(500)).toBe(false);
  });
});

test.describe("recorder format negotiation", () => {
  test("strips the codec off a recorder mime type", () => {
    expect(baseMimeType("audio/mp4;codecs=mp4a.40.2")).toBe("audio/mp4");
    expect(baseMimeType("AUDIO/MP4")).toBe("audio/mp4");
    expect(baseMimeType("audio/webm; codecs=opus")).toBe("audio/webm");
  });

  test("signs the upload with the base type, never the codec string", () => {
    // The API compares the content type by equality, so `audio/mp4;codecs=…`
    // would be refused at the presign even though the format is right.
    expect(uploadContentTypeFor("audio/mp4;codecs=mp4a.40.2")).toBe(
      "audio/mp4",
    );

    expect(uploadContentTypeFor("audio/webm;codecs=opus")).toBeNull();
    expect(uploadContentTypeFor("audio/ogg")).toBeNull();
  });

  test("records AAC in MP4 where the browser can produce it", () => {
    // Safari and recent Chromium.
    const format = pickRecorderFormat((mimeType) =>
      mimeType.startsWith("audio/mp4"),
    );

    expect(format?.recorderMimeType).toBe("audio/mp4;codecs=mp4a.40.2");
    expect(format?.uploadContentType).toBe("audio/mp4");

    // And what it signs with has to be on the API's list, verbatim.
    expect(SERVER_AUDIO_MIME_TYPES).toContain(format?.uploadContentType);
  });

  test("falls back to the plain mp4 request", () => {
    const format = pickRecorderFormat((mimeType) => mimeType === "audio/mp4");

    expect(format?.recorderMimeType).toBe("audio/mp4");
    expect(format?.uploadContentType).toBe("audio/mp4");
  });

  test("refuses to record where only WebM is on offer", () => {
    /**
     * The decision this whole module exists for: Firefox records Opus in
     * WebM and nothing else, iOS cannot play it, and the API refuses it. The
     * honest answer is no microphone with a reason — not a note half the
     * fleet cannot hear, and not a send that fails at the presign.
     */
    const format = pickRecorderFormat((mimeType) =>
      mimeType.startsWith("audio/webm"),
    );

    expect(format).toBeNull();
  });

  test("what the browser produced decides what the upload is signed with", () => {
    expect(
      uploadContentTypeForRecording("audio/mp4;codecs=mp4a.40.2", "audio/mp4"),
    ).toBe("audio/mp4");
  });

  test("never relabels a blob as a format it is not", () => {
    /**
     * The gate that used to be unreachable. The recorder fell back on the
     * content type it had ASKED for whenever the produced one was off the
     * server list — so a browser that answered `audio/webm` had its blob
     * signed `audio/mp4`, which the API accepts (it compares the string) and
     * no iPhone in the fleet can play back. Exactly the outcome the whole
     * negotiation exists to prevent.
     */
    expect(
      uploadContentTypeForRecording("audio/webm;codecs=opus", "audio/mp4"),
    ).toBeNull();

    expect(uploadContentTypeForRecording("audio/ogg", "audio/mp4")).toBeNull();
  });

  test("a browser that reports nothing falls back on what was asked for", () => {
    // The one case a fallback may cover: "the recorder did not say", never
    // "the recorder said something else".
    expect(uploadContentTypeForRecording("", "audio/mp4")).toBe("audio/mp4");
    expect(uploadContentTypeForRecording("   ", "audio/mp4")).toBe("audio/mp4");

    expect(uploadContentTypeForRecording("", null)).toBeNull();
  });

  test("refuses when the browser claims to support nothing", () => {
    expect(pickRecorderFormat(() => false)).toBeNull();
  });

  test("never hands back a format the server would reject", () => {
    // Even a browser that says yes to everything only gets something the
    // API's list contains.
    const format = pickRecorderFormat(() => true);

    expect(format).not.toBeNull();
    expect(SERVER_AUDIO_MIME_TYPES).toContain(format?.uploadContentType);
  });
});
