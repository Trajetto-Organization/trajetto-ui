"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import Image from "next/image";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageOff,
  Loader,
  RotateCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

import { formatClock, formatDaySeparator } from "./lib/format";

import {
  canStepGallery,
  findGalleryIndex,
  formatGalleryCounter,
  galleryWindowIndices,
  stepGalleryKey,
  type GalleryPhoto,
} from "./lib/image-gallery";

import {
  resolveDismissCommit,
  resolveDismissProgress,
  resolveDismissStyle,
  resolveGestureAxis,
  resolveSwipeCommit,
  resolveTrackOffset,
  type GestureAxis,
} from "./lib/gallery-gesture";

/** How long the photo takes to finish leaving before the dialog closes. */
const DISMISS_EXIT_MS = 200;

/** Per-slide loading lifecycle; the URL is signed and it does expire. */
type SlideStatus = "loading" | "ready" | "error";

interface SlideState {
  status: SlideStatus;

  /** Bumped by "tentar de novo": it remounts the `img` and refetches. */
  attempt: number;

  /**
   * The URL the status was recorded against.
   *
   * A slide's URL does change underneath it: the send confirms and the local
   * `blob:` becomes the signed original, and renewing an expired signature
   * swaps one signed link for another. Both are a different file to download,
   * so a status left over from the previous URL would report a photo as ready
   * while the browser is still fetching it.
   */
  url: string;
}

const idleSlide = (url: string): SlideState => ({
  status: "loading",
  attempt: 0,
  url,
});

interface ChatImageViewerProps {
  /** Every photo of the loaded conversation, in the order of the screen. */
  photos: GalleryPhoto[];

  /** The photo that was tapped, by its gallery key. */
  anchorKey: string;

  /** Who the conversation is with — for the screen-reader description. */
  conversationName: string;

  /**
   * Renews one photo's signature and answers the fresh URL, or null.
   *
   * The conversation owns the message list, so it is the one that writes the
   * new link in; the viewer only asks. Reloading the conversation instead —
   * the only renewal there used to be — replaces the list with the newest
   * page, drops the photo the gallery is anchored to and closes this dialog
   * on top of the reader.
   */
  onRenewPhoto?: (messageId: string) => Promise<string | null>;

  onClose: () => void;
}

/**
 * The conversation's photos, full screen, one swipe apart.
 *
 * Built out of the Radix primitives rather than out of `DialogContent`: that
 * one carries an overlay, a close button, a `max-w-lg` box, padding and a
 * border — a white card, which is the opposite of what a photo viewer is.
 * The primitives keep everything a dialog is actually for: the focus trap,
 * Esc, `aria-hidden` on the rest of the page and the scroll lock.
 *
 * Only the current photo and its two neighbours are ever mounted. That is not
 * a micro-optimisation: the attachments are served `unoptimized` because the
 * signed URL does not pass Next's `remotePatterns`, so each mounted slide
 * downloads the original file whole, on a driver's phone as much as on a
 * panel left open all day.
 */
