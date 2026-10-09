/**
 * Stand-in for next/font/google under Vitest. The real module is a build-time
 * transform (Next replaces each call with the downloaded font's CSS); called
 * at run time it is not a function. Each loader returns the shape Next gives.
 */
type FontOptions = { variable?: string };

function loader(family: string) {
  return (options: FontOptions = {}) => ({
    className: `font-${family.toLowerCase()}`,
    variable: options.variable?.replace(/^--/, "font-var-") ?? "",
    style: { fontFamily: family },
  });
}

export const Inter = loader("Inter");
export const Inter_Tight = loader("Inter_Tight");
export const JetBrains_Mono = loader("JetBrains_Mono");
