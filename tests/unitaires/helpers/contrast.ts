/**
 * WCAG 2.x contrast maths for tests that measure colours taken from markup
 * (class names, inline gradients) rather than from the theme tokens.
 */
export type Rgb = [number, number, number];

export const WHITE: Rgb = [255, 255, 255];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace(/^#/, "");

  return [0, 2, 4].map((offset) =>
    parseInt(value.slice(offset, offset + 2), 16),
  ) as Rgb;
}

/** `H S% L%` to sRGB, the conversion a browser does for `hsl()`. */
export function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  const saturation = s / 100;
  const lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);

  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;
    return lightness - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };

  return [channel(0), channel(8), channel(4)].map((value) =>
    Math.round(value * 255),
  ) as Rgb;
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(first: Rgb, second: Rgb): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return (lighter + 0.05) / (darker + 0.05);
}

/** `top` painted at `alpha` over `bottom`. */
export function over(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return top.map((value, index) =>
    Math.round(value * alpha + bottom[index] * (1 - alpha)),
  ) as Rgb;
}
