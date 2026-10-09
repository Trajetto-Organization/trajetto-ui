/**
 * Whether a click on a link leaves the page in a way that would lose an
 * unsaved stop order (decision 14.7, §5.3), pure.
 *
 * Only a plain left click on a same-origin link that goes somewhere else is
 * guarded: a new tab (modifier, middle click, target), a download, a hash on
 * this same page or another site keep the page and the order where they are.
 */
interface LinkClick {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

interface LinkTarget {
  href: string;
  target: string;
  download: boolean;
}

function leavesPage(
  click: LinkClick,
  link: LinkTarget,
  current: { origin: string; pathname: string; search: string },
): boolean {
  if (click.defaultPrevented) return false;
  if (click.button !== 0) return false;
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey)
    return false;
  if (link.download) return false;
  if (link.target && link.target !== "_self") return false;

  let next: URL;

  try {
    next = new URL(link.href, current.origin);
  } catch {
    return false;
  }

  if (next.origin !== current.origin) return false;

  // Same path and query: at most a hash jump on this page.
  return next.pathname !== current.pathname || next.search !== current.search;
}

const UNSAVED_ORDER_MESSAGE =
  "A nova ordem das paradas não foi salva. Sair desta página e descartá-la?";

export { UNSAVED_ORDER_MESSAGE, leavesPage };
export type { LinkClick, LinkTarget };
