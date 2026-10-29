"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import {
  ImageOff,
  RotateCcw,
  RotateCw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  INITIAL_VIEW,
  MAX_ZOOM,
  MIN_ZOOM,
  fittedSize,
  imageTransform,
  inspectorReducer,
  isInitialView,
  keyToAction,
  lensBackground,
  pointToImage,
  type InspectorAction,
  type InspectorView,
  type Point,
  type Size,
} from "./geometry";

interface ImageInspectorProps {
  url: string | null;
  alt: string;
  className?: string;
}

const LENS_SIZE = 160;
const LENS_FACTOR = 2.5;
const LENS_MIN = 1.5;
const LENS_MAX = 5;

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;

/** A mouse or a trackpad: the only devices a hover lens makes sense on. */
const FINE_HOVER = "(hover: hover) and (pointer: fine)";

interface Lens {
  x: number;
  y: number;
  u: number;
  v: number;
}

/**
 * A receipt photo a person can actually read (DLVB-05, DLVB-06).
 *
 * - Zoom (buttons, keyboard, Ctrl + wheel, pinch, double click or tap) always
 *   around what is on screen, with the photo dragged to any corner: the
 *   pan is clamped to exactly the distance that brings each edge in.
 * - Rotation fits the turned photo in the stage instead of overflowing it.
 * - "Restaurar" puts zoom, position and rotation back.
 * - On a mouse, an e-commerce style lens follows the pointer ("Lupa").
 *
 * CSS transforms and pointer events only, no library. Reusable wherever a
 * delivery photo is judged (detail dialog, occurrence photos). Mount it with
 * a `key` per photo: the view survives a new signed URL for the SAME photo
 * (every refetch signs again), and a different photo is a new inspection.
 */
