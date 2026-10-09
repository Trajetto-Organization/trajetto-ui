import colors from "tailwindcss/colors";

import {
  WHITE,
  contrast,
  hexToRgb,
  hslToRgb,
  over,
  type Rgb,
} from "./contrast";

/**
 * Contrast of the text in server-rendered markup, measured in both themes.
 *
 * Reads the colours the classes name: Tailwind's palette (`bg-green-700`,
 * `text-yellow-950`), arbitrary hex (`bg-[#c2185b]`), the theme tokens of
 * globals.css (`bg-card`, `text-foreground`), gradients, inline
 * `linear-gradient`s and the backgrounds of CSS module classes, with their
 * alpha, and `dark:` overrides for the dark theme. Translucent surfaces are
 * composited over what lies beneath them, down to the page background, and
 * a gradient is measured along its whole length.
 *
 * Left out, because no colour can be read for them: text in a theme token
 * on token surfaces (the design system's business), gradient text, text
 * drawn in SVG, and text laid over a photo.
 */
export type Theme = "light" | "dark";

export const THEMES: readonly Theme[] = ["light", "dark"];

export interface Paint {
  rgb: Rgb;
  alpha: number;
  /** Follows the theme (a globals.css token) rather than pinning a colour. */
  token: boolean;
}

export interface ContrastFinding {
  text: string;
  theme: Theme;
  ratio: number;
  floor: number;
  /** The class that names the text colour, and what paints behind it, top first. */
  where: string;
}

export type Tokens = Record<Theme, Map<string, Rgb>>;

export interface ContrastSources {
  tokens: Tokens;
  /** `background` declarations of CSS module classes, by class name. */
  moduleBackgrounds?: Map<string, string>;
}

