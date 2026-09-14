"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AlertTriangle, Loader, Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatSecondsClock } from "./lib/format";
import { MEDIA_BUBBLE_WIDTH_CLASS } from "./lib/media-bubble";
import {
  boundsFromRect,
  hasSettledAt,
  isBarPlayed,
  ratioFromClientX,
  ratioFromSeconds,
  secondsFromRatio,
  type ScrubTarget,
  type TrackBounds,
} from "./lib/audio-scrub";

/**
 * The bars are a *progress motif*, not a waveform.
 *
 * A real waveform means sampling amplitude while the voice note is recorded
 * and shipping those samples with the message — nothing here has that data.
 * So the pattern below is deliberately regular and repeating: it reads as a
 * stylised track, the way a dashed line reads as a track, and never pretends
 * to describe the audio. Faking amplitude with a pseudo-random height per
 * bar would look convincing and be a lie about the recording.
 */
const BAR_PATTERN = [0.4, 0.62, 0.85, 1, 0.85, 0.62];

const BAR_COUNT = 36;

const PLAYBACK_RATES = [1, 1.5, 2] as const;

/** Arrow-key seek, in seconds. */
const KEYBOARD_SEEK_STEP = 5;

/**
 * How far the pointer has to travel before a press counts as a drag.
 *
 * Below it the gesture is a click, and a click must not pause: a plain seek
 * on a playing note would otherwise blink the button through pause and back
 * for no reason the reader asked for.
 */
const DRAG_THRESHOLD_PX = 3;

/**
 * Only one voice note plays at a time in the whole panel.
 *
 * Module scope on purpose: the players are scattered across the message list
 * and have no common parent to hold this, and the browser gives us no "pause
 * every other audio" primitive.
 */
let activeAudio: HTMLAudioElement | null = null;

interface ChatAudioPlayerProps {
  src: string;

  /** Server-side length: lets the player render complete before any bytes. */
  durationMs: number | null;

  /** Own-side bubbles are primary-on-primary; the driver's are on muted. */
  isOwnSide: boolean;
}

/**
 * The voice-note player: round play button, a scrubbable bar track, the
 * running clock and a speed toggle.
 *
 * Duration comes from the server first and from the file second, so the
 * layout is stable from the first paint — a player that renders at "0:00"
 * and jumps to "1:12" once the metadata lands looks broken even though it
 * is merely honest.
 */
