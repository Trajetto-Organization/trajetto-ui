"use client";

import { useRef } from "react";

import {
  X,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Info,
  Shield,
  CheckCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MovingArrow } from "@/components/site/arrow-link";
import { cn } from "@/lib/utils";

import type { ParsedContent } from "./tutorial-component.types";
import { useTutorialComponent } from "./hooks";

/** Only one tutorial card is ever mounted, so a constant id is enough. */
const TUTORIAL_TITLE_ID = "tutorial-step-title";

/** A drag of the sheet's handle longer than this closes the tour. */
const SHEET_DISMISS_DRAG_PX = 80;

const ContentRenderer = ({ item }: { item: ParsedContent }): JSX.Element => {
  switch (item.type) {
    case "permissions":
      return (
        <div className="tutorial-permission-section-compact">
          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="mb-2 border-blue-300 bg-blue-50 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
              >
                Permissões
              </Badge>
              <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-200">
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );
    case "warning":
      return (
        <div className="tutorial-warning-section-compact">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="mb-2 border-amber-300 bg-amber-50 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
              >
                Importante
              </Badge>
              <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );
    case "note":
      return (
        <div className="tutorial-info-section-compact">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">
              <Badge
                variant="outline"
                className="mb-2 border-emerald-300 bg-emerald-50 text-xs text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                Nota
              </Badge>
              <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-200">
                {item.content}
              </p>
            </div>
          </div>
        </div>
      );
    case "list":
      return (
        <div className="tutorial-list-compact">
          <ul className="space-y-2">
            {item.items?.map((listItem, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {listItem}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.content}
        </p>
      );
  }
};

/** Classes of the arrow on "Anterior": the site's MovingArrow, mirrored. */
const BACK_ARROW_CLASS =
  "h-4 w-4 shrink-0 transition-transform duration-200 ease-out " +
  "group-hover/arrow:-translate-x-1 group-focus-visible/arrow:-translate-x-1 motion-reduce:!translate-x-0";

const TutorialComponent = (): JSX.Element | null => {
  const tutorial = useTutorialComponent();
  const dragStartY = useRef<number | null>(null);

  if (!tutorial) return null;

  const {
    status,
    phase,
    visible,
    contentHidden,
    timings,
    anchor,
    title,
    shownStep,
    handleNextStep,
    handlePrevStep,
    parsedContent,
    skipTutorial,
    isMobile,
    steps,
    tooltipRef,
    holeRef,
    glowRef,
    contentRef,
  } = tutorial;

  const isLast = shownStep === steps.length - 1;

  return (
    /*
     * pointer-events-auto and the two stopPropagation calls exist for the
     * phone step that opens the sidebar drawer: the drawer is a modal Radix
     * dialog that disables pointer events on <body> and closes on any
     * pointerdown or focus outside itself — the card included.
     */
    <div
      className="pointer-events-auto fixed inset-0 z-[99999] animate-fade-in"
      data-tutorial-overlay
      onPointerDown={(event) => event.stopPropagation()}
      onFocus={(event) => event.stopPropagation()}
    >
      {/* Dark overlay with the cutout. It also swallows clicks, so the page
          underneath is never touched — no style is written on the target.
          The hole and the glow are positioned by the engine's stage, in the
          same frame the target moves (engine/stage.ts). */}
      <div className="tutorial-backdrop absolute inset-0">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* x/y/width/height are CSS properties of an SVG rect: no transition. */}
              <rect
                ref={holeRef}
                x="0"
                y="0"
                width="0"
                height="0"
                rx="8"
                fill="black"
                className="transition-none"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.6)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      <div
        ref={glowRef}
        aria-hidden="true"
        data-tutorial-glow
        // transition-none: see the card below.
        className="tutorial-enhanced-spotlight pointer-events-none absolute left-0 top-0 opacity-0 transition-none"
      />

      <div
        ref={tooltipRef}
        /**
         * A real dialog. `aria-modal` is honest because the hook traps Tab
         * inside this element.
         */
        role="dialog"
        aria-modal="true"
        /*
         * On a phone the tour opens the sidebar drawer, a modal Radix dialog
         * that marks everything outside itself aria-hidden (aria-hidden's
         * `hideOthers`) — this card included, so a screen reader lost
         * "Próximo" mid-tour. `hideOthers` never hides an `[aria-live]`
         * element; "off" is the attribute's default, so nothing is announced
         * differently.
         */
        aria-live="off"
        aria-labelledby={TUTORIAL_TITLE_ID}
        tabIndex={-1}
        data-tutorial-card
        data-target-status={status}
        data-phase={phase}
        data-step-anchor={anchor}
        // `data-placement`, `transform` and `max-height` are written by the
        // stage (engine/stage.ts), never by React. transition-none: the stage
        // is the only thing that animates the card. Under reduced motion the
        // global rule gives every element `transition: all 0.01ms`, which
        // turned each written transform into a late-starting CSS transition:
        // the new copy painted at the old spot for a few frames.
        className={cn(
          "tutorial-tooltip-compact group/card fixed flex flex-col overflow-hidden shadow-2xl outline-none transition-none",
          isMobile
            ? cn(
                "inset-x-0 max-h-[45dvh] w-full",
                "data-[placement=sheet-bottom]:bottom-0 data-[placement=sheet-bottom]:rounded-t-2xl",
                "data-[placement=sheet-bottom]:pb-[env(safe-area-inset-bottom)]",
                "data-[placement=sheet-top]:top-0 data-[placement=sheet-top]:rounded-b-2xl",
                "data-[placement=sheet-top]:pt-[env(safe-area-inset-top)]",
              )
            : "left-0 top-0 max-h-[70vh] w-[min(28rem,calc(100vw-24px))] rounded-lg",
          // Laid out but not shown until the first step is resolved and
          // placed; afterwards the copy fades, the card itself stays.
          visible ? "visible" : "invisible",
        )}
      >
        {/* Everything inside fades as one: the old copy is never seen at the
            new spot, the new copy never at the old one. */}
        <div
          ref={contentRef}
          data-tutorial-content
          className="flex min-h-0 flex-1 flex-col transition-opacity ease-out"
          style={{
            opacity: contentHidden ? 0 : 1,
            transitionDuration: `${contentHidden ? timings.contentOutMs : timings.contentInMs}ms`,
          }}
        >
          {/* Header. On the sheet it is also the drag handle: down closes. */}
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-border/50 p-3 pb-2",
              isMobile && "touch-none",
            )}
            onTouchStart={
              isMobile
                ? (event) => {
                    dragStartY.current = event.touches[0]?.clientY ?? null;
                  }
                : undefined
            }
            onTouchEnd={
              isMobile
                ? (event) => {
                    const start = dragStartY.current;
                    const end = event.changedTouches[0]?.clientY;

                    dragStartY.current = null;

                    if (
                      start !== null &&
                      end !== undefined &&
                      end - start > SHEET_DISMISS_DRAG_PX
                    ) {
                      skipTutorial();
                    }
                  }
                : undefined
            }
          >
            {isMobile && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-1.5 hidden h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/30
                  group-data-[placement=sheet-bottom]/card:block"
              />
            )}
            <div className="flex flex-1 items-center gap-2">
              <div className="shrink-0 rounded-md bg-gradient-to-br from-primary/20 to-primary/10 p-1.5">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id={TUTORIAL_TITLE_ID}
                  className="text-base font-semibold leading-tight text-foreground"
                >
                  {title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {shownStep + 1} de {steps.length}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={skipTutorial}
            >
              <span className="sr-only">Fechar tutorial</span>
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* Focusable on purpose: a region that scrolls but cannot be focused
              is unreachable with a keyboard (WCAG 2.1.1). */}
          <div
            role="region"
            aria-label="Conteúdo do tutorial"
            tabIndex={0}
            data-tutorial-card-body
            className="tutorial-content-scroll min-h-0 flex-1 overflow-y-auto p-4"
          >
            <div className="space-y-3">
              {parsedContent.map((item, index) => (
                <ContentRenderer key={index} item={item} />
              ))}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-border/50 bg-muted/20 p-3 pt-2">
            <div className="flex gap-1" aria-hidden="true">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                    index === shownStep
                      ? "tutorial-progress-enhanced"
                      : index < shownStep
                        ? "bg-primary/60"
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div
              className={cn(
                "flex items-center gap-2",
                isMobile ? "flex-row" : "justify-between",
              )}
            >
              <div className={cn(isMobile && "flex-1")}>
                {shownStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevStep}
                    className={cn(
                      "group/arrow text-sm",
                      isMobile ? "h-10 w-full" : "h-8",
                    )}
                  >
                    <ArrowLeft
                      className={BACK_ARROW_CLASS}
                      aria-hidden="true"
                    />
                    Anterior
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleNextStep}
                className={cn(
                  "tutorial-button-primary group/arrow text-sm",
                  isMobile ? "h-10 flex-1" : "ml-auto h-8",
                )}
              >
                {isLast ? (
                  "Concluir"
                ) : (
                  <>
                    Próximo
                    <MovingArrow size={16} />
                  </>
                )}
              </Button>
            </div>

            {shownStep === 0 && (
              <div className="w-full pt-1.5 text-center">
                <button
                  type="button"
                  onClick={skipTutorial}
                  // min-h-6 leading-6: a 24px target (WCAG 2.5.8); one line of
                  // text-xs made it 16px tall on a phone. Not flex: the desktop
                  // label mixes text and a <span>, and flex drops their spaces.
                  className="tutorial-skip-hover inline-block min-h-6 rounded-sm text-xs leading-6 text-muted-foreground
                    ring-offset-background transition-colors hover:text-foreground
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    focus-visible:ring-offset-2"
                >
                  {isMobile ? (
                    "Pular tutorial"
                  ) : (
                    <>
                      Pular tutorial • Pressione{" "}
                      <span className="tutorial-keyboard-hint">ESC</span> para
                      sair
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialComponent;
