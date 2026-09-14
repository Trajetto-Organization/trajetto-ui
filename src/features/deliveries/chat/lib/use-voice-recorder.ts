"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  pickRecorderFormat,
  recordingReachedLimit,
  reportedRecordingMs,
  tickToleranceMs,
  uploadContentTypeForRecording,
  VOICE_NOTE_FILE_NAME,
  type RecorderFormat,
} from "./audio-recording";

/**
 * How often the clock is read — the same beat the driver app uses.
 *
 * It is the NOMINAL beat and nothing more: how long a beat actually took is
 * measured on every tick, because that, and not this number, is the
 * overshoot the ceiling is allowed to forgive. See `tickToleranceMs`.
 */
const RECORDING_TICK_MS = 250;

type RecorderStatus = "idle" | "recording" | "paused" | "captured";

/**
 * Why a recording is sitting on the send button instead of still running.
 *
 * The bar says a different sentence for each, and saying the wrong one is
 * not cosmetic: "limite de 2 minutos atingido" over a recording the
 * microphone dropped at eleven seconds tells the user to be briefer about a
 * problem that has nothing to do with them.
 */
type CaptureReason = "limit" | "interrupted";

/** A finished recording, ready to be handed to the composer. */
interface CapturedRecording {
  file: File;
  durationMs: number;
}

/** Why the microphone is not on offer, already written for the user. */
interface RecorderSupport {
  canRecord: boolean;
  reason: string;
}

interface VoiceRecorder {
  support: RecorderSupport;

  status: RecorderStatus;
  elapsedMs: number;

  /**
   * True between the click and the microphone actually opening.
   *
   * Exposed because the permission bubble does not block the page: without
   * it the button stays live through the whole prompt and a second click
   * opens a second `getUserMedia`.
   */
  isStarting: boolean;

  /**
   * Set whenever a recording was stopped by something other than the send
   * button — the ceiling, or the microphone going away — and never
   * otherwise: a note the user ended themselves goes straight out and never
   * needs a resting place.
   */
  captured: CapturedRecording | null;

  /** Why it is resting there, so the bar can say the right sentence. */
  captureReason: CaptureReason | null;

  /** The last thing that went wrong, ready to render. Empty when nothing did. */
  error: string;

  start: () => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  finish: () => Promise<CapturedRecording | null>;

  /**
   * Stops the recording and parks whatever was said, for a reason that is
   * neither the ceiling nor the send button.
   *
   * The reason is the caller's to write: only it knows what happened — the
   * pane went off screen, the dialog closed — and a recording that stops
   * with no sentence attached is the failure this exists to prevent.
   */
  interrupt: (reason: string) => void;

  cancel: () => void;
  reset: () => void;

  /**
   * Drops the standing message.
   *
   * `reset` deliberately keeps it — the composer usually resets BECAUSE
   * something went wrong — but a recording that was interrupted and then
   * sent successfully has nothing left to explain, and leaving the reason
   * above an empty composer would read as a send that failed.
   */
  clearError: () => void;
}

/**
 * What to say when this browser cannot produce a note the fleet can hear.
 *
 * Written out rather than "não suportado": the reason is the difference
 * between "try another browser" and "there is nothing you can do here", and
 * a dead microphone button explains neither.
 */
const NO_FORMAT_REASON =
  "Este navegador só grava em WebM/Opus, que os iPhones dos motoristas não " +
  "reproduzem. Use o Chrome, o Edge ou o Safari atualizados para gravar áudio.";

const NO_RECORDER_REASON =
  "Este navegador não permite gravar áudio. Use o Chrome, o Edge ou o " +
  "Safari atualizados.";

const INSECURE_REASON =
  "A gravação de áudio exige uma conexão segura (https).";

const DENIED_REASON =
  "Permissão de microfone negada. Libere o microfone para este site nas " +
  "configurações do navegador e tente de novo.";

const NO_DEVICE_REASON =
  "Nenhum microfone encontrado. Conecte um e tente de novo.";

