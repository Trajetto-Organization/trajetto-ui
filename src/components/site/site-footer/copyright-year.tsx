"use client";

import { useEffect, useState } from "react";

interface CopyrightYearProps {
  /** The year where the page was rendered: the first paint, so hydration matches. */
  initialYear: number;
}

/**
 * The © year, kept current on prerendered pages.
 *
 * The footer computed `new Date().getFullYear()` while rendering, and the
 * public pages render at build time: the build's year stayed on every page
 * until the next deploy. The server's year is only the first paint now; the
 * browser's replaces it after mount.
 */
const CopyrightYear = ({ initialYear }: CopyrightYearProps): JSX.Element => {
  const [year, setYear] = useState(initialYear);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <span data-copyright-year="">{year}</span>;
};

export { CopyrightYear };
