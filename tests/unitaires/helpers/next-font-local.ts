/**
 * Stand-in for next/font/local under Vitest. The real module is a build-time
 * transform (Next replaces each call with the font's CSS, read from the file
 * in src/app/fonts); called at run time it is not a function. Returns the
 * shape Next gives.
 */
type FontOptions = { src: string; variable?: string };

export default function localFont(options: FontOptions) {
  const family = options.src.replace(/^.*\//, "").replace(/\.\w+$/, "");

  return {
    className: `font-${family}`,
    variable: options.variable?.replace(/^--/, "font-var-") ?? "",
    style: { fontFamily: family },
  };
}
