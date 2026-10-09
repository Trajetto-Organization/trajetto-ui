"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Package, Smartphone, Truck, X } from "lucide-react";

import { DocumentLink } from "@/components/shared/document-link";
import { ThemeSegmented, ThemeToggle } from "@/components/shared/theme-toggle";
import {
  PLATFORM_ENTRY,
  PUBLIC_NAV_LINKS,
  PUBLIC_PRODUCT_LINKS,
} from "@/lib/public-pages";
import { cn } from "@/lib/utils";

import { SiteLogo } from "../site-logo";

/**
 * The public header (design: Trajetto Nav).
 *
 * A floating bar whose glass background fades in over the first 40px of
 * scroll. From 960px: "Produtos" dropdown (hover, click or keyboard), plain
 * links, theme icon, "Acessar plataforma" and the quote button. Below: logo,
 * quote button and a menu panel holding every link and the theme control
 * ("Tema: Claro · Escuro · Sistema"), with focus kept inside while open.
 *
 * Reads no request data (decision 10.4): the active entry comes from the
 * pathname on the client, so the prerendered pages stay static.
 */

type SiteSection =
  | ""
  | "frotas"
  | "entregas"
  | "app"
  | "blog"
  | "sobre"
  | "contato"
  | "orcamento"
  | "legal";

const PRODUCT_SECTIONS: readonly SiteSection[] = ["frotas", "entregas", "app"];

function sectionOf(pathname: string | null): SiteSection {
  const path = pathname ?? "/";

  if (path.startsWith("/gestao-de-frotas")) return "frotas";
  if (path.startsWith("/gestao-de-entregas")) return "entregas";
  if (path.startsWith("/app-do-motorista")) return "app";
  if (path.startsWith("/blog")) return "blog";
  if (path.startsWith("/sobre")) return "sobre";
  if (path.startsWith("/contato")) return "contato";
  if (path.startsWith("/orcamento")) return "orcamento";
  if (path.startsWith("/legal")) return "legal";

  return "";
}

/** Section of each nav href, to mark the current page. */
const SECTION_OF_HREF: Record<string, SiteSection> = {
  "/gestao-de-frotas": "frotas",
  "/gestao-de-entregas": "entregas",
  "/app-do-motorista": "app",
  "/blog": "blog",
  "/sobre": "sobre",
  "/contato": "contato",
};

/** Icon chip of each product in the dropdown (design colors). */
const PRODUCT_STYLE: Record<string, { icon: typeof Truck; chip: string }> = {
  "/gestao-de-frotas": {
    icon: Truck,
    chip: "bg-site-violet-soft text-site-violet",
  },
  "/gestao-de-entregas": {
    icon: Package,
    chip: "bg-site-pink-soft text-site-pink",
  },
  "/app-do-motorista": {
    icon: Smartphone,
    chip: "bg-site-soft2 text-site-ink",
  },
};

const QUOTE_HREF = "/orcamento";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SiteHeaderProps {
  /** Overrides the section read from the pathname. */
  active?: SiteSection;
}

