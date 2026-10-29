import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Server-renders an element to HTML for assertions.
 *
 * Vitest compiles TSX with the classic runtime (`React.createElement`) while
 * Next uses the automatic one, so components that never import React need it
 * in scope here. Setting `esbuild.jsx = "automatic"` in vitest.config.ts
 * would make this line unnecessary.
 */
(globalThis as { React?: typeof React }).React ??= React;

export function renderHtml(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

export { React };
