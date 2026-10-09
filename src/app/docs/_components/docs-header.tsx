"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ExternalLink, Menu, X } from "lucide-react";

import { DocumentLink } from "@/components/shared/document-link";
import { ThemeSegmented, ThemeToggle } from "@/components/shared/theme-toggle";
import { SiteLogo } from "@/components/site/site-logo";

import { PLATFORM_ENTRY } from "@/lib/public-pages";
import { cn } from "@/lib/utils";

import {
  API_DOCS_PATH,
  DOCS_CONSOLE_PATH,
  DOCS_DESKTOP_QUERY,
  DOCS_REFERENCE_PATH,
} from "../_lib/navigation";

import { DocsSidebarNav } from "./docs-sidebar-nav";

/**
 * The portal's top bar, built like the site header (site-header): a floating
 * bar whose glass fades in with the first 40px of scroll.
 *
 * From 960px: logo, "Documentação da API", Guias · Referência · Console, the
 * theme icon and "Acessar plataforma". Below: logo, the theme icon (from
 * 640px) and a menu button whose panel holds every section of the docs (the
 * sidebar is hidden there), the "Tema" control and the platform entry, with
 * focus kept inside, Esc to close and the page behind locked.
 */

const TOP_LINKS = [
  { href: API_DOCS_PATH, label: "Guias" },
  { href: DOCS_REFERENCE_PATH, label: "Referência" },
] as const;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const LINK_BASE =
  "rounded-[10px] px-3 py-2 outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40";

/** Which top link is current: the reference, or any guide. */
function isTopLinkCurrent(href: string, pathname: string | null): boolean {
  const onReference = (pathname ?? "").startsWith(DOCS_REFERENCE_PATH);

  return href === DOCS_REFERENCE_PATH ? onReference : !onReference;
}