/**
 * The microphone stopped answering in the middle of a recording.
 *
 * It really happens: the permission is revoked from the omnibox while the
 * bar is running, a USB headset is unplugged, another application seizes the
 * device. The tracks end, `MediaRecorder` goes `inactive` on its own, and
 * nothing about that is visible from the outside — which is how the bar went
 * on counting up to a recording that no longer existed.
 */
const MIC_LOST_SALVAGED_REASON =
  "O microfone foi interrompido durante a gravação.";

const MIC_LOST_EMPTY_REASON =
  "O microfone foi interrompido e não sobrou nada da gravação. Verifique o " +
  "dispositivo e a permissão do site, e grave de novo.";

/**
 * Recording a voice note in the browser, with the ceiling the whole product
 * agreed on.
 *
 * Two things make this different from the app's recorder. It can pause and
 * carry on, because at a desk a recording gets interrupted by a phone call
 * rather than abandoned; and it has to negotiate a format before it can even
 * offer the button — see `audio-recording`. The ceiling behaves exactly as it
 * does on the road: it STOPS the recording rather than refusing it, so
 * whatever was already said is captured and waiting on the send button.
 *
 * Everything that can end a recording ends it the same way — the ceiling,
 * the send button, the pane going off screen, the microphone being taken
 * away — through `stopRecorder`, which is the only place the hardware is
 * released and the only place a file is built.
 */