const SiteHeader = ({ active }: SiteHeaderProps): JSX.Element => {
  const pathname = usePathname();
  const current = active ?? sectionOf(pathname);

  const [productsOpen, setProductsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const productsButtonRef = useRef<HTMLButtonElement>(null);
  const hoverOpenedAt = useRef(0);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const productsMenuId = useId();
  const mobileMenuId = useId();

  // Glass background: opacity follows the first 40px of scroll, one write
  // per frame at most. Fully opaque while the phone menu is open.
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

  // A navigation closes both menus.
  useEffect(() => {
    setMenuOpen(false);
    setProductsOpen(false);
  }, [pathname]);

  // The phone menu exists below 960px only; growing the window closes it.
  useEffect(() => {
    if (!menuOpen) return;

    const query = window.matchMedia("(min-width: 960px)");
    const onChange = () => {
      if (query.matches) setMenuOpen(false);
    };

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, [menuOpen]);

  // While the phone menu is open the page behind does not scroll, and focus
  // starts on its first link.
  useEffect(() => {
    if (!menuOpen) return;

    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    menuPanelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      root.style.overflow = previous;
    };
  }, [menuOpen]);

  // Click outside the dropdown closes it (touch screens have no mouseleave).
  useEffect(() => {
    if (!productsOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!productsRef.current?.contains(event.target as Node))
        setProductsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [productsOpen]);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  /** Esc closes; Tab cycles inside the header while the phone menu is open. */
  function onHeaderKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      if (productsOpen) {
        setProductsOpen(false);
        productsButtonRef.current?.focus();
      }
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

  function onProductsKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      productsRef.current?.querySelectorAll<HTMLElement>(
        "[data-product-item]",
      ) ?? [],
    );

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!productsOpen) {
        setProductsOpen(true);
        // The list renders on the next frame.
        requestAnimationFrame(() =>
          productsRef.current
            ?.querySelector<HTMLElement>("[data-product-item]")
            ?.focus(),
        );
        return;
      }

      const at = items.indexOf(document.activeElement as HTMLElement);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = at < 0 ? 0 : (at + step + items.length) % items.length;
      items[next]?.focus();
    }
  }

  const productsActive = PRODUCT_SECTIONS.includes(current);

  const linkBase =
    "rounded-[10px] px-3 py-2 outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40";

  return (
    <>
      {/* Click-catcher behind the open phone menu. */}
      {menuOpen ? (
        <div
          aria-hidden
          onClick={() => closeMenu(false)}
          className="fixed inset-0 z-40 animate-tp-fade bg-[rgba(9,9,12,.18)] [animation-duration:.25s] min-[960px]:hidden"
        />
      ) : null}

      <header
        ref={headerRef}
        onKeyDown={onHeaderKeyDown}
        className="fixed inset-x-0 top-0 z-50 px-[clamp(12px,3vw,24px)] pt-3 font-site text-site-ink"
      >
        <div className="relative mx-auto flex h-[58px] max-w-[1200px] items-center justify-between gap-4 rounded-[18px] pl-[18px] pr-2.5">
          <div
            ref={glassRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px] border border-site-line bg-site-glass opacity-0 shadow-site-bar backdrop-blur-[18px] backdrop-saturate-[1.6] transition-opacity duration-300 ease-out"
          />

          <SiteLogo />

          {/* Desktop navigation (960px and up). */}
          <nav
            aria-label="Principal"
            className="relative hidden items-center gap-0.5 text-sm font-medium min-[960px]:flex"
          >
            <div
              ref={productsRef}
              className="relative"
              onMouseEnter={() => {
                hoverOpenedAt.current = Date.now();
                setProductsOpen(true);
              }}
              onMouseLeave={() => setProductsOpen(false)}
              onKeyDown={onProductsKeyDown}
              onBlur={(event) => {
                if (
                  !productsRef.current?.contains(event.relatedTarget as Node)
                ) {
                  setProductsOpen(false);
                }
              }}
            >
              <button
                ref={productsButtonRef}
                type="button"
                aria-expanded={productsOpen}
                aria-controls={productsMenuId}
                onClick={() => {
                  // A mouse that just opened the menu by hovering would close it
                  // again with the click that usually follows; keep it open.
                  if (Date.now() - hoverOpenedAt.current < 600) return;
                  setProductsOpen((open) => !open);
                }}
                className={cn(
                  "flex items-center gap-1",
                  linkBase,
                  productsActive && "bg-site-soft2 hover:bg-site-soft2",
                )}
              >
                Produtos
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-3.5 transition-transform [transition-duration:250ms] ease-out",
                    productsOpen && "rotate-180",
                  )}
                />
              </button>

              {productsOpen ? (
                <div
                  id={productsMenuId}
                  className="absolute left-[-12px] top-full pt-2.5"
                >
                  <ul className="w-[340px] animate-tp-nav-in rounded-[18px] border border-site-line bg-site-surface p-2 shadow-site-pop">
                    {PUBLIC_PRODUCT_LINKS.map((link) => {
                      const style =
                        PRODUCT_STYLE[link.href] ??
                        PRODUCT_STYLE["/app-do-motorista"];
                      const Icon = style.icon;
                      const isCurrent = SECTION_OF_HREF[link.href] === current;

                      return (
                        <li key={link.href}>
                          <DocumentLink
                            href={link.href}
                            data-product-item=""
                            aria-current={isCurrent ? "page" : undefined}
                            onClick={() => setProductsOpen(false)}
                            className={cn(
                              "flex gap-3 rounded-[12px] p-3 outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/30",
                              isCurrent && "bg-site-soft",
                            )}
                          >
                            <span
                              aria-hidden
                              className={cn(
                                "flex size-[38px] shrink-0 items-center justify-center rounded-[11px]",
                                style.chip,
                              )}
                            >
                              <Icon className="size-[18px]" />
                            </span>
                            <span>
                              <span className="block font-semibold">
                                {link.label}
                              </span>
                              {link.summary ? (
                                <span className="mt-0.5 block text-[12.5px] font-normal leading-[1.45] text-site-muted">
                                  {link.summary}
                                </span>
                              ) : null}
                            </span>
                          </DocumentLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>

            {PUBLIC_NAV_LINKS.map((link) => {
              const isCurrent = SECTION_OF_HREF[link.href] === current;

              return (
                <DocumentLink
                  key={link.href}
                  href={link.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={cn(
                    linkBase,
                    isCurrent && "bg-site-soft2 hover:bg-site-soft2",
                  )}
                >
                  {link.label}
                </DocumentLink>
              );
            })}
          </nav>

          <div className="relative flex items-center gap-1.5">
            <ThemeToggle className="hidden sm:inline-flex" />
            <DocumentLink
              href={PLATFORM_ENTRY.href}
              className="hidden whitespace-nowrap rounded-[11px] px-3.5 py-[9px] text-sm font-medium outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40 min-[960px]:inline-flex"
            >
              {PLATFORM_ENTRY.label}
            </DocumentLink>
            <DocumentLink
              href={QUOTE_HREF}
              aria-current={current === "orcamento" ? "page" : undefined}
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-[12px] bg-site-ink px-3.5 py-2.5 text-sm font-medium text-site-bg outline-none transition-transform duration-200 ease-out hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-site-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-site-bg motion-reduce:hover:translate-y-0 min-[380px]:inline-flex sm:px-4"
            >
              Solicitar orçamento
            </DocumentLink>
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls={mobileMenuId}
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

        {/* Phone menu (below 960px). */}
        {menuOpen ? (
          <div
            ref={menuPanelRef}
            id={mobileMenuId}
            className="mx-auto mt-2 flex max-h-[calc(100dvh-90px)] max-w-[1200px] animate-[tpNavIn_.3s_cubic-bezier(.22,1,.36,1)_both] flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-[18px] border border-site-line bg-site-surface p-2.5 shadow-site-pop min-[960px]:hidden"
          >
            <nav aria-label="Menu" className="flex flex-col gap-0.5">
              <p className="mx-3 my-1.5 font-site-mono text-[11px] font-medium tracking-[.12em] text-site-muted">
                PRODUTOS
              </p>
              {PUBLIC_PRODUCT_LINKS.map((link) => (
                <MobileLink
                  key={link.href}
                  href={link.href}
                  current={SECTION_OF_HREF[link.href] === current}
                  strong
                  onNavigate={() => closeMenu(false)}
                >
                  {link.label}
                </MobileLink>
              ))}
              <div aria-hidden className="mx-3 my-1.5 h-px bg-site-line" />
              {PUBLIC_NAV_LINKS.map((link) => (
                <MobileLink
                  key={link.href}
                  href={link.href}
                  current={SECTION_OF_HREF[link.href] === current}
                  onNavigate={() => closeMenu(false)}
                >
                  {link.label}
                </MobileLink>
              ))}
            </nav>

            <div aria-hidden className="mx-3 my-1.5 h-px bg-site-line" />
            <ThemeSegmented className="px-3 py-1.5" />

            <div className="mt-1.5 flex flex-col gap-2">
              <DocumentLink
                href={PLATFORM_ENTRY.href}
                className="flex min-h-[48px] items-center justify-center rounded-[12px] border border-site-line2 p-3 text-center font-medium outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40"
              >
                {PLATFORM_ENTRY.label}
              </DocumentLink>
              <DocumentLink
                href={QUOTE_HREF}
                onClick={() => closeMenu(false)}
                className="flex min-h-[48px] items-center justify-center rounded-[12px] bg-site-ink p-3 text-center font-medium text-site-bg outline-none focus-visible:ring-2 focus-visible:ring-site-ink/50 focus-visible:ring-offset-2 focus-visible:ring-offset-site-surface min-[380px]:hidden"
              >
                Solicitar orçamento
              </DocumentLink>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
};

interface MobileLinkProps {
  href: string;
  current: boolean;
  strong?: boolean;
  onNavigate: () => void;
  children: string;
}

const MobileLink = ({
  href,
  current,
  strong,
  onNavigate,
  children,
}: MobileLinkProps) => (
  <DocumentLink
    href={href}
    aria-current={current ? "page" : undefined}
    onClick={onNavigate}
    className={cn(
      "flex min-h-[48px] items-center rounded-[12px] px-3 outline-none transition-colors duration-200 hover:bg-site-soft focus-visible:ring-2 focus-visible:ring-site-ink/40",
      strong && "font-medium",
      current && "bg-site-soft2 hover:bg-site-soft2",
    )}
  >
    {children}
  </DocumentLink>
);

export { SiteHeader, sectionOf };
export type { SiteHeaderProps, SiteSection };
