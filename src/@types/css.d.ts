// Next only declares the CSS Modules patterns (`*.module.css` and friends).
// Global stylesheets imported for their side effect - `./globals.css`,
// `leaflet/dist/leaflet.css` - have no declaration, so TypeScript reports
// TS2307 for them under `noUncheckedSideEffectImports`.
//
// This file must stay free of top-level imports/exports: an ambient wildcard
// module declaration only applies from a global script file.
declare module "*.css";
