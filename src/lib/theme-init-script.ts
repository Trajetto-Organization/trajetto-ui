/**
 * The script that puts the saved theme on <html> before the first paint.
 *
 * next-themes inlines its own, built from `Function.prototype.toString()` of
 * its bundled code: the text changes with every minifier pass and every
 * upgrade, so no Content-Security-Policy hash can name it, and the root
 * layout is prerendered for the public pages, so it cannot carry a
 * per-request nonce either. Under the enforced policy that script was
 * blocked on every page that renders with a nonce.
 *
 * This one is a constant string, so its hash is a constant too
 * (THEME_INIT_SCRIPT_HASH, checked by tests/unitaires/theme-init-script.test.ts)
 * and the strict policy allows exactly this text and nothing else. It does
 * what next-themes' script does for this app's settings (attribute "class",
 * storage key "theme", default "system", color-scheme on).
 */
export const THEME_STORAGE_KEY = "theme";

export const THEME_INIT_SCRIPT =
  '(function(){try{var d=document.documentElement,t=localStorage.getItem("theme")||"system";if(t==="system")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t!=="light"&&t!=="dark")return;d.classList.remove("light","dark");d.classList.add(t);d.style.colorScheme=t}catch(e){}})()';

/** CSP source for THEME_INIT_SCRIPT: base64 SHA-256 of its exact text. */
export const THEME_INIT_SCRIPT_HASH =
  "'sha256-VCMNvmh/sXdMDVO2ZKGch3NlZy6h+ZSEGu+qnN1PkZ0='";