function useVoiceRecorder(): VoiceRecorder {
  // Closed until the probe below says otherwise: the answer needs a browser
  // and the first render does not have one.
  const [support, setSupport] = useState<RecorderSupport>({
    canRecord: false,
    reason: "Verificando se este navegador pode gravar áudio...",
  });

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [captured, setCaptured] = useState<CapturedRecording | null>(null);
  const [captureReason, setCaptureReason] = useState<CaptureReason | null>(
    null,
  );
  const [error, setError] = useState<string>("");

  const formatRef = useRef<RecorderFormat | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * When the ticker last actually ran.
   *
   * The gap between two beats is the overshoot the ceiling is allowed to
   * forgive, and it has to be MEASURED: a background tab or a stalled main
   * thread turns a 250 ms beat into a second or more, and forgiving only the
   * nominal 250 ms is what refused two-minute notes for being longer than
   * two minutes.
   */
  const lastTickAtRef = useRef<number>(0);

  /**
   * The clock, kept as "what was already recorded" plus "since when the
   * current stretch is running".
   *
   * A single start instant would count the pauses as speech, and the length
   * declared to the server has to be the length of the audio, not of the
   * sitting.
   */
  const settledMsRef = useRef<number>(0);
  const segmentStartedAtRef = useRef<number>(0);

  /** The stop already in flight: stopping a recorder twice loses the file. */
  const stoppingRef = useRef<Promise<CapturedRecording | null> | null>(null);

  /**
   * Whether the stop that is happening is one we asked for.
   *
   * The watchdog below listens for `stop` from the moment the recorder is
   * created, precisely so an unsolicited one is noticed — and every stop we
   * ask for ourselves fires the same event. This is what tells them apart.
   */
  const stopRequestedRef = useRef<boolean>(false);

  /**
   * The lock on `start`.
   *
   * A ref and not the `isStarting` state: two clicks inside one tick both
   * read a state that has not committed, so a disabled button is a drawing
   * and this is the lock.
   */
  const startingRef = useRef<boolean>(false);

  /** The hook is gone; nothing may set state or hold hardware any more. */
  const disposedRef = useRef<boolean>(false);

  // What a cancel has to be able to read without waiting for a render.
  const statusRef = useRef<RecorderStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ------------------------------------------------------ support probe
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.isSecureContext) {
      setSupport({ canRecord: false, reason: INSECURE_REASON });
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setSupport({ canRecord: false, reason: NO_RECORDER_REASON });
      return;
    }

    /**
     * The decision that can switch the microphone off entirely.
     *
     * Asked of the browser rather than assumed from its name: Chromium
     * learned to record MP4 at some point and Firefox has not, and a version
     * check would be wrong on both sides within a year.
     */
    const format = pickRecorderFormat((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    );

    formatRef.current = format;

    setSupport(
      format
        ? { canRecord: true, reason: "" }
        : { canRecord: false, reason: NO_FORMAT_REASON },
    );
  }, []);

  // ------------------------------------------------------------- clock
  const stopTicker = useCallback(() => {
    if (!tickerRef.current) return;

    clearInterval(tickerRef.current);
    tickerRef.current = null;
  }, []);

  /** Everything actually recorded so far, pauses discounted. */
  const readElapsedMs = useCallback((): number => {
    if (!segmentStartedAtRef.current) return settledMsRef.current;

    return settledMsRef.current + (Date.now() - segmentStartedAtRef.current);
  }, []);

  /** How late the beat that would come next already is. */
  const currentToleranceMs = useCallback((): number => {
    if (!lastTickAtRef.current) return RECORDING_TICK_MS;

    return tickToleranceMs(
      RECORDING_TICK_MS,
      Date.now() - lastTickAtRef.current,
    );
  }, []);

  /**
   * Lets the microphone go.
   *
   * Every exit runs through here, because the one thing a user notices about
   * a recorder that leaks is the light next to their camera staying on after
   * they cancelled.
   */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /**
   * Turns the chunks collected so far into a file the fleet can play back,
   * or `null` with the reason already written for the user.
   *
   * The gate this ends on is the last one before anything is uploaded, and
   * it is now reachable: it used to sit behind a fallback that relabelled
   * whatever the browser produced with the content type that had been ASKED
   * for, so a WebM blob went up signed as `audio/mp4` — accepted by the API,
   * which compares the string, and unplayable on every iPhone in the fleet.
   */
  const buildRecording = useCallback(
    (
      producedMimeType: string,
      durationMs: number,
    ): CapturedRecording | null => {
      const contentType = uploadContentTypeForRecording(
        producedMimeType,
        formatRef.current?.uploadContentType ?? null,
      );

      const blob = new Blob(chunksRef.current, {
        type: contentType ?? producedMimeType,
      });

      if (!contentType || blob.size === 0) {
        setError(
          contentType
            ? "A gravação saiu vazia. Tente de novo."
            : NO_FORMAT_REASON,
        );

        return null;
      }

      const file = new File(
        [blob],
        formatRef.current?.fileName ?? VOICE_NOTE_FILE_NAME,
        { type: contentType },
      );

      return { file, durationMs };
    },
    [],
  );

  /**
   * Stops the hardware and hands back what was recorded. Idempotent:
   * whoever asks second gets the same promise as whoever asked first.
   *
   * `toleranceMs` is how much overshoot the caller has earned. The ceiling
   * passes the beat it actually measured; everybody else stopped on purpose
   * and is not overshooting anything.
   */
  const stopRecorder = useCallback(
    (
      toleranceMs: number = RECORDING_TICK_MS,
    ): Promise<CapturedRecording | null> => {
      if (stoppingRef.current) return stoppingRef.current;

      stopTicker();

      const durationMs = reportedRecordingMs(readElapsedMs(), toleranceMs);

      settledMsRef.current = durationMs;
      segmentStartedAtRef.current = 0;

      setElapsedMs(durationMs);

      const recorder = recorderRef.current;

      if (!recorder || recorder.state === "inactive") {
        // Still a stop we asked for: releasing the stream ends its tracks,
        // and the watchdog must read that as the shutdown it is rather than
        // as a microphone taken away.
        stopRequestedRef.current = true;

        releaseStream();
        setStatus("idle");

        return Promise.resolve(null);
      }

      // From here the stop is OURS, and the watchdog listener bound at start
      // must let it through instead of harvesting it as a loss.
      stopRequestedRef.current = true;

      const stopping = new Promise<CapturedRecording | null>((resolve) => {
        recorder.addEventListener(
          "stop",
          () => {
            releaseStream();

            const finished = buildRecording(recorder.mimeType || "", durationMs);

            chunksRef.current = [];
            recorderRef.current = null;

            resolve(finished);
          },
          { once: true },
        );

        try {
          recorder.stop();
        } catch {
          /**
           * A recorder that refuses to stop has nothing left to give back,
           * and this promise is what the send button is waiting on: it
           * resolves rather than rejecting, so a dead recorder ends as an
           * explained empty send instead of an unhandled rejection.
           */
          releaseStream();

          chunksRef.current = [];
          recorderRef.current = null;

          setError(MIC_LOST_EMPTY_REASON);
          resolve(null);
        }
      });

      stoppingRef.current = stopping;

      return stopping;
    },
    [buildRecording, readElapsedMs, releaseStream, stopTicker],
  );

  /**
   * Parks a recording that was stopped by something rather than by somebody.
   *
   * The ceiling's rule, applied to every other way a recording can end: what
   * was already said is kept and offered on the send button, and the reason
   * it stopped is on screen next to it.
   */
  const parkStopped = useCallback(
    (
      finished: CapturedRecording | null,
      reasons: { salvaged: string; empty: string },
    ) => {
      if (disposedRef.current) return;

      if (!finished) {
        setCaptureReason(null);
        setStatus("idle");
        setError(reasons.empty);

        return;
      }

      setCaptured(finished);
      setCaptureReason("interrupted");
      setStatus("captured");
      setError(reasons.salvaged);
    },
    [],
  );

  /**
   * The recording ended and nobody asked it to.
   *
   * Bound from the moment the recorder exists, which is the whole point: the
   * only `stop` listener there used to be was registered inside the stop we
   * asked for, so a microphone revoked mid-sentence left the bar counting
   * "Gravando... 00:52" over a recorder that had already gone `inactive`,
   * and the send that followed produced nothing and said nothing.
   */
  const harvestUnsolicitedStop = useCallback(() => {
    if (disposedRef.current) return;

    // Claimed at once: `error` and `stop` both reach here for the same loss,
    // and only the first of them may harvest it.
    if (stopRequestedRef.current) return;

    stopRequestedRef.current = true;

    stopTicker();

    const durationMs = reportedRecordingMs(
      readElapsedMs(),
      currentToleranceMs(),
    );

    settledMsRef.current = durationMs;
    segmentStartedAtRef.current = 0;

    setElapsedMs(durationMs);

    const produced = recorderRef.current?.mimeType || "";

    releaseStream();

    const salvaged = buildRecording(produced, durationMs);

    chunksRef.current = [];
    recorderRef.current = null;

    // Whoever asks for the recording from here on gets this one, instead of
    // stopping a recorder that no longer exists.
    stoppingRef.current = Promise.resolve(salvaged);

    parkStopped(salvaged, {
      salvaged: MIC_LOST_SALVAGED_REASON,
      empty: MIC_LOST_EMPTY_REASON,
    });
  }, [
    buildRecording,
    currentToleranceMs,
    parkStopped,
    readElapsedMs,
    releaseStream,
    stopTicker,
  ]);

  /**
   * The microphone is gone — close the recorder so its `stop` can be
   * harvested.
   *
   * Deliberately NOT flagged as a stop we asked for: the harvest is the
   * listener that has to run.
   */
  const closeAfterLoss = useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      // Some browsers go inactive without ever firing `stop`.
      harvestUnsolicitedStop();
      return;
    }

    try {
      recorder.stop();
    } catch {
      harvestUnsolicitedStop();
    }
  }, [harvestUnsolicitedStop]);

  /**
   * Back to an idle composer, without touching the hardware.
   *
   * `error` is deliberately left standing: the composer resets precisely
   * BECAUSE something went wrong, and clearing the message on the way out
   * would leave a recording that vanished with no explanation. Starting the
   * next recording is what clears it.
   */
  const reset = useCallback(() => {
    stopTicker();

    stoppingRef.current = null;
    chunksRef.current = [];

    settledMsRef.current = 0;
    segmentStartedAtRef.current = 0;
    lastTickAtRef.current = 0;

    setCaptured(null);
    setCaptureReason(null);
    setElapsedMs(0);
    setStatus("idle");
  }, [stopTicker]);

  const startTicker = useCallback(() => {
    stopTicker();

    lastTickAtRef.current = Date.now();

    tickerRef.current = setInterval(() => {
      const now = Date.now();
      const beatMs = now - lastTickAtRef.current;

      lastTickAtRef.current = now;

      const elapsed = readElapsedMs();

      setElapsedMs(elapsed);

      if (!recordingReachedLimit(elapsed)) return;

      /**
       * The ceiling stops the recording; it never discards it. Whatever was
       * already said is parked on the send button — a limit that throws away
       * two minutes of speech to teach someone about a limit is not a limit,
       * it is a punishment.
       *
       * And the overshoot forgiven is the one THIS beat caused: at the
       * previous beat the limit had not been reached, so everything past it
       * happened inside a beat the browser chose the length of.
       */
      void stopRecorder(tickToleranceMs(RECORDING_TICK_MS, beatMs)).then(
        (finished) => {
          if (disposedRef.current) return;

          if (!finished) {
            setCaptureReason(null);
            setStatus("idle");
            return;
          }

          setCaptured(finished);
          setCaptureReason("limit");
          setStatus("captured");
        },
      );
    }, RECORDING_TICK_MS);
  }, [readElapsedMs, stopRecorder, stopTicker]);

  const start = useCallback(async (): Promise<boolean> => {
    const format = formatRef.current;

    if (!support.canRecord || !format) return false;

    /**
     * One microphone at a time, and the lock is a ref because two clicks
     * inside one tick both read state that has not committed.
     *
     * The very first use is exactly where this bites: Chrome's permission
     * bubble does not block the page, so the button stays live through the
     * whole prompt, a second click opens a second `getUserMedia`, and the
     * first `MediaStream` is orphaned — never stopped, its microphone light
     * on until the tab is closed.
     */
    if (startingRef.current) return false;

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      return false;
    }

    startingRef.current = true;
    setIsStarting(true);

    try {
      setError("");

      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (cause) {
        /**
         * A refusal is a sentence, never a dead button.
         *
         * The three that actually happen are told apart, because "permita o
         * microfone" is useless advice to someone who has no microphone
         * plugged in.
         */
        const name = (cause as { name?: string } | null)?.name ?? "";

        setError(
          name === "NotFoundError" || name === "DevicesNotFoundError"
            ? NO_DEVICE_REASON
            : name === "NotAllowedError" || name === "SecurityError"
              ? DENIED_REASON
              : "Não foi possível acessar o microfone. Tente de novo.",
        );

        return false;
      }

      // The pane went away while the permission bubble was up. The stream
      // nobody can ask for any more is stopped here rather than left
      // holding the microphone open for the life of the tab.
      if (disposedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }

      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream, {
          mimeType: format.recorderMimeType,
        });
      } catch {
        stream.getTracks().forEach((track) => track.stop());

        setError(NO_FORMAT_REASON);
        return false;
      }

      streamRef.current = stream;
      recorderRef.current = recorder;

      chunksRef.current = [];
      stoppingRef.current = null;
      stopRequestedRef.current = false;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      /**
       * The three ways a recording can end without anybody asking, all
       * watched from the moment the recorder exists.
       *
       * `stop` is the one that always fires — a revoked permission, an
       * unplugged headset and an internal failure all end there — and the
       * other two are what make the reason known before it does.
       */
      recorder.addEventListener("stop", harvestUnsolicitedStop);
      recorder.addEventListener("error", closeAfterLoss);

      stream
        .getAudioTracks()
        .forEach((track) => track.addEventListener("ended", closeAfterLoss));

      settledMsRef.current = 0;

      /**
       * The hardware first, the bar afterwards.
       *
       * `start` can refuse — a device seized between the permission and this
       * line — and a bar counting up over a recorder that never started is
       * the very failure the watchdog above exists to end. Nothing here may
       * introduce another one.
       */
      try {
        recorder.start();
      } catch {
        recorderRef.current = null;

        // Flagged, because the watchdog is already bound and there is no
        // recording to salvage from a recorder that never began.
        stopRequestedRef.current = true;

        releaseStream();

        setError("Não foi possível iniciar a gravação. Tente de novo.");
        return false;
      }

      segmentStartedAtRef.current = Date.now();

      setCaptured(null);
      setCaptureReason(null);
      setElapsedMs(0);
      setStatus("recording");

      startTicker();

      return true;
    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }, [
    closeAfterLoss,
    harvestUnsolicitedStop,
    releaseStream,
    startTicker,
    support.canRecord,
  ]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "recording") return;

    // The clock is banked before the pause, so the stretch that just ended
    // is counted and the one that has not started is not.
    settledMsRef.current = readElapsedMs();
    segmentStartedAtRef.current = 0;

    stopTicker();
    recorder.pause();

    setElapsedMs(settledMsRef.current);
    setStatus("paused");
  }, [readElapsedMs, stopTicker]);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "paused") return;

    segmentStartedAtRef.current = Date.now();

    recorder.resume();
    startTicker();

    setStatus("recording");
  }, [startTicker]);

  /**
   * What to send. A recording something else already stopped is handed back
   * as it is — asking the hardware to stop a second time is how the file
   * gets lost.
   */
  const finish = useCallback(async (): Promise<CapturedRecording | null> => {
    if (captured) return captured;

    const finished = await stopRecorder();

    if (disposedRef.current) return finished;

    // Parked and not merely flagged: the composer can be taken off screen
    // between this stop and the send, and whoever asks next has to find the
    // same recording rather than stop a recorder that is already gone.
    setCaptured(finished);
    setStatus(finished ? "captured" : "idle");

    return finished;
  }, [captured, stopRecorder]);

  const interrupt = useCallback(
    (reason: string) => {
      if (
        statusRef.current !== "recording" &&
        statusRef.current !== "paused"
      ) {
        return;
      }

      void stopRecorder().then((finished) =>
        parkStopped(finished, { salvaged: reason, empty: reason }),
      );
    },
    [parkStopped, stopRecorder],
  );

  const clearError = useCallback(() => setError(""), []);

  const cancel = useCallback(() => {
    const wasLive =
      statusRef.current === "recording" || statusRef.current === "paused";

    // Discarded either way, so the result is not waited on — but the stop
    // still has to happen, or the microphone stays open.
    if (wasLive) void stopRecorder().catch(() => undefined);

    releaseStream();
    reset();

    // A discard on purpose is not a failure, and has nothing to explain.
    setError("");
  }, [releaseStream, reset, stopRecorder]);

  /**
   * A pane closed mid-recording must not leave the microphone light on.
   *
   * The flag is cleared on the way IN as well as set on the way out. React
   * StrictMode — which the App Router turns on for `next dev` — simulates a
   * mount as setup → cleanup → setup on the SAME component instance, and refs
   * survive that. Setting the flag without ever clearing it meant the very
   * first cleanup left it `true` for the life of the panel, and every guard
   * that reads it silently refused: in development the microphone button did
   * nothing at all, for a reason nothing on screen could explain.
   */
  useEffect(() => {
    disposedRef.current = false;

    return () => {
      disposedRef.current = true;

      stopTicker();

      const recorder = recorderRef.current;

      // Flagged first: the watchdog is still bound, and an unmount is not a
      // loss to report to a user who is no longer there.
      stopRequestedRef.current = true;

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // A recorder that refuses to stop has nothing left to give back.
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [stopTicker]);

  return {
    support,
    status,
    elapsedMs,
    isStarting,
    captured,
    captureReason,
    error,
    start,
    pause,
    resume,
    finish,
    interrupt,
    cancel,
    reset,
    clearError,
  };
}

export { useVoiceRecorder, RECORDING_TICK_MS };
export type {
  VoiceRecorder,
  CapturedRecording,
  CaptureReason,
  RecorderStatus,
};