const ChatAudioPlayer = ({
  src,
  durationMs,
  isOwnSide,
}: ChatAudioPlayerProps): JSX.Element => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  // Pointer events fire faster than React commits state, so the drag guard
  // lives in a ref and the rendered position in state.
  const isScrubbingRef = useRef<boolean>(false);

  /**
   * The seek that has been asked for and not yet confirmed by the element.
   *
   * While this is set, the rendered position is the one the finger chose and
   * nothing else may write over it — see `settleScrub`.
   */
  const scrubTargetRef = useRef<ScrubTarget | null>(null);

  /** Whether the note was playing when the drag started, and where it began. */
  const wasPlayingBeforeDragRef = useRef<boolean>(false);
  const dragOriginXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Padding is a property of the stylesheet, not of the gesture: read once
  // when a gesture starts and reused for every move of it, so a drag never
  // pays for `getComputedStyle` per frame.
  const insetsRef = useRef<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // A player far outside the viewport still plays, but nothing about it is
  // being watched — so it stops asking for frames.
  const [isOnScreen, setIsOnScreen] = useState<boolean>(true);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [loadedDuration, setLoadedDuration] = useState<number>(0);

  const [rate, setRate] = useState<number>(1);
  const [scrubRatio, setScrubRatio] = useState<number | null>(null);

  const serverDuration = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
  const duration = loadedDuration > 0 ? loadedDuration : serverDuration;

  const progress = scrubRatio ?? ratioFromSeconds(currentTime, duration);

  const elapsed =
    scrubRatio !== null ? secondsFromRatio(scrubRatio, duration) : currentTime;

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  // A renewed signature swaps the source under the same player. Whatever was
  // being waited on belonged to the file that just went away.
  useEffect(() => {
    scrubTargetRef.current = null;

    setScrubRatio(null);
    setCurrentTime(0);
  }, [src]);

  // A player scrolled out of the list, or a conversation switched away from,
  // must not keep talking.
  useEffect(
    () => () => {
      const audio = audioRef.current;

      if (!audio) return;

      audio.pause();

      if (activeAudio === audio) activeAudio = null;
    },
    [],
  );

  // Frames are cheap and `timeupdate` is not enough: browsers fire it about
  // four times a second, which is a bar that lurches instead of moving. The
  // loop exists only while the audio is playing, on screen and not being
  // dragged — and dies with the component.
  useEffect(() => {
    if (!isPlaying || !isOnScreen) return;

    let frame = requestAnimationFrame(function tick() {
      frame = requestAnimationFrame(tick);

      const audio = audioRef.current;

      // The drag owns the position until it is released; letting playback
      // write over it makes the handle fight the finger.
      if (!audio || isScrubbingRef.current) return;

      // And a released drag still owns it until the element confirms the new
      // position — which is what this frame is here to check.
      if (scrubTargetRef.current) {
        settleScrub();
        return;
      }

      setCurrentTime(audio.currentTime);
    });

    return () => cancelAnimationFrame(frame);
  }, [isPlaying, isOnScreen]);

  useEffect(() => {
    const node = rootRef.current;

    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsOnScreen(entry.isIntersecting),
      // A little margin: the player is already ticking by the time it is
      // scrolled into view, so it never appears frozen for a frame.
      { rootMargin: "120px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  /**
   * Lets go of the optimistic position, but only once the element reports
   * that it really is where the scrub asked it to be.
   *
   * The bug this closes: the position used to be released the instant the
   * finger came up, while the seek was still in flight. For the frames in
   * between, the element kept answering with the OLD position — so the
   * handle snapped back to where the audio was and only then jumped to where
   * it had been dropped.
   */
  const settleScrub = useCallback(() => {
    const audio = audioRef.current;
    const target = scrubTargetRef.current;

    if (!audio || !target) return;

    if (!hasSettledAt(audio.currentTime, target)) return;

    scrubTargetRef.current = null;

    setCurrentTime(audio.currentTime);
    setScrubRatio(null);
  }, []);

  /** Drops a seek nobody can be waiting for any more. */
  const forgetScrub = useCallback(() => {
    scrubTargetRef.current = null;
    setScrubRatio(null);
  }, []);

  /**
   * The one place a proportion becomes a moment of the audio: click, drag,
   * keyboard and the Home/End keys all come through here.
   *
   * The asked-for position is rendered immediately and held — `scrubRatio`
   * is deliberately NOT cleared here — until `settleScrub` sees the element
   * arrive. That is what makes a release final in the reader's eyes.
   */
  const seekToRatio = useCallback((ratio: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    // Only the file's own duration can be seeked against: the server value
    // is good enough to draw with and not good enough to trust as an offset.
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    const next = secondsFromRatio(ratio, audio.duration);

    scrubTargetRef.current = { from: audio.currentTime, to: next };

    // The ratio the caller chose, not one recomputed from the file's
    // duration: the bars are painted against the duration on screen, and a
    // handle that does not sit under the finger is the bug next door.
    setScrubRatio(ratio);

    audio.currentTime = next;
  }, []);

  /**
   * Starts (or resumes) this note, silencing whichever one was playing.
   *
   * Shared by the play button and by the end of a drag, so "only one voice
   * note at a time" and the playback rate can never drift apart between the
   * two ways in.
   */
  const startPlayback = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || hasError) return;

    if (activeAudio && activeAudio !== audio) activeAudio.pause();

    activeAudio = audio;
    audio.playbackRate = rate;

    setIsBuffering(true);

    void audio
      .play()
      .then(() => setIsBuffering(false))
      .catch(() => {
        setIsBuffering(false);
        setHasError(true);
      });
  }, [hasError, rate]);

  const handleToggle = () => {
    const audio = audioRef.current;

    if (!audio || hasError) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    startPlayback();
  };

  const handleRetry = () => {
    const audio = audioRef.current;

    setHasError(false);
    setIsBuffering(false);

    forgetScrub();

    audio?.load();
  };

  const handleCycleRate = () => {
    const index = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);

    setRate(PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length]);
  };

  // ============================================================ scrubbing
  /** The painted rectangle of the track, right now. */
  const readBounds = (): TrackBounds | null => {
    const node = trackRef.current;

    if (!node) return null;

    return boundsFromRect(node.getBoundingClientRect(), insetsRef.current);
  };

  const ratioAt = (clientX: number): number => {
    const bounds = readBounds();

    return bounds ? ratioFromClientX(clientX, bounds) : 0;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (hasError || duration <= 0) return;

    // Capturing keeps the drag alive when the finger leaves the track, which
    // on a phone is most of the gesture.
    event.currentTarget.setPointerCapture(event.pointerId);

    const style = window.getComputedStyle(event.currentTarget);

    insetsRef.current = {
      left: Number.parseFloat(style.paddingLeft) || 0,
      right: Number.parseFloat(style.paddingRight) || 0,
    };

    isScrubbingRef.current = true;

    // Whether to give the note its voice back on release, decided now:
    // pausing is what the drag itself does, a moment later.
    wasPlayingBeforeDragRef.current = isPlaying;
    dragOriginXRef.current = event.clientX;
    isDraggingRef.current = false;

    // A seek still waiting on the element is overruled by the new gesture.
    scrubTargetRef.current = null;

    // The bar follows the finger from the first pixel; the audio is only
    // moved on release. Seeking per pixel is what makes a drag stutter.
    setScrubRatio(ratioAt(event.clientX));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;

    /**
     * The moment a press becomes a drag, the audio goes quiet — the way it
     * does when a thumb is on the WhatsApp handle. Playing under the finger
     * makes the note babble through a minute of itself while the reader is
     * only looking for a spot in it.
     */
    if (
      !isDraggingRef.current &&
      Math.abs(event.clientX - dragOriginXRef.current) >= DRAG_THRESHOLD_PX
    ) {
      isDraggingRef.current = true;

      if (wasPlayingBeforeDragRef.current) audioRef.current?.pause();
    }

    setScrubRatio(ratioAt(event.clientX));
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;

    isScrubbingRef.current = false;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // A plain click is a drag of zero length, and lands on the same number.
    seekToRatio(ratioAt(event.clientX));

    // Dragging paused it; letting go gives it back — and only if the drag
    // was the thing that stopped it. A note that was already paused when the
    // finger landed stays paused.
    const shouldResume =
      isDraggingRef.current && wasPlayingBeforeDragRef.current;

    isDraggingRef.current = false;
    wasPlayingBeforeDragRef.current = false;

    if (shouldResume) startPlayback();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const audio = audioRef.current;

    if (!audio || duration <= 0) return;

    // Seconds become a proportion here and a moment inside `seekToRatio`,
    // so the keys travel exactly the same path a click does.
    // `elapsed`, not `currentTime`: while a seek is still being confirmed the
    // position on screen is the asked-for one, and two arrow presses in a row
    // have to add up from what the reader can see.
    const jump = (seconds: number) => {
      event.preventDefault();
      seekToRatio(ratioFromSeconds(elapsed + seconds, duration));
    };

    if (event.key === "ArrowRight") jump(KEYBOARD_SEEK_STEP);
    if (event.key === "ArrowLeft") jump(-KEYBOARD_SEEK_STEP);

    if (event.key === "Home") {
      event.preventDefault();
      seekToRatio(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      seekToRatio(1);
    }
  };

  // ============================================================== styling
  const buttonClass = isOwnSide
    ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90"
    : "bg-primary text-primary-foreground hover:bg-primary/90";

  const playedBarClass = isOwnSide ? "bg-primary-foreground" : "bg-primary";

  const idleBarClass = isOwnSide
    ? "bg-primary-foreground/35"
    : "bg-muted-foreground/35";

  const chipClass = isOwnSide
    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
    : "bg-background text-foreground hover:bg-background/70";

  return (
    <div
      ref={rootRef}
      className={cn(
        "mb-1 flex items-center gap-2",

        // The same width photos and albums use. A voice note is media too,
        // so a caption under it must wrap at the player's width instead of
        // stretching the bubble and leaving the player adrift — and the
        // wider track buys real precision for scrubbing.
        MEDIA_BUBBLE_WIDTH_CLASS,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;

          if (Number.isFinite(value) && value > 0) setLoadedDuration(value);
        }}
        // No `timeUpdate` to drive the bar: while playing the position is
        // read frame by frame. This one covers the seek that lands while
        // paused, when there is no frame loop running at all.
        onSeeked={(event) => {
          if (isScrubbingRef.current) return;

          if (scrubTargetRef.current) {
            settleScrub();
            return;
          }

          setCurrentTime(event.currentTarget.currentTime);
        }}
        // The safety net, and nothing else: a browser that lands a seek
        // without a `seeked` this pane can see would otherwise leave the
        // handle frozen where the finger dropped it. It fires far too rarely
        // to be allowed near the bar itself.
        onTimeUpdate={() => settleScrub()}
        onPlay={() => {
          setIsPlaying(true);
          setHasError(false);
        }}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);

          forgetScrub();

          if (audioRef.current) audioRef.current.currentTime = 0;
          if (activeAudio === audioRef.current) activeAudio = null;
        }}
        onError={() => {
          setHasError(true);
          setIsBuffering(false);
          setIsPlaying(false);

          // Nothing is going to confirm the seek now, and a handle stuck
          // mid-track over an error message is a lie about a position.
          forgetScrub();
        }}
      />

      <button
        type="button"
        onClick={hasError ? handleRetry : handleToggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          "shadow-sm transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-current",
          hasError ? "bg-destructive text-destructive-foreground" : buttonClass,
        )}
        aria-label={
          hasError
            ? "Tentar carregar o áudio de novo"
            : isPlaying
              ? "Pausar áudio"
              : "Reproduzir áudio"
        }
      >
        {hasError ? (
          <RotateCcw className="h-4 w-4" />
        ) : isBuffering ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {hasError ? (
          <span className="flex items-center gap-1 text-[11px] leading-tight">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            Não foi possível carregar o áudio.
          </span>
        ) : (
          <div
            ref={trackRef}
            role="slider"
            tabIndex={0}
            aria-label="Posição do áudio"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(elapsed)}
            aria-valuetext={formatSecondsClock(elapsed)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown}
            className={cn(
              // No horizontal padding, and bars that grow to fill: the box
              // that receives the click is, to the pixel, the box that gets
              // painted. Fixed-width bars used to stop short of a wider
              // track, and every seek landed left of the finger by whatever
              // slack was left over.
              "flex h-7 w-full cursor-pointer touch-none items-end gap-[2px]",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-current focus-visible:ring-offset-1",
              duration <= 0 && "cursor-default opacity-60",
            )}
          >
            {Array.from({ length: BAR_COUNT }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "min-w-0 flex-1 rounded-full transition-colors",
                  isBarPlayed(index, BAR_COUNT, progress)
                    ? playedBarClass
                    : idleBarClass,
                )}
                style={{
                  height: `${Math.round(
                    BAR_PATTERN[index % BAR_PATTERN.length] * 100,
                  )}%`,
                }}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tabular-nums opacity-80">
            {formatSecondsClock(elapsed)} / {formatSecondsClock(duration)}
          </span>

          <button
            type="button"
            onClick={handleCycleRate}
            disabled={hasError}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              "tabular-nums transition-colors disabled:opacity-50",
              chipClass,
            )}
            aria-label={`Velocidade ${rate}x — tocar para alternar`}
          >
            {rate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export { ChatAudioPlayer };