const DocsHeader = (): JSX.Element => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Glass opacity follows the first 40px of scroll, one write per frame;
  // fully opaque while the menu is open.
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const glass = glassRef.current;
      if (!glass) return;
      glass.style.opacity = menuOpen
        ? "1"
        : String(Math.min(1, window.scrollY / 40));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [menuOpen]);

  // A navigation closes the menu.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The menu exists below 960px only; growing the window closes it.
  useEffect(() => {
    if (!menuOpen) return;

    const query = window.matchMedia(DOCS_DESKTOP_QUERY);
    const onChange = () => {
      if (query.matches) setMenuOpen(false);
    };

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, [menuOpen]);

  // While open the page behind does not scroll, and focus starts on the
  // current page (the list is long on a phone: it scrolls into view), or on
  // the first link.
  useEffect(() => {
    if (!menuOpen) return;

    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";

    const panel = menuPanelRef.current;
    const start =
      panel?.querySelector<HTMLElement>('[aria-current="page"]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    start?.focus();

    return () => {
      root.style.overflow = previous;
    };
  }, [menuOpen]);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  /** Esc closes; Tab cycles inside the header while the menu is open. */
  function onHeaderKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      if (menuOpen) closeMenu(true);
      return;
    }

    if (event.key !== "Tab" || !menuOpen || !headerRef.current) return;

    const focusables = Array.from(
      headerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter(
      (element) =>
        element.offsetParent !== null || element === document.activeElement,
    );

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      {/* Click-catcher behind the open menu. */}
      {menuOpen ? (
        <div
          aria-hidden
          data-docs-menu-backdrop=""
          onClick={() => closeMenu(false)}
          className="fixed inset-0 z-40 animate-tp-fade bg-[rgba(9,9,12,.18)] [animation-duration:.25s] min-[960px]:hidden"
        />
      ) : null}

      <header
        ref={headerRef}
        onKeyDown={onHeaderKeyDown}
        className="sticky top-0 z-50 px-[clamp(12px,3vw,24px)] pt-3 font-site text-site-ink"
      >
        <div className="relative mx-auto flex h-[58px] max-w-[90rem] items-center justify-between gap-3 rounded-[18px] pl-[18px] pr-2.5">
          <div
            ref={glassRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px] border border-site-line bg-site-glass opacity-0 shadow-site-bar backdrop-blur-[18px] backdrop-saturate-[1.6] transition-opacity duration-300 ease-out"
          />

          <div className="relative flex min-w-0 items-center gap-3">
            <SiteLogo className="shrink-0" />
            <span aria-hidden className="h-5 w-px shrink-0 bg-site-line2" />
            <Link
              href={API_DOCS_PATH}
              className="min-w-0 truncate rounded-[8px] text-sm font-medium text-site-muted outline-none transition-colors duration-200 hover:text-site-ink focus-visible:ring-2 focus-visible:ring-site-ink/40"
            >
              <span className="min-[1100px]:hidden">API</span>
              <span className="hidden min-[1100px]:inline">
                Documentação da API
              </span>
            </Link>
          </div>

          {/* Desktop navigation (960px and up). */}
          <nav
            aria-label="Seções da documentação"
            className="relative mr-auto hidden items-center gap-0.5 pl-3 text-sm font-medium min-[960px]:flex"
          >
            {TOP_LINKS.map((link) => {
              const current = isTopLinkCurrent(link.href, pathname);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    LINK_BASE,
                    current && "bg-site-soft2 hover:bg-site-soft2",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {/* A plain anchor: the console redirects to the API's origin. */}
            <a
              href={DOCS_CONSOLE_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                LINK_BASE,
                "inline-flex items-center gap-1.5 whitespace-nowrap",
              )}
            >
              Console interativo
              <ExternalLink className="size-3.5 text-site-muted" aria-hidden />
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </nav>

          <div className="relative flex shrink-0 items-center gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex" />
            <DocumentLink
              href={PLATFORM_ENTRY.href}
              className="hidden items-center whitespace-nowrap rounded-[12px] bg-site-ink px-4 py-2.5 text-sm font-medium text-site-bg outline-none transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-site-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg motion-reduce:hover:translate-y-0 min-[960px]:inline-flex"
            >
              {PLATFORM_ENTRY.label}
            </DocumentLink>
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={
                menuOpen
                  ? "Fechar menu da documentação"
                  : "Abrir menu da documentação"
              }
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
              className="relative flex size-10 items-center justify-center rounded-[11px] bg-site-soft outline-none transition-colors duration-200 hover:bg-site-soft2 focus-visible:ring-2 focus-visible:ring-site-ink/40 min-[960px]:hidden"
            >
              <Menu
                aria-hidden
                className={cn(
                  "size-[18px] transition-[transform,opacity] duration-300 ease-site",
                  menuOpen ? "rotate-90 scale-50 opacity-0" : "opacity-100",
                )}
              />
              <X
                aria-hidden
                className={cn(
                  "absolute size-[18px] transition-[transform,opacity] duration-300 ease-site",
                  menuOpen ? "opacity-100" : "-rotate-90 scale-50 opacity-0",
                )}
              />
            </button>
          </div>
        </div>

        {/* The menu (below 960px): every section, the theme, the platform. */}
        {menuOpen ? (
          <div
            ref={menuPanelRef}
            id={menuId}
            className="mx-auto mt-2 flex max-h-[calc(100dvh-90px)] max-w-[90rem] animate-[tpNavIn_.3s_cubic-bezier(.22,1,.36,1)_both] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-[18px] border border-site-line bg-site-surface p-2.5 shadow-site-pop min-[960px]:hidden"
          >
            <DocsSidebarNav
              density="touch"
              onNavigate={() => closeMenu(false)}
            />

            <div aria-hidden className="mx-3 my-1.5 h-px bg-site-line" />
            <ThemeSegmented className="px-3 py-1.5" />

            <DocumentLink
              href={PLATFORM_ENTRY.href}
              className="mt-1.5 flex min-h-[48px] items-center justify-center rounded-[12px] bg-site-ink p-3 text-center font-medium text-site-bg outline-none focus-visible:ring-2 focus-visible:ring-site-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface"
            >
              {PLATFORM_ENTRY.label}
            </DocumentLink>
          </div>
        ) : null}
      </header>
    </>
  );
};

export { DocsHeader, isTopLinkCurrent };
