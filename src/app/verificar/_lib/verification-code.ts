import { isPublicToken } from "@/lib/public-token";

/**
 * What the person typed or pasted on /verificar, as a verification token.
 *
 * The PDF prints the whole address beside the QR "for whoever types it", and
 * people type it in pieces, with spaces, in capitals, or paste the whole link
 * (copied from the PDF, with a line break where the address wraps).
 * Anything that is not exactly one 64-character hex token is refused here,
 * before it becomes a path segment (same rule as the [token] page).
 */
const LINK_PATH = /\/verificar\//i;
const TOKEN_LENGTH = 64;
const HEX = /^[0-9a-f]$/i;

function parseVerificationCode(
  input: string | null | undefined,
): string | null {
  if (!input) return null;

  // Blanks go first: a copy from the PDF carries a line break where the
  // printed address wraps (right after "verificar/", or even inside the
  // token), and a hand-typed code has spaces. Each character remembers
  // whether a blank came before it, which is what ends the code below.
  const chars: string[] = [];
  const afterBlank: boolean[] = [];

  let blank = false;

  for (const char of input) {
    if (/\s/.test(char)) {
      blank = true;
      continue;
    }

    chars.push(char);
    afterBlank.push(blank);
    blank = false;
  }

  const compact = chars.join("");
  const link = LINK_PATH.exec(compact);

  // A bare code is the whole input.
  if (!link) {
    const candidate = compact.toLowerCase();

    return isPublicToken(candidate) ? candidate : null;
  }

  const start = link.index + link[0].length;
  const end = start + TOKEN_LENGTH;
  const token = compact.slice(start, end).toLowerCase();

  if (!isPublicToken(token)) return null;

  // A 65th hex character glued to the code makes a longer code, a typo, and
  // is refused. After a blank or a line break it is the next line of the
  // paper: the notice under the address starts with "Este", and a selection
  // that took it along was refused as a 65-character code.
  const next = compact[end];

  if (next !== undefined && HEX.test(next) && !afterBlank[end]) return null;

  return token;
}

type VerificationTarget =
  | { kind: "empty" }
  | { kind: "invalid"; input: string }
  | { kind: "redirect"; path: string };

/** The page's decision for the `codigo` query parameter. */
function resolveVerificationTarget(
  codigo: string | string[] | undefined,
): VerificationTarget {
  const input = Array.isArray(codigo) ? codigo[0] : codigo;

  if (!input || !input.trim()) return { kind: "empty" };

  const token = parseVerificationCode(input);

  return token
    ? { kind: "redirect", path: `/verificar/${token}` }
    : { kind: "invalid", input: input.trim().slice(0, 200) };
}

export { parseVerificationCode, resolveVerificationTarget };
export type { VerificationTarget };