/** `--name: H S% L%` of `:root` and `.dark` in globals.css. */
export function themeTokens(css: string): Tokens {
  const read = (selector: string) => {
    const start = css.indexOf(selector);
    if (start < 0) throw new Error(`${selector} not found in globals.css`);

    const block = css.slice(start, css.indexOf("}", start));
    const tokens = new Map<string, Rgb>();

    for (const match of block.matchAll(
      /--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g,
    )) {
      tokens.set(
        match[1],
        hslToRgb([Number(match[2]), Number(match[3]), Number(match[4])]),
      );
    }

    // The public site's palette (`--site-*`, redesign 10/2026) lives in its
    // own :root / .dark blocks, as RGB channels.
    const blocks = new RegExp(
      `(?:^|\\n)${selector.replace(".", "\\.").replace(" {", "\\s*\\{")}([^}]*)\\}`,
      "g",
    );
    for (const site of css.matchAll(blocks)) {
      for (const match of site[1].matchAll(
        /--(site-[\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g,
      )) {
        tokens.set(match[1], [
          Number(match[2]),
          Number(match[3]),
          Number(match[4]),
        ]);
      }
    }
    return tokens;
  };

  return { light: read(":root {"), dark: read(".dark {") };
}

/** The `background` of each class in CSS module sources (single-class rules only). */
export function moduleBackgrounds(sources: string[]): Map<string, string> {
  const backgrounds = new Map<string, string>();

  for (const css of sources) {
    const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");

    for (const rule of plain.matchAll(
      /(?:^|[}\s])\.([A-Za-z][\w-]*)\s*\{([^{}]*)\}/g,
    )) {
      const declaration =
        /(?:^|;|\s)background(?:-color|-image)?\s*:\s*([^;]+)/.exec(rule[2]);
      if (declaration) backgrounds.set(rule[1], declaration[1].trim());
    }
  }

  return backgrounds;
}

const PALETTE = colors as unknown as Record<string, Record<string, string>>;
const PALETTE_NAMES = new Set([
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]);

function hex(value: string): Rgb {
  const digits = value.replace(/^#/, "");
  return hexToRgb(digits.length === 3 ? digits.replace(/./g, "$&$&") : digits);
}

/**
 * The colour a utility's value names (`green-700/80`, `[#c2185b]`,
 * `card`), or null when it names none (`xs`, `center`, `gradient-to-r`).
 */
export function colourOf(
  value: string,
  theme: Theme,
  tokens: Tokens,
): Paint | null {
  const match = /^(.+?)(?:\/(?:(\d+)|\[(\d*\.?\d+)\]))?$/.exec(value);
  if (!match) return null;

  const [, name, percent, fraction] = match;
  const alpha =
    fraction !== undefined
      ? Number(fraction)
      : percent !== undefined
        ? Number(percent) / 100
        : 1;

  if (name === "transparent") return { rgb: WHITE, alpha: 0, token: false };
  if (name === "white") return { rgb: WHITE, alpha, token: false };
  if (name === "black") return { rgb: [0, 0, 0], alpha, token: false };

  const arbitrary = /^\[#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\]$/.exec(name);
  if (arbitrary) return { rgb: hex(arbitrary[1]), alpha, token: false };

  const palette = /^([a-z]+)-(\d{2,3})$/.exec(name);
  if (palette && PALETTE_NAMES.has(palette[1])) {
    const value = PALETTE[palette[1]]?.[palette[2]];
    return value ? { rgb: hex(value), alpha, token: false } : null;
  }

  const token = tokens[theme].get(
    name === "sidebar" ? "sidebar-background" : name,
  );
  // Site colours are measured, not trusted: the site palette pairs its own
  // ink and surfaces, and a site text on a site surface is exactly what the
  // public pages are made of.
  return token ? { rgb: token, alpha, token: !name.startsWith("site-") } : null;
}

/** The utilities that apply in a theme: the plain ones, then `dark:` ones over them. */
function utilities(element: Element, theme: Theme): string[] {
  const all = (element.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const plain = all.filter((name) => !name.includes(":"));

  if (theme === "light") return plain;

  const dark = all
    .filter((name) => name.startsWith("dark:") && !name.slice(5).includes(":"))
    .map((name) => name.slice(5));

  return [...plain, ...dark];
}

/** `bg-*` utilities that paint no colour of their own. */
const NOT_A_COLOUR =
  /^bg-(?:gradient-to-|clip-|none$|cover$|contain$|auto$|center$|top|bottom|left|right|no-repeat$|repeat|fixed$|local$|scroll$|origin-|blend-|opacity-|grid-pattern$|\[(?:length|url|image|size|position):|\[(?:linear|radial|conic)-gradient)/;

/** A CSS module class as Vitest names it: `_hero_24dafc`. */
const MODULE_CLASS = /^_(.+)_[0-9a-f]{6}$/;

type Surface = { stops: Paint[]; source: string } | "unknown" | null;

/** Stops of a CSS background value: a linear gradient or a solid colour in hex. */
function backgroundStops(value: string): Paint[] | "unknown" {
  const gradient = /^linear-gradient\((.*)\)$/.exec(value.trim());
  if (gradient) {
    const stops = [
      ...gradient[1].matchAll(/#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b/g),
    ].map((match) => ({
      rgb: hexToRgb(match[1]),
      alpha: match[2] ? parseInt(match[2], 16) / 255 : 1,
      token: false,
    }));
    // Anything else in it (a var(), rgb(), a keyword) is a colour not read.
    const colours = gradient[1]
      .split(",")
      .slice(/deg|to |turn/.test(gradient[1].split(",")[0]) ? 1 : 0);
    return stops.length >= 2 && stops.length === colours.length
      ? stops
      : "unknown";
  }

  const solid = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})([0-9a-fA-F]{2})?$/.exec(
    value.trim(),
  );
  if (!solid) return "unknown";

  const alpha =
    solid[2] && solid[1].length === 6 ? parseInt(solid[2], 16) / 255 : 1;
  return [{ rgb: hex(solid[1]), alpha, token: false }];
}

/** What an element paints behind its content, as the stops of one layer. */
function surfaceOf(
  element: Element,
  theme: Theme,
  sources: ContrastSources,
): Surface {
  const { tokens } = sources;
  const names = utilities(element, theme);
  const last = (prefix: string) =>
    names
      .filter((name) => name.startsWith(`${prefix}-`))
      .map((name) => ({
        name,
        paint: colourOf(name.slice(prefix.length + 1), theme, tokens),
      }))
      .filter(
        (stop): stop is { name: string; paint: Paint } => stop.paint !== null,
      )
      .pop();

  if (names.some((name) => name.startsWith("bg-gradient-to-"))) {
    const stops = [last("from"), last("via"), last("to")].filter(
      (stop): stop is { name: string; paint: Paint } => !!stop,
    );
    const paints = stops.map((stop) => stop.paint);
    if (paints.length === 1) paints.push({ ...paints[0], alpha: 0 });
    if (paints.length >= 2)
      return {
        stops: paints,
        source: stops.map((stop) => stop.name).join(" "),
      };
  }

  const style = element.getAttribute("style") ?? "";
  const inline = /background(?:-color|-image)?:\s*([^;]+)/.exec(style);
  if (inline && !/radial-gradient|url\(/.test(inline[1])) {
    const stops = backgroundStops(inline[1]);
    return stops === "unknown"
      ? "unknown"
      : { stops, source: `style="${inline[0]}"` };
  }

  const backgrounds = names.filter(
    (name) => name.startsWith("bg-") && !NOT_A_COLOUR.test(name),
  );
  if (backgrounds.length > 0) {
    const name = backgrounds[backgrounds.length - 1];
    // `bg-destructive` paints --destructive-surface (tailwind.config.ts
    // backgroundColor), not the text red of `text-destructive`.
    const colour = name
      .slice(3)
      .replace(/^destructive(?=$|\/)/, "destructive-surface");
    const paint = colourOf(colour, theme, tokens);
    return paint ? { stops: [paint], source: name } : "unknown";
  }

  for (const name of names) {
    const module = MODULE_CLASS.exec(name)?.[1];
    const background = module
      ? sources.moduleBackgrounds?.get(module)
      : undefined;
    if (!background) continue;

    const stops = backgroundStops(background);
    return stops === "unknown" ? "unknown" : { stops, source: `.${module}` };
  }

  return null;
}

/**
 * Colour and alpha `t` (0..1) of the way along evenly spaced stops,
 * interpolated with premultiplied alpha as browsers do: a 3% pink stop next
 * to an opaque background tints it by 3%, not by half.
 */
function paintAt(stops: Paint[], t: number): Paint {
  if (stops.length === 1) return stops[0];

  const position = t * (stops.length - 1);
  const index = Math.min(Math.floor(position), stops.length - 2);
  const local = position - index;
  const [from, to] = [stops[index], stops[index + 1]];
  const alpha = from.alpha + (to.alpha - from.alpha) * local;

  const rgb = from.rgb.map((value, channel) => {
    if (alpha === 0) return value;
    const premultiplied =
      value * from.alpha * (1 - local) + to.rgb[channel] * to.alpha * local;
    return Math.round(premultiplied / alpha);
  }) as Rgb;

  return { rgb, alpha, token: from.token && to.token };
}

const SIZE = /^text-(xs|sm|base|lg|xl|[2-9]xl)$/;
const BOLD = /^font-(?:semibold|bold|extrabold|black)$/;
const MEDIA = "img, picture, video, canvas";

/** Laid over a photo: `child` is positioned and `parent` holds media outside it. */
function overMedia(child: Element, parent: Element): boolean {
  if (
    !/(?:^|\s)(?:absolute|fixed)(?:\s|$)/.test(
      child.getAttribute("class") ?? "",
    )
  )
    return false;

  return Array.from(parent.querySelectorAll(MEDIA)).some(
    (media) => !child.contains(media),
  );
}

/**
 * Every visible text node's lowest contrast in each theme. `measured`
 * counts the measurements taken, so a caller can tell an empty failure
 * list from a walker that read nothing.
 */
export function measureRenderedContrast(
  document: Document,
  sources: ContrastSources,
): { findings: ContrastFinding[]; measured: number } {
  const { tokens } = sources;
  const findings: ContrastFinding[] = [];
  const walker = document.createTreeWalker(document.body, 4 /* SHOW_TEXT */);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    if (!text || !parent) continue;
    // Drawn with fill, or not drawn at all.
    if (parent.closest("svg, .sr-only, style, script")) continue;

    for (const theme of THEMES) {
      let colour: { name: string; paint: Paint } | null = null;
      let size: string | null = null;
      let bold = false;

      for (
        let element: Element | null = parent;
        element;
        element = element.parentElement
      ) {
        const names = utilities(element, theme);
        // An inline colour beats the classes, and is the same in both themes.
        const inline =
          /(?:^|;)\s*color:\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.exec(
            element.getAttribute("style") ?? "",
          );

        colour ??=
          (inline
            ? {
                name: `style="color:#${inline[1]}"`,
                paint: { rgb: hex(inline[1]), alpha: 1, token: false },
              }
            : null) ??
          names
            .filter((name) => name.startsWith("text-"))
            .map((name) => ({
              name,
              paint: colourOf(name.slice(5), theme, tokens),
            }))
            .filter(
              (found): found is { name: string; paint: Paint } =>
                found.paint !== null,
            )
            .pop() ??
          null;
        size ??=
          names
            .map((name) => SIZE.exec(name)?.[1])
            .filter(Boolean)
            .pop() ?? null;
        bold ||= names.some((name) => BOLD.test(name));
      }

      // Gradient text (bg-clip-text) or an inherited colour nothing names.
      if (!colour || colour.paint.alpha === 0) continue;

      // The chain from the text up to the root: what each element paints and
      // how much it is faded. Surfaces above the first opaque one are hidden,
      // unless something up there fades everything below it.
      const chain: {
        surface: { stops: Paint[]; source: string } | null;
        opacity: number;
      }[] = [];
      let unknown = false;
      let invisible = false;
      let opaque = false;

      for (
        let element: Element | null = parent, child: Element | null = null;
        element;
        child = element, element = element.parentElement
      ) {
        const faded = utilities(element, theme)
          .map((name) => /^opacity-(\d+)$/.exec(name)?.[1])
          .filter(Boolean)
          .pop();
        const opacity = faded ? Number(faded) / 100 : 1;
        if (opacity === 0) invisible = true;

        if (!opaque && child && overMedia(child, element)) unknown = true;

        const surface = surfaceOf(element, theme, sources);
        if (surface === "unknown") {
          if (!opaque) unknown = true;
          chain.push({ surface: null, opacity });
          continue;
        }

        chain.push({ surface, opacity });
        if (surface && surface.stops.every((stop) => stop.alpha >= 1))
          opaque = true;
      }

      if (unknown || invisible) continue;

      const layers = chain.flatMap(({ surface }) => (surface ? [surface] : []));
      const firstOpaque = layers.findIndex((layer) =>
        layer.stops.every((stop) => stop.alpha >= 1),
      );
      const visible =
        firstOpaque < 0 ? layers : layers.slice(0, firstOpaque + 1);

      // A theme colour on theme surfaces all the way down: the tokens' job.
      if (
        colour.paint.token &&
        visible.every((layer) => layer.stops.every((stop) => stop.token))
      )
        continue;

      const page = tokens[theme].get("background")!;
      const ink = colour.paint;
      let ratio = Infinity;

      for (let step = 0; step <= 20; step += 1) {
        const t = step / 20;

        // From the root down: each element paints its surface over what is
        // behind it, and its opacity fades the element and everything in it
        // (text included) back towards that.
        const paint = (index: number, behind: Rgb): [Rgb, Rgb] => {
          const { surface, opacity } = chain[index];
          let inside = behind;
          if (surface) {
            const stop = paintAt(surface.stops, t);
            inside = over(stop.rgb, stop.alpha, behind);
          }

          const [fore, back]: [Rgb, Rgb] =
            index === 0
              ? [over(ink.rgb, ink.alpha, inside), inside]
              : paint(index - 1, inside);

          return opacity === 1
            ? [fore, back]
            : [over(fore, opacity, behind), over(back, opacity, behind)];
        };

        const [fore, back] = paint(chain.length - 1, page);
        ratio = Math.min(ratio, contrast(fore, back));
      }

      const large =
        (size !== null && /^[2-9]xl$/.test(size)) || (size === "xl" && bold);
      findings.push({
        text: text.slice(0, 48),
        theme,
        ratio: Math.round(ratio * 100) / 100,
        floor: large ? 3 : 4.5,
        where: [
          colour.name,
          ...visible.map((layer) => layer.source),
          firstOpaque < 0 ? "page" : "",
        ]
          .filter(Boolean)
          .join(" @ "),
      });
    }
  }

  return { findings, measured: findings.length };
}