const ChatImageViewer = ({
  photos,
  anchorKey,
  conversationName,
  onRenewPhoto,
  onClose,
}: ChatImageViewerProps): JSX.Element => {
  /**
   * The viewer holds the *identity* of the photo, never its index.
   *
   * The list moves underneath: a socket message appends, "Mensagens
   * anteriores" prepends a whole page and shifts every index by the size of
   * it, and a confirmed send swaps a message object in place. The index is
   * derived from this key on every render, so all of that is survivable.
   */
  const [currentKey, setCurrentKey] = useState<string>(anchorKey);

  /**
   * Raw finger travel; every offset on screen is derived from it.
   *
   * The stage it was measured against travels with it, so rendering stays a
   * function of state alone and never reaches into a ref mid-render.
   */
  const [drag, setDrag] = useState<{
    dx: number;
    dy: number;
    axis: GestureAxis;
    width: number;
    height: number;
  } | null>(null);

  /** The track's resting offset — non-zero only for one settling frame. */
  const [slideOffset, setSlideOffset] = useState<number>(0);

  /** True for the single frame that must land without animating. */
  const [isSnapping, setIsSnapping] = useState<boolean>(false);

  /** Set once the photo has been thrown away and is on its way out. */
  const [dismissDirection, setDismissDirection] = useState<-1 | 1 | null>(null);

  const [slideState, setSlideState] = useState<Record<string, SlideState>>({});

  /**
   * The photo whose signature is being renewed right now.
   *
   * Its `img` comes off the stage while the request is in flight: leaving the
   * expired URL mounted only buys a second failure, and the error panel
   * flashing back between the press and the new link reads as the retry
   * having gone wrong.
   */
  const [renewingKey, setRenewingKey] = useState<string | null>(null);

  const stageSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startedAt: number;
    axis: GestureAxis | null;
  } | null>(null);

  const frameRef = useRef<number | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = photos.length;

  const index = findGalleryIndex(photos, currentKey);

  const photo = index >= 0 ? photos[index] : null;

  const edges = useMemo(
    () => ({
      canGoPrevious: canStepGallery(index, count, -1),
      canGoNext: canStepGallery(index, count, 1),
    }),
    [count, index],
  );

  const windowIndices = useMemo(
    () => galleryWindowIndices(index, count),
    [count, index],
  );

  const isDismissing = dismissDirection !== null;

  const dismissProgress =
    drag?.axis === "vertical"
      ? resolveDismissProgress(drag.dy, drag.height)
      : 0;

  const dismissStyle = resolveDismissStyle(isDismissing ? 1 : dismissProgress);

  const isDragging = drag !== null;

  // The finger owns the frame while it is down, and the settling frame has to
  // land exactly where the drag left off; everything else eases.
  const animates = !isDragging && !isSnapping;

  // ======================================================== navigation
  /**
   * Steps by identity, through the pure rule.
   *
   * The updater form is what makes a burst of clicks on an arrow behave: each
   * one reads the key the previous one just wrote, and the rule answers the
   * same key back at either end of the gallery instead of wrapping or running
   * off the list.
   */
  const goBy = useCallback(
    (delta: number) => {
      setCurrentKey((key) => stepGalleryKey(photos, key, delta) ?? key);
    },
    [photos],
  );

  /**
   * Steps and animates, for the swipe only.
   *
   * The key changes on the spot — counter, caption and metadata are correct
   * immediately — and the track is placed, for one un-animated frame, exactly
   * where the finger left it. The next frame walks it back to centre, so what
   * the eye sees is the photo the finger was already pulling in continuing to
   * arrive. Arrows and keys skip this and land straight away, which is what
   * keeps rapid clicking on them provably safe.
   */
  const settleBy = useCallback(
    (delta: number, dx: number) => {
      const { width } = stageSizeRef.current;

      goBy(delta);

      if (width <= 0) return;

      setSlideOffset(delta * width + dx);
      setIsSnapping(true);

      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;

        setIsSnapping(false);
        setSlideOffset(0);
      });
    },
    [goBy],
  );

  const beginDismiss = useCallback(
    (direction: -1 | 1) => {
      setDismissDirection(direction);
      setDrag(null);

      // The photo finishes leaving before the dialog goes: closing on the
      // spot reads as a modal blinking out rather than as a photo thrown
      // away. Reduced motion zeroes the transition globally, so there the
      // wait is just a beat with nothing moving.
      exitTimerRef.current = setTimeout(onClose, DISMISS_EXIT_MS);
    },
    [onClose],
  );

  // ============================================================= gestures
  /** Gives a pointer back to the browser, whichever one it is. */
  const releaseCapture = (node: HTMLElement, pointerId: number) => {
    if (node.hasPointerCapture(pointerId))
      node.releasePointerCapture(pointerId);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isDismissing) return;

    // A second finger means the reader is pinching, not swiping — so the
    // drag already in flight is abandoned outright rather than left running
    // under the thumb. Merely ignoring the new pointer kept the first one
    // owning the gesture: spreading the fingers walked the thumb far enough
    // sideways to lock the axis, and letting go committed a page turn nobody
    // asked for, one photo per attempt. Neither pointer arms anything now;
    // lifting both and starting over is what begins the next swipe. This is
    // also the seam a real pinch-zoom plugs into later.
    if (dragRef.current) {
      releaseCapture(event.currentTarget, dragRef.current.pointerId);

      dragRef.current = null;
      setDrag(null);

      return;
    }

    // A right-click must not arm a swipe, and the controls sitting over the
    // stage keep their own click.
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    const rect = event.currentTarget.getBoundingClientRect();

    stageSizeRef.current = { width: rect.width, height: rect.height };

    // Capturing keeps the drag alive when the finger leaves the stage, which
    // on a phone is most of the gesture — and it keeps the dialog's own
    // dismiss-on-outside-pointerdown from reading the end of a drag as an
    // interaction somewhere else.
    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: event.timeStamp,
      axis: null,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;

    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    // Nothing moves until the drag has said which way it is going, and it
    // only ever says so once: a swipe that drifts downwards stays a swipe.
    if (state.axis === null) {
      state.axis = resolveGestureAxis({ dx, dy });

      if (state.axis === null) return;
    }

    setDrag({ dx, dy, axis: state.axis, ...stageSizeRef.current });
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;

    if (!state || state.pointerId !== event.pointerId) return;

    dragRef.current = null;
    releaseCapture(event.currentTarget, event.pointerId);

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    const elapsedMs = event.timeStamp - state.startedAt;
    const { width, height } = stageSizeRef.current;

    setDrag(null);

    if (state.axis === "vertical") {
      if (resolveDismissCommit({ dy, height, elapsedMs })) {
        beginDismiss(dy >= 0 ? 1 : -1);
      }

      return;
    }

    if (state.axis === "horizontal") {
      const delta = resolveSwipeCommit({ dx, width, elapsedMs, edges });

      if (delta !== 0) settleBy(delta, dx);
    }
  };

  /** A cancelled pointer is not a decision: everything springs back. */
  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;

    if (!state || state.pointerId !== event.pointerId) return;

    dragRef.current = null;
    releaseCapture(event.currentTarget, event.pointerId);

    setDrag(null);
  };

  // ============================================================= keyboard
  // Esc stays the dialog's own; only paging is handled here. One window
  // listener rather than a handler on the content, so the keys work wherever
  // focus happens to have landed inside the viewer.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();

      // One photo per press, never per repeat. A held arrow auto-repeats at
      // around thirty keys a second, and each step mounts a new neighbour
      // slide that downloads a signed original in full — three seconds of a
      // leaning finger is dozens of multi-megabyte files nobody will look at,
      // queued ahead of the one photo on screen, plus a `preload` link per
      // step that React never takes back out of the head.
      if (event.repeat) return;

      goBy(event.key === "ArrowLeft" ? -1 : 1);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goBy]);

  // The photo can leave the conversation under the viewer — switching driver
  // empties the list. There is nothing to show then, so the viewer goes.
  useEffect(() => {
    if (index < 0) onClose();
  }, [index, onClose]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (exitTimerRef.current !== null) clearTimeout(exitTimerRef.current);
    },
    [],
  );

  // ========================================================== slide state
  /**
   * The lifecycle of the slide showing `url` — never of the key alone.
   *
   * An entry recorded against another URL is not this photo's: the send
   * confirming replaces a `blob:` with the signed original under the very
   * same key, and reading `ready` off it would leave the reader looking at a
   * blank stage with no spinner while the original downloads from scratch.
   */
  const readSlideState = (key: string, url: string): SlideState => {
    const entry = slideState[key];

    return entry && entry.url === url ? entry : idleSlide(url);
  };

  const markSlide = (key: string, url: string, status: SlideStatus) => {
    setSlideState((current) => {
      const entry = current[key];
      const fresh = entry?.url === url;

      if (fresh && entry.status === status) return current;

      const base = fresh ? entry : idleSlide(url);

      return { ...current, [key]: { ...base, status, url } };
    });
  };

  const bumpSlideAttempt = (key: string, url: string) => {
    setSlideState((current) => {
      const entry = current[key];
      const attempt = entry?.url === url ? entry.attempt + 1 : 0;

      return { ...current, [key]: { status: "loading", attempt, url } };
    });
  };

  /**
   * "Tentar novamente", which now really does try something new.
   *
   * What expires is the signature, so re-downloading the same URL only fails
   * the same way. The renewal asks the API for a fresh link for this one
   * message; the conversation writes it into the message, the slide's URL
   * changes and the lifecycle above restarts on its own. The attempt bump is
   * the floor underneath it: a photo still on the device has nothing to renew
   * and a renewal that answers the same link needs the refetch anyway.
   */
  const retrySlide = (target: GalleryPhoto) => {
    bumpSlideAttempt(target.key, target.url);

    if (!target.messageId || !onRenewPhoto) return;

    setRenewingKey(target.key);

    void onRenewPhoto(target.messageId).finally(() => {
      setRenewingKey((key) => (key === target.key ? null : key));
    });
  };

  // ============================================================== render
  const counter = formatGalleryCounter(index, count);

  const chromeOpacity = isDismissing ? 0 : dismissStyle.backdropOpacity;

  const trackOffset =
    drag?.axis === "horizontal"
      ? resolveTrackOffset(drag.dx, edges)
      : slideOffset;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay
          className={cn(
            "bg-black/95",
            animates && "transition-opacity duration-200",
          )}
          style={{ opacity: dismissStyle.backdropOpacity }}
        />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col outline-none"
          // A drag that starts on the photo and ends past the edge of the
          // window must not be read as "the reader clicked somewhere else".
          onInteractOutside={(event) => {
            if (dragRef.current) event.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">Foto da conversa</DialogTitle>
          <DialogDescription className="sr-only">
            Fotos enviadas na conversa com {conversationName}. Use as setas para
            a esquerda e para a direita para passar de foto, ou arraste a foto
            para o lado. Arraste para cima ou para baixo para fechar.
          </DialogDescription>

          {/* ------------------------------------------------------ header */}
          <header
            className={cn(
              "relative z-10 flex shrink-0 items-center gap-3 px-2 py-2 text-white sm:px-4",
              animates && "transition-opacity duration-200",
            )}
            style={{ opacity: chromeOpacity }}
          >
            <DialogClose
              className="shrink-0 rounded-full p-2 text-white/90 transition-colors
              hover:bg-white/10 hover:text-white focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Fechar a foto"
            >
              <X className="h-5 w-5" />
            </DialogClose>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {photo?.senderName ?? ""}
              </p>

              {photo && (
                <p className="truncate text-xs text-white/70">
                  {formatDaySeparator(photo.createdAt)} às{" "}
                  {formatClock(photo.createdAt)}
                </p>
              )}
            </div>

            {/* A single photo behaves exactly as it did before: no counter,
                no arrows, nothing left over from a gallery of one. */}
            {count > 1 && (
              <p
                role="status"
                aria-live="polite"
                className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs
                font-medium tabular-nums text-white/90"
              >
                <span aria-hidden="true">{counter}</span>
                <span className="sr-only">
                  Foto {index + 1} de {count}
                </span>
              </p>
            )}
          </header>

          {/* ------------------------------------------------------- stage */}
          <div
            className="relative min-h-0 flex-1 select-none overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {windowIndices.map((slot) => {
              const slide = photos[slot];
              const offset = slot - index;

              const isCurrent = offset === 0;
              const state = readSlideState(slide.key, slide.url);

              const isRenewing = renewingKey === slide.key;

              const verticalPx =
                isCurrent && drag?.axis === "vertical" ? drag.dy : 0;

              // Percentages resolve against the slide's own box, which is the
              // stage: `100%` is exactly one screen of travel, with no
              // measuring and nothing to keep in sync on resize.
              const translateY =
                isDismissing && isCurrent
                  ? `${dismissDirection * 100}%`
                  : `${verticalPx}px`;

              const scale = isCurrent ? dismissStyle.scale : 1;

              return (
                <div
                  key={slide.key}
                  className={cn(
                    // `touch-none` goes on the slide and not on the stage: it
                    // is what stops the browser stealing the pan, and keeping
                    // it this narrow leaves the door open for pinch-zoom on
                    // the photo later.
                    "absolute inset-0 flex touch-none items-center justify-center p-3 sm:p-8",
                    animates &&
                      "transition-transform duration-200 ease-out motion-reduce:transition-none",
                  )}
                  style={{
                    transform: `translate3d(calc(${
                      offset * 100
                    }% + ${trackOffset}px), ${translateY}, 0) scale(${scale})`,
                  }}
                  aria-hidden={!isCurrent}
                >
                  {state.status === "error" && !isRenewing ? (
                    <div className="flex max-w-xs flex-col items-center gap-2 text-center">
                      <ImageOff className="h-10 w-10 text-white/50" />

                      <p className="text-sm font-medium text-white">
                        Não foi possível carregar esta foto.
                      </p>

                      <p className="text-xs text-white/70">
                        O link de acesso a uma foto expira depois de um tempo.
                        Toque em &quot;Tentar novamente&quot; para gerar um link
                        novo.
                      </p>

                      {/* Only the photo on screen offers the retry: a
                          neighbour is `aria-hidden`, and a focusable control
                          inside that is a tab stop nobody can see. */}
                      {isCurrent && (
                        <button
                          type="button"
                          onClick={() => retrySlide(slide)}
                          className="mt-1 flex items-center gap-1.5 rounded-full
                          bg-white/10 px-3 py-1.5 text-xs font-medium text-white
                          transition-colors hover:bg-white/20
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-white/70"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Tentar novamente
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-full w-full">
                      {(state.status === "loading" || isRenewing) && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <Loader className="h-6 w-6 animate-spin text-white/60" />
                        </div>
                      )}

                      {/* Off the stage while the signature is being renewed:
                          the URL in hand is the expired one, and mounting it
                          again only buys a second failure. */}
                      {!isRenewing && (
                        <Image
                          // The URL and the attempt are both part of the
                          // identity: a renewed signature is a different file
                          // to fetch, and bumping the attempt is what makes
                          // "tentar de novo" refetch the very same one.
                          key={`${slide.key}-${state.attempt}-${slide.url}`}
                          src={slide.url}
                          alt={slide.caption ?? "Foto enviada no chat"}
                          fill
                          sizes="100vw"
                          // Always without Next's optimizer — the signed URL
                          // does not pass remotePatterns, same rule as every
                          // other attachment in the panel.
                          unoptimized
                          // The neighbours are only off-screen by a transform,
                          // and lazy loading would happily decide they are
                          // visible enough to skip — which is exactly the
                          // instant page turn this window exists to buy.
                          priority={isCurrent}
                          loading={isCurrent ? undefined : "eager"}
                          // Without this the browser's own image drag hijacks
                          // the swipe the moment a mouse is used.
                          draggable={false}
                          onLoad={() =>
                            markSlide(slide.key, slide.url, "ready")
                          }
                          onError={() =>
                            markSlide(slide.key, slide.url, "error")
                          }
                          className="select-none object-contain"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------ arrows */}
          {/* Shown by CSS and never by a breakpoint hook: the panel switches
              to its phone layout at `lg`, and a hook measuring `md` would
              leave a band of widths with a phone chat and a desktop viewer.
              The swipe is always on, on every width and both input kinds.

              Both arrows stay mounted at the ends of the gallery and go dim
              instead: unmounting the one that had focus dropped the focus
              into the dialog's own container, which is `outline-none`, so
              nothing on screen looked focused any more and Enter stopped
              answering. `aria-disabled` and not `disabled` for the same
              reason — the browser blurs a control the moment it is disabled,
              which is the very bug again. Focus stays put, the ring stays
              visible, and stepping back the other way lights the arrow up.

              A gallery of one still shows none of this: there is no paging to
              offer, so there is no control to dim either. */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => edges.canGoPrevious && goBy(-1)}
                aria-disabled={!edges.canGoPrevious}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2
                items-center justify-center rounded-full bg-black/50 p-2.5
                text-white transition-colors hover:bg-black/70
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-white/70 aria-disabled:cursor-default
                aria-disabled:hover:bg-black/50 lg:flex"
                style={{
                  opacity: chromeOpacity * (edges.canGoPrevious ? 1 : 0.35),
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <button
                type="button"
                onClick={() => edges.canGoNext && goBy(1)}
                aria-disabled={!edges.canGoNext}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2
                items-center justify-center rounded-full bg-black/50 p-2.5
                text-white transition-colors hover:bg-black/70
                focus-visible:outline-none focus-visible:ring-2
                focus-visible:ring-white/70 aria-disabled:cursor-default
                aria-disabled:hover:bg-black/50 lg:flex"
                style={{
                  opacity: chromeOpacity * (edges.canGoNext ? 1 : 0.35),
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* ------------------------------------------------------ caption */}
          {/* Always in the flow, always the same height. The stage is the
              `flex-1` between this and the header, so a footer that mounts
              only for a photo that happens to have a caption resizes the
              stage — and re-lays out the photo — halfway through the swipe
              that brings that photo in. The band is reserved once, at a
              height that holds the badge and a couple of lines, and the
              content moves in and out of it while nothing above moves.
              A longer caption scrolls inside the reserved band. */}
          <footer
            className={cn(
              "relative z-10 h-24 shrink-0 px-4 pb-4 pt-2 text-white",
              animates && "transition-opacity duration-200",
            )}
            style={{ opacity: chromeOpacity }}
          >
            {photo && (
              <div className="mx-auto h-full max-w-2xl overflow-y-auto">
                {photo.failed && (
                  <span
                    className="mb-1 inline-flex items-center gap-1 rounded-full
                    bg-destructive px-2 py-0.5 text-[11px] font-medium
                    text-destructive-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Não enviada
                  </span>
                )}

                {photo.pending && !photo.failed && (
                  <span
                    className="mb-1 inline-flex items-center gap-1 rounded-full
                    bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white/90"
                  >
                    <Clock className="h-3 w-3" />
                    Enviando...
                  </span>
                )}

                {photo.caption && (
                  <p className="whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">
                    {photo.caption}
                  </p>
                )}
              </div>
            )}
          </footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export { ChatImageViewer };