const ImageInspector = ({
  url,
  alt,
  className,
}: ImageInspectorProps): JSX.Element => {
  const stageRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState<Size>({ width: 0, height: 0 });
  const [natural, setNatural] = useState<Size | null>(null);
  const [view, setView] = useState<InspectorView>(INITIAL_VIEW);

  const [canHover, setCanHover] = useState(false);
  const [lensOn, setLensOn] = useState(false);
  const [lensFactor, setLensFactor] = useState(LENS_FACTOR);
  const [lens, setLens] = useState<Lens | null>(null);

  const [dragging, setDragging] = useState(false);

  // Live pointers (for the pinch) and the gesture they belong to.
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    lastPoint?: Point;
    pinchDistance?: number;
    // Where each touch went down: a finger that travelled is not a tap.
    touchStarts: Map<number, Point>;
    // Set once a second finger lands; cleared when the last one lifts.
    multiTouch: boolean;
    lastTap?: { at: number; point: Point };
  }>({ touchStarts: new Map(), multiTouch: false });

  // The double tap is handled on pointerup; the dblclick a mobile browser
  // sends after it must not toggle the zoom a second time.
  const lastPointerType = useRef<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  const instructionsId = useId();

  const hasPhoto = Boolean(url);

  const apply = useCallback(
    (action: InspectorAction) =>
      setView((current) =>
        inspectorReducer(current, action, { natural, stage }),
      ),
    [natural, stage],
  );

  // A photo already in the cache can finish before onLoad is attached.
  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, [url]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia(FINE_HOVER);
    const update = () => {
      setCanHover(query.matches);
      setLensOn(query.matches);
    };

    update();
    query.addEventListener?.("change", update);

    return () => query.removeEventListener?.("change", update);
  }, []);

  // The stage's size drives the fit and the pan limits.
  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const measure = () => {
      const box = element.getBoundingClientRect();
      setStage({ width: box.width, height: box.height });
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [hasPhoto]);

  // A resize or a late load can leave the pan past the new limits.
  useEffect(() => {
    setView((current) =>
      inspectorReducer(
        current,
        { type: "setPan", pan: current.pan },
        { natural, stage },
      ),
    );
  }, [natural, stage]);

  /** A client point as a stage point (relative to the stage's centre). */
  const toStage = (clientX: number, clientY: number): Point => {
    const box = stageRef.current?.getBoundingClientRect();

    if (!box) return { x: 0, y: 0 };

    return {
      x: clientX - box.left - box.width / 2,
      y: clientY - box.top - box.height / 2,
    };
  };

  const fitted = natural
    ? fittedSize(natural, stage, view.rotation)
    : { width: 0, height: 0 };

  // Ctrl + wheel (and a trackpad pinch, which browsers send as one) zooms,
  // or sizes the lens while it is on. A plain wheel stays the page's scroll.
  // Registered by hand: React's wheel listener is passive and cannot cancel.
  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;

      event.preventDefault();

      const direction = event.deltaY < 0 ? 1 : -1;

      if (lensOn && canHover) {
        setLensFactor((current) =>
          Math.min(LENS_MAX, Math.max(LENS_MIN, current + direction * 0.5)),
        );
        return;
      }

      const box = element.getBoundingClientRect();
      const focus = {
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
      };

      apply({ type: "zoomBy", factor: direction > 0 ? 1.15 : 1 / 1.15, focus });
    };

    element.addEventListener("wheel", onWheel, { passive: false });

    return () => element.removeEventListener("wheel", onWheel);
  }, [hasPhoto, lensOn, canHover, apply]);

  // At 1× the stage leaves a one-finger vertical swipe to the page (pan-y).
  // Two fingers are a pinch: cancelling their moves keeps the browser from
  // scrolling instead, which would also cancel the pointers mid-gesture.
  // touch-action cannot do this: it is read when the first finger lands.
  useEffect(() => {
    const element = stageRef.current;

    if (!element) return;

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2 && event.cancelable) event.preventDefault();
    };

    element.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => element.removeEventListener("touchmove", onTouchMove);
  }, [hasPhoto]);

  const updateLens = (clientX: number, clientY: number) => {
    if (!lensOn || !canHover || !natural) return setLens(null);

    const point = toStage(clientX, clientY);
    const uv = pointToImage(point, view, fitted);

    if (!uv) return setLens(null);

    setLens({
      x: point.x + stage.width / 2,
      y: point.y + stage.height / 2,
      ...uv,
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const point = toStage(event.clientX, event.clientY);

    lastPointerType.current = event.pointerType;
    pointers.current.set(event.pointerId, point);

    if (event.pointerType === "touch") {
      gesture.current.touchStarts.set(event.pointerId, point);
    }

    if (pointers.current.size >= 2) gesture.current.multiTouch = true;

    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      gesture.current.pinchDistance = Math.hypot(
        first.x - second.x,
        first.y - second.y,
      );

      // A pinch is not a drag: the first finger's point goes stale while
      // both move, and is set again when one of them lifts.
      gesture.current.lastPoint = undefined;
      setDragging(true);
    } else if (pointers.current.size === 1 && view.zoom > 1) {
      gesture.current.lastPoint = point;
      setDragging(true);
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = toStage(event.clientX, event.clientY);

    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, point);
    }

    const start = gesture.current.touchStarts.get(event.pointerId);

    if (
      start &&
      Math.hypot(point.x - start.x, point.y - start.y) >= DOUBLE_TAP_PX
    ) {
      gesture.current.touchStarts.delete(event.pointerId);
    }

    if (pointers.current.size === 2 && gesture.current.pinchDistance) {
      const [first, second] = [...pointers.current.values()];
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const ratio = distance / gesture.current.pinchDistance;

      gesture.current.pinchDistance = distance;

      // Relative to the zoom when it applies: several moves can arrive
      // before the next render.
      apply({
        type: "zoomBy",
        factor: ratio,
        focus: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      });
      return;
    }

    if (dragging && gesture.current.lastPoint) {
      const last = gesture.current.lastPoint;
      gesture.current.lastPoint = point;

      apply({ type: "panBy", dx: point.x - last.x, dy: point.y - last.y });
      return;
    }

    if (event.pointerType === "mouse") updateLens(event.clientX, event.clientY);
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    const point = toStage(event.clientX, event.clientY);
    const start = gesture.current.touchStarts.get(event.pointerId);
    const wasMultiTouch = gesture.current.multiTouch;
    const wasPinching = pointers.current.size >= 2;

    pointers.current.delete(event.pointerId);
    gesture.current.touchStarts.delete(event.pointerId);

    if (pointers.current.size === 2) {
      // A third finger lifted: the pinch goes on between the two left, from
      // their distance now, or the next move would zoom by a stale ratio.
      const [first, second] = [...pointers.current.values()];
      gesture.current.pinchDistance = Math.hypot(
        first.x - second.x,
        first.y - second.y,
      );
    } else {
      gesture.current.pinchDistance = undefined;
    }

    if (pointers.current.size === 1 && wasPinching) {
      // The finger still down carries on as a drag from where it IS. Its
      // point from before the pinch made the photo jump by the whole way the
      // finger had travelled meanwhile.
      const [remaining] = [...pointers.current.values()];

      gesture.current.lastPoint = remaining;
      setDragging(true);
    }

    if (pointers.current.size === 0) {
      setDragging(false);
      gesture.current.lastPoint = undefined;
      gesture.current.multiTouch = false;
    }

    if (event.pointerType !== "touch") return;

    // A double tap zooms on touch, like a double click with the mouse. A tap
    // is one finger down and up in place: the end of a pinch (two fingers
    // lifted side by side) or of a drag is not one.
    const isTap =
      event.type === "pointerup" &&
      !wasMultiTouch &&
      start !== undefined &&
      Math.hypot(point.x - start.x, point.y - start.y) < DOUBLE_TAP_PX;

    if (!isTap) {
      gesture.current.lastTap = undefined;
      return;
    }

    const previous = gesture.current.lastTap;
    const now = Date.now();

    if (
      previous &&
      now - previous.at < DOUBLE_TAP_MS &&
      Math.hypot(point.x - previous.point.x, point.y - previous.point.y) <
        DOUBLE_TAP_PX
    ) {
      gesture.current.lastTap = undefined;
      toggleZoomAt(point);
    } else {
      gesture.current.lastTap = { at: now, point };
    }
  };

  const toggleZoomAt = (focus: Point) =>
    apply(
      view.zoom > 1 ? { type: "reset" } : { type: "zoomTo", zoom: 2, focus },
    );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const action = keyToAction(event.key, stage);

    if (!action) return;

    event.preventDefault();
    apply(action);
  };

  if (!url) {
    return (
      <div
        className="flex h-64 flex-col items-center justify-center gap-2
        rounded-lg border-2 border-dashed text-muted-foreground"
      >
        <ImageOff className="h-8 w-8" />
        <p className="text-sm">A foto deste comprovante não está disponível.</p>
      </div>
    );
  }

  const showLens = Boolean(lens && lensOn && canHover && !dragging);
  const background = lens
    ? lensBackground(lens, fitted, view.zoom, lensFactor, LENS_SIZE)
    : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-label={alt}
        aria-describedby={instructionsId}
        data-zoom={view.zoom}
        data-rotation={view.rotation}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setLens(null);
        }}
        onDoubleClick={(event) => {
          // A touch double tap was already handled on its pointerup.
          if (lastPointerType.current === "touch") return;

          toggleZoomAt(toStage(event.clientX, event.clientY));
        }}
        style={{ touchAction: view.zoom > 1 ? "none" : "pan-y" }}
        className={cn(
          `relative h-64 select-none overflow-hidden rounded-lg border
          bg-muted/30 outline-none focus-visible:ring-2 focus-visible:ring-ring
          focus-visible:ring-offset-2 sm:h-80`,
          view.zoom > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : "cursor-zoom-in",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={url}
          alt={alt}
          draggable={false}
          onLoad={(event) =>
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            })
          }
          style={
            natural && fitted.width > 0
              ? {
                  width: fitted.width,
                  height: fitted.height,
                  maxWidth: "none",
                  transform: imageTransform(view),
                }
              : {
                  maxWidth: "100%",
                  maxHeight: "100%",
                  transform: imageTransform(view),
                }
          }
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 origin-center",
            !dragging &&
              "motion-safe:transition-transform motion-safe:duration-150",
          )}
        />

        {showLens && background && lens && (
          <div
            aria-hidden="true"
            data-testid="image-inspector-lens"
            className="pointer-events-none absolute rounded-full border-2
            border-background shadow-lg ring-1 ring-black/10"
            style={{
              width: LENS_SIZE,
              height: LENS_SIZE,
              left: lens.x - LENS_SIZE / 2,
              top: lens.y - LENS_SIZE / 2,
              backgroundImage: `url("${url.replace(/"/g, "%22")}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${background.width}px ${background.height}px`,
              backgroundPosition: `${background.x}px ${background.y}px`,
              transform: `rotate(${view.rotation}deg)`,
            }}
          />
        )}

        <p id={instructionsId} className="sr-only">
          Use + e − para aproximar, as setas para mover, R para girar e 0 para
          restaurar. Arraste para mover a foto ampliada.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => apply({ type: "rotate" })}
          aria-label="Girar a foto 90 graus"
          className="gap-2"
        >
          <RotateCw className="h-4 w-4" />
          Girar
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={view.zoom <= MIN_ZOOM}
          onClick={() => apply({ type: "zoomOut" })}
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span
          className="min-w-[3rem] text-center text-xs text-muted-foreground"
          aria-live="polite"
        >
          {Math.round(view.zoom * 100)}%
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={view.zoom >= MAX_ZOOM}
          onClick={() => apply({ type: "zoomIn" })}
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isInitialView(view)}
          onClick={() => apply({ type: "reset" })}
          aria-label="Restaurar zoom, posição e giro"
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar
        </Button>

        {canHover && (
          <Button
            type="button"
            variant={lensOn ? "secondary" : "outline"}
            size="sm"
            aria-pressed={lensOn}
            onClick={() => {
              setLensOn((current) => !current);
              setLens(null);
            }}
            title="Com a lupa ligada, Ctrl + roda do mouse ajusta o aumento"
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Lupa
          </Button>
        )}

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline underline-offset-2
          hover:text-foreground"
        >
          Abrir em tamanho real
        </a>
      </div>
    </div>
  );
};

export { ImageInspector };
export type { ImageInspectorProps };
