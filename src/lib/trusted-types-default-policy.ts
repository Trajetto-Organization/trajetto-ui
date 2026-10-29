/**
 * The Trusted Types "default" policy, created before hydration (step 2 of
 * Trusted Types, after the Report-Only observation in
 * src/lib/content-security-policy.ts).
 *
 * react-turnstile 1.1.4 injects the captcha's api.js with
 * `script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?…"`, a
 * raw string, so every visit to /login reported a TrustedScriptURL violation
 * (DevTools Issues, Lighthouse's "inspector-issues"). The library cannot be
 * changed; a sink in third-party code is what the default policy is for, and
 * the CSP's `trusted-types` list already reserves its name.
 *
 * Narrow on purpose: only createScriptURL, and it passes exactly the URL
 * react-turnstile builds: that origin, that path and only its two parameters
 * (onload=cf__reactTurnstileOnLoad, render=explicit), since api.js calls the
 * global its `onload` names. Anything else gets null,
 * so the browser still reports it, and there is no createHTML or
 * createScript: those sinks keep reporting too. It steps aside where the
 * browser has no Trusted Types or a default policy already exists.
 *
 * A constant string for the same reason as THEME_INIT_SCRIPT: the strict
 * policy allows exactly this text by its hash
 * (TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT_HASH, checked by
 * tests/unitaires/trusted-types-default-policy.test.ts), and the prerendered
 * pages by their 'unsafe-inline'.
 */
export const TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT =
  '(function(){try{var t=window.trustedTypes;if(!t||t.defaultPolicy)return;t.createPolicy("default",{createScriptURL:function(s){try{var u=new URL(s),q=u.searchParams,n=0;q.forEach(function(){n++});if(u.origin==="https://challenges.cloudflare.com"&&u.pathname==="/turnstile/v0/api.js"&&!u.hash&&n===2&&q.get("onload")==="cf__reactTurnstileOnLoad"&&q.get("render")==="explicit")return s}catch(e){}return null}})}catch(e){}})()';

/** CSP source for TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT: base64 SHA-256 of its exact text. */
export const TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT_HASH =
  "'sha256-1CfF09OttCu4lBmKEE98b5YtqSWkS2JaH8wi9us7Ehk='";
