"use client";

import { ErrorSurface } from "@/components/shared/error-surface";

import "./globals.css";

/**
 * The last boundary: the root layout itself threw.
 *
 * It replaces the whole document, which is why it has to render `<html>` and
 * `<body>` of its own — the layout that would normally provide them is the
 * thing that failed. That also means no theme provider and no navigation
 * chrome: whatever is on this page has to stand alone.
 *
 * It fires almost never, and when it does the alternative is a completely
 * blank white page with no explanation, which is the worst thing a product
 * can show somebody who was in the middle of working.
 */
const GlobalError = ({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element => {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ErrorSurface error={error} reset={reset} standalone />
      </body>
    </html>
  );
};

export default GlobalError;
