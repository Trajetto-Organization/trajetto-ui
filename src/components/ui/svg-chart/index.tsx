"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

interface SvgChartProps {
  // One record per point on the X axis. Typed as plain objects on purpose:
  // both `xKey` and the series keys are chosen at runtime by the caller, so
  // constraining them to `keyof T` would be safety the component cannot
  // actually honour.
  data: readonly object[];

  /** Which numeric keys of each record to plot, and how to label them. */
  series: ChartSeries[];

  /** Key holding the X axis label of each record. */
  xKey: string;

  variant?: "area" | "bar";

  /**
   * Bars only. Stacks the series on top of each other instead of placing them
   * side by side, so the full height reads as the total while the segments
   * show what it is made of.
   */
  stacked?: boolean;

  /** Plot height in pixels. The width always follows the container. */
  height?: number;

  /** Formats values in the tooltip and on the Y axis. */
  formatValue?: (value: number) => string;

  className?: string;
}

// The SVG uses its own coordinate space and is stretched to the container with
// `preserveAspectRatio="none"`, so the drawing fills whatever width it gets.
// Axis labels are NOT drawn in the SVG: stretching would squash the glyphs.
// They are HTML, positioned over the same box.
const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 300;

const Y_TICKS = 4;

// Width reserved on the left for the Y axis labels. The plot starts after it,
// so every conversion between a pointer position and a data index has to
// subtract it — otherwise the whole chart reads as offset by this much.
const AXIS_GUTTER = 48;

const defaultFormat = (value: number): string =>
  new Intl.NumberFormat("pt-BR").format(value);

/**
 * Line/area and bar chart drawn as plain SVG.
 *
 * Replaces recharts, which cost 101 kB gzipped to render three chart types
 * that are, at heart, a path and some rectangles. The maths here is the whole
 * library: map an index to an X, map a value to a Y, join the points.
 *
 * Adapted from the `trend-chart` already running in downclique-ui, so both
 * projects share one approach.
 */
const SvgChart = ({
  data,
  series,
  xKey,
  variant = "area",
  stacked = false,
  height = 250,
  formatValue = defaultFormat,
  className,
}: SvgChartProps): JSX.Element => {
  // The series keys are not part of T: callers describe them at runtime, so
  // each point is read through a widened view instead of being indexed.
  const read = (point: object, key: string): number =>
    Number((point as Record<string, unknown>)[key]) || 0;

  const readLabel = (point: object): string =>
    String((point as Record<string, unknown>)[xKey]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // The wrapper node is needed during render to place the tooltip, and reading
  // a ref while rendering is not allowed. A callback ref stored in state gives
  // the node as an ordinary render value on the next commit — the tooltip only
  // ever exists after an interaction, so it is never missing on first paint.
  const [wrapper, setWrapper] = useState<HTMLDivElement | null>(null);

  // Width of the plot box. The tooltip is clamped against it, so it has to be
  // a real measurement rather than a guess — this is what keeps the card from
  // hanging off the screen on a phone.
  const [plotWidth, setPlotWidth] = useState(0);

  const visible = series.filter((s) => !hidden.has(s.key));

  const maxValue = useMemo(() => {
    let max = 0;

    for (const point of data) {
      if (stacked) {
        // Stacked bars are as tall as the sum of their segments, so scaling
        // by the tallest single series would push the stack off the top.
        const total = visible.reduce((sum, s) => sum + read(point, s.key), 0);
        if (total > max) max = total;
        continue;
      }

      for (const s of visible) {
        const value = read(point, s.key);
        if (value > max) max = value;
      }
    }

    // The 10% headroom keeps the highest point off the top edge.
    return max * 1.1 || 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, visible, stacked]);

  // Points sit ON the edges: the first at x=0, the last at x=VIEWBOX_WIDTH.
  // Correct for a line, wrong for a bar — a bar centred on x=0 hangs half
  // outside the plot. Bars get a band scale instead, one slot per point, and
  // are centred inside their own slot.
  const bandWidth = VIEWBOX_WIDTH / (data.length || 1);

  const toX = (index: number): number => {
    const denominator = data.length - 1 || 1;
    return (index / denominator) * VIEWBOX_WIDTH;
  };

  const toBandX = (index: number): number => index * bandWidth + bandWidth / 2;

  /** Where the cursor, the dots and the tooltip line up for this variant. */
  const centerX = (index: number): number =>
    variant === "bar" ? toBandX(index) : toX(index);

  const toY = (value: number): number =>
    VIEWBOX_HEIGHT - (value / maxValue) * VIEWBOX_HEIGHT;

  const linePath = (key: string): string =>
    data
      .map(
        (point, i) =>
          `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(read(point, key))}`,
      )
      .join(" ");

  const areaPath = (key: string): string =>
    data.length
      ? `${linePath(key)} L ${toX(data.length - 1)} ${VIEWBOX_HEIGHT} L ${toX(0)} ${VIEWBOX_HEIGHT} Z`
      : "";

  const yTicks = Array.from(
    { length: Y_TICKS + 1 },
    (_, i) => (maxValue / Y_TICKS) * i,
  );

  // Aim for roughly six labels on the X axis, always including the last one.
  const xLabelStep = Math.max(1, Math.ceil(data.length / 6));

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!wrapper || data.length === 0 || visible.length === 0) {
      setHoverIndex(null);
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    if (rect.width !== plotWidth) setPlotWidth(rect.width);

    // The pointer position has to be measured against the PLOT, not the whole
    // box: the Y axis labels occupy the first AXIS_GUTTER pixels, and ignoring
    // them shifts every reading to the left by that much.
    const usable = rect.width - AXIS_GUTTER;
    if (usable <= 0) return;

    const ratio = (event.clientX - rect.left - AXIS_GUTTER) / usable;

    // Bars own a slot, so the nearest one is whichever slot the pointer is
    // inside; points are discrete, so the nearest one is the closest index.
    const index =
      variant === "bar"
        ? Math.floor(ratio * data.length)
        : Math.round(ratio * (data.length - 1));

    setHoverIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);

      // Never let the last visible series be hidden — an empty plot with a
      // live Y axis reads as a bug rather than a choice.
      if (next.has(key)) next.delete(key);
      else if (visible.length > 1) next.add(key);

      return next;
    });
  };

  const hoverPoint = hoverIndex !== null ? data[hoverIndex] : null;

  // Tooltip geometry, all in pixels against the measured box.
  //
  // The previous version flipped sides based on the hovered INDEX, which only
  // works while the chart is wide: on a narrow screen the card is wider than
  // half the plot, so flipping still left it off-screen. Clamping to the box
  // is correct at every width.
  const TOOLTIP_GAP = 8;

  // Deliberately narrow. The card only ever holds a date, a couple of series
  // names and their values, and the names truncate — anything wider is empty
  // space that makes the chart feel cluttered on hover.
  const TOOLTIP_MAX = 168;

  const tooltipWidth = Math.max(
    120,
    Math.min(TOOLTIP_MAX, plotWidth - TOOLTIP_GAP * 2),
  );

  // Centred on the hovered point, then pulled back inside the box. The outer
  // Math.max comes last so that on a container narrower than the card the left
  // edge wins, instead of the card sliding off to the right.
  const tooltipLeft =
    hoverIndex === null || plotWidth === 0
      ? 0
      : Math.max(
          TOOLTIP_GAP,
          Math.min(
            AXIS_GUTTER +
              (centerX(hoverIndex) / VIEWBOX_WIDTH) *
                (plotWidth - AXIS_GUTTER) -
              tooltipWidth / 2,
            plotWidth - tooltipWidth - TOOLTIP_GAP,
          ),
        );

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={setWrapper}
        className="relative w-full"
        style={{ height }}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Y axis grid and labels, in HTML so the text stays crisp. */}
        <div className="absolute inset-0 flex flex-col-reverse justify-between">
          {yTicks.map((tick, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
                {formatValue(Math.round(tick))}
              </span>
              <span className="h-px flex-1 bg-border/60" />
            </div>
          ))}
        </div>

        {/* Plot area, offset to clear the Y labels. */}
        <div className="absolute inset-y-0 left-12 right-0">
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label="Gráfico"
          >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`svg-chart-fill-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>

            {variant === "area"
              ? visible.map((s) => (
                  <g key={s.key}>
                    <path
                      d={areaPath(s.key)}
                      fill={`url(#svg-chart-fill-${s.key})`}
                    />
                    <path
                      d={linePath(s.key)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      // Without this the horizontal stretch would make the
                      // stroke thicker on one axis than the other.
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))
              : data.map((point, i) => {
                  const slots = stacked ? 1 : visible.length || 1;
                  const barWidth = (bandWidth * 0.6) / slots;
                  const start = toBandX(i) - (barWidth * slots) / 2;

                  let stackTop = VIEWBOX_HEIGHT;

                  return (
                    <g key={i}>
                      {visible.map((s, si) => {
                        const value = read(point, s.key);
                        const segment =
                          (value / maxValue) * VIEWBOX_HEIGHT;

                        const y = stacked ? stackTop - segment : toY(value);
                        if (stacked) stackTop -= segment;

                        return (
                          <rect
                            key={s.key}
                            x={stacked ? start : start + si * barWidth}
                            y={y}
                            width={barWidth}
                            height={Math.max(
                              stacked ? segment : VIEWBOX_HEIGHT - y,
                              0,
                            )}
                            fill={s.color}
                            opacity={
                              hoverIndex === null || hoverIndex === i ? 1 : 0.45
                            }
                          />
                        );
                      })}
                    </g>
                  );
                })}

            {/* Hover cursor and points */}
            {hoverIndex !== null && (
              <g>
                <line
                  x1={centerX(hoverIndex)}
                  y1={0}
                  x2={centerX(hoverIndex)}
                  y2={VIEWBOX_HEIGHT}
                  stroke="currentColor"
                  className="text-muted-foreground/40"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
                {variant === "area" &&
                  visible.map((s) => (
                    <circle
                      key={s.key}
                      cx={centerX(hoverIndex)}
                      cy={toY(read(data[hoverIndex], s.key))}
                      r={4}
                      fill={s.color}
                      stroke="white"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
              </g>
            )}
          </svg>
        </div>

        {/* Tooltip */}
        {hoverPoint && hoverIndex !== null && (
          <div
            className="pointer-events-none absolute top-2 z-50
            rounded-lg border bg-background px-2.5 py-2 shadow-md"
            style={{ left: tooltipLeft, width: tooltipWidth }}
          >
            <p className="truncate text-[11px] uppercase leading-none text-muted-foreground">
              {readLabel(hoverPoint)}
            </p>

            {/* Label above, value below. Side by side they compete for the
                same line, and a long currency figure next to a long series
                name always loses — one of the two ends up clipped no matter
                how the shrinking is tuned. Stacking removes the contest. */}
            <div className="mt-1.5 grid gap-1.5">
              {visible.map((s) => (
                <div key={s.key} className="grid gap-[3px] leading-none">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="min-w-0 truncate text-[12px] text-muted-foreground">
                      {s.label}
                    </span>
                  </div>

                  {/* Aligned under the label, past the dot and its gap. */}
                  <span className="pl-[0.875rem] text-[14px] font-medium tabular-nums">
                    {formatValue(read(hoverPoint, s.key))}
                  </span>
                </div>
              ))}

              {stacked && visible.length > 1 && (
                <div className="flex items-baseline gap-2 border-t pt-1.5 leading-none">
                  <span className="text-[11px] uppercase text-muted-foreground">
                    Total
                  </span>
                  <span className="ml-auto text-[14px] font-semibold tabular-nums">
                    {formatValue(
                      visible.reduce(
                        (sum, s) => sum + read(hoverPoint, s.key),
                        0,
                      ),
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* X axis labels. Bars get one equal cell per slot so each label sits
          under its own bar; points spread edge to edge, matching where they
          are actually drawn. */}
      <div
        className={cn(
          "ml-12 mt-2 text-[10px] text-muted-foreground",
          variant === "bar" ? "flex" : "flex justify-between",
        )}
      >
        {data.map((point, i) => {
          const show = i % xLabelStep === 0 || i === data.length - 1;

          if (variant === "bar") {
            return (
              <span
                key={i}
                className="min-w-0 flex-1 truncate text-center"
                style={{ visibility: show ? undefined : "hidden" }}
              >
                {readLabel(point)}
              </span>
            );
          }

          return show ? (
            <span key={i} className="truncate">
              {readLabel(point)}
            </span>
          ) : null;
        })}
      </div>

      {/* Legend. Clicking a series hides it, which also rescales the Y axis. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 px-2">
        {series.map((s) => {
          const isHidden = hidden.has(s.key);

          return (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                "transition-opacity hover:bg-muted/50",
                isHidden && "opacity-40",
              )}
              aria-pressed={!isHidden}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="whitespace-nowrap text-muted-foreground">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { SvgChart };
export type { ChartSeries, SvgChartProps };
