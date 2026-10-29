# Public site primitives (`@/components/site`)

The shared base of the public site redesign (claude.ai/design, 10/2026). Every
public page builds on these instead of re-implementing the design's inline
styles. Server components unless marked **client**.

## Tokens (globals.css + tailwind.config.ts)

- Colors `site-*`, in light and dark (`:root` / `.dark`): `bg`, `surface`, `soft`,
  `soft2`, `ink`, `muted`, `pink` (entregas), `violet` (frotas): these take an
  opacity modifier (`bg-site-ink/10`). Also `line`, `line2`, `pink-soft`,
  `violet-soft`, `glass`, `glass2`, `block`, `street`, `park`, `water`,
  `glow-a`, `glow-b`, and the blog categories `cat-entregas|frotas|operacao|integracoes|conformidade`.
  Example: `bg-site-bg text-site-ink border-site-line`.
- Fonts: `font-site` (Inter 400/500/600), `font-site-display` (Inter Tight
  500/600, stands in for SF Pro Display), `font-site-mono` (JetBrains Mono 500).
- Shadows: `shadow-site-pop` (menus), `shadow-site-bar`, `shadow-site-cta`,
  `shadow-site-cta-hover`, `shadow-site-panel`. Easing: `ease-site` = cubic-bezier(.22,1,.36,1).
- Keyframes (design names, globals.css): `tpUp tpFade tpIn tpInScale tpNavIn tpLive
tpPing tpRing tpFloat tpBob tpBlink tpPulse tpGrad tpProgress tpShake tpSpin
tpShimmer tpPop tpBack tpFwd tpDash tpComet tpHalo` (+ the phone's). Utilities:
  `animate-tp-up|tp-fade|tp-in|tp-nav-in|tp-live|tp-float|tp-pulse|tp-grad|tp-spin|tp-shake|tp-pop|tp-shimmer`;
  anything else: `animate-[tpUp_.9s_cubic-bezier(.22,1,.36,1)_.12s_both]`. Delay: `[animation-delay:120ms]`.
- `.site-root` (set by `SiteShell`): site background, ink, Inter, the .4s theme fade.

## Frame

| Primitive               | Props                                                                                                        | Notes                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SiteShell`             | `children`, `active?: SiteSection`, `footer?: boolean = true`, `className?`                                  | Root div + header + footer. The page renders its own `<main>`. Header is fixed, 70px (12 + 58): pad the first section's top (heroes use ≈ clamp(120px,14vw,160px)).                 |
| `SiteHeader` **client** | `active?: "" \| "frotas" \| "entregas" \| "app" \| "blog" \| "sobre" \| "contato" \| "orcamento" \| "legal"` | Active entry comes from the pathname; pass `active` only to override. Glass on scroll, Produtos dropdown, phone menu ≥ 960px breakpoint, theme segmented control in the phone menu. |
| `SiteFooter`            | –                                                                                                            | Columns from `FOOTER_SECTIONS` (`@/lib/public-pages`).                                                                                                                              |
| `SiteLogo`              | `className?`, `onClick?`                                                                                     | Cropped mark + "Trajetto", links to `/`.                                                                                                                                            |

## Layout and type

| Primitive        | Props                                                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Section`        | `spacing?: "default" \| "tight" \| "none"` (default: top clamp(80px,11vw,140px), bottom clamp(40px,6vw,64px); tight: clamp(48px,6vw,72px)), + section props. Side gutter clamp(20px,4vw,40px). |
| `Container`      | `width?: 1200 \| 1080 \| 960 \| 880 \| 760 \| 680` (default 1200), + div props.                                                                                                                |
| `Eyebrow`        | `tone?: "muted" \| "dark-band"`, `size?: "md" (12px/.14em) \| "sm" (11px/.12em)`. Write the text in UPPERCASE in the source.                                                                   |
| `SectionHeading` | `size?: "hero" \| "xl" \| "lg" \| "md" \| "sm"` (default lg), `as?` (h1 for hero, h3 for sm, h2 otherwise), `balance?: boolean = true`. Other design clamps → `className="text-[clamp(…)]"`.   |
| `Lead`           | `size?: "lg" (clamp(17px,1.5vw,20px)) \| "md" (17px)`. Muted, line-height 1.6.                                                                                                                 |
| `SectionHeader`  | `eyebrow?`, `title`, `lead?`, `id?`, `size?`, `align?: "start" \| "center"`, `className?`.                                                                                                     |

## Buttons

`ArrowLink` (`href`, `children`, `variant?`, `size?`, `arrow?: boolean = true`,
`arrowSize?`, `external?`, `aria-label?`, `aria-current?`, `onClick?` (client
callers only), `className?`), `ArrowButton` (same style props + button
attributes, `type="button"` default), `siteButtonClass({ variant, size, className })`
for any other element (form submit), `MovingArrow` (the arrow alone, inside a
`group/arrow`).

- variants: `primary` (ink fill, hero CTA, lifts 2px), `secondary` (outline),
  `surface` (surface fill + outline, lifts), `light` (#f5f5f7 fill for dark
  bands), `ghost-dark` (white/20 outline for dark bands), `text` (underlined
  text link).
- sizes: `lg` 15/22px r14 16px (default), `md` 12/18px r14 15px, `sm` 10/16px r12 14px.
- The arrow slides 4px on hover and focus-visible, 200ms ease-out; still under reduced motion.
- Internal hrefs go through `DocumentLink` (full load into /login, /docs).

## Motion

| Primitive            | Props                                                                                                                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Reveal` **client**  | `as?` (element, default div), `variant?: "up" \| "fade" \| "grow-x" \| "grow-y"`, `delay?: ms`, + element props. Server HTML stays visible; only elements below the fold at hydration are hidden and animated in. Bars: `grow-*` (stagger delay 250 + i·70 like the design). |
| `CountUp` **client** | `value: number`, `duration? = 1300`, `format?` (client callers only), + span props. Renders the final value on the server.                                                                                                                                                   |

Load-time entrances (heroes) use CSS only: `className="animate-tp-up [animation-delay:120ms]"`.

## Mockups

| Primitive     | Props                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PanelMockup` | `className?`. The web dashboard (Trajetto Painel), with count-up and growing bars. `role="img"` with a description.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `PhoneMockup` | `screen?: "deliveries" \| "proof" \| "offline" \| "fuel" \| "checklist"`, `className?`, `label?`. Give it a width (e.g. `w-[280px]`, `w-[min(240px,70%)]`); height follows 9:18.5. The screen lays out 1:1 like the design (same type size; a short phone crops the bottom) and only scales down below 228px of inner width. Changing `screen` replays its animations. `PHONE_SCREENS` lists the ids. Stays light in dark mode, like the app. A screen with a primary action (proof, fuel, checklist) pins it to a bottom action bar (`data-phone-action-bar`: translucent white, blur, hairline, Android gesture handle) with the content scrolling under it. |

## Theme switch (`@/components/shared/theme-toggle`, **client**)

- `ThemeToggle` (`className?`, `tone?: "site" \| "app"`): round 38px icon button, sun/moon with rotate/scale, label "Alternar para tema escuro/claro".
- `ThemeSegmented` (`className?`, `tone?`, `showLabel? = true`): "Tema: Claro · Escuro · Sistema" radio group (arrows/Home/End).

## Icons

The design's icon set (`trajetto-icons.js`) is lucide: import from `lucide-react`
(e.g. `smartphone` → `Smartphone`, `clipboard-check` → `ClipboardCheck`).

## Page building blocks

Each page family keeps its sections next to its content. Reuse them before
writing new markup; files marked **client** are the interactive islands.

- `home/` (landing, Trajetto Home): `HomeHero`, `HomeStats`, `HomeModules`
  **client**, `HomeDriverApp` **client** (tabs that step by themselves, 4.8s,
  only on screen and without reduced motion), `HomeAI` **client**,
  `HomePanel`, `HomeCta`. Motion helpers in `use-home-motion.ts`
  (`useInView`, `usePrefersReducedMotion`, `tabListKeys`); the scan line in
  `home.module.css`.
- `product/` (`/gestao-de-frotas`, `/gestao-de-entregas`, Trajetto Produto):
  `ProductPage` + `productMetadata`, driven by `module: "frotas" | "entregas"`
  and the copy in `content.ts` (FAQ, flow, features, JSON-LD in `json-ld.ts`).
  Islands: `ProductApp` (app tabs), `ProductDemo` (dark-band demo),
  `ProductFaq`, `ProductFlow`, `SpotlightCard`, `HeroStage`.
- `app-page/` (`/app-do-motorista`, Trajetto App): `AppHero`, `AppStory`
  (sticky phone, `story-scroller` **client**), `AppOffline` **client**,
  `AppFeatures`, `AppQuestions`, `AppClosingCta`; copy in `content.ts`,
  `driverAppJsonLd`.
- `institutional/` (/sobre, /contato, /orcamento): `SiteField`, `SiteLabelText`,
  `SiteFieldError`, `CharCounter`, `SitePrivacyNotice` (links to
  `FORM_PRIVACY_HREF` from `@/lib/content/legal-documents`), `siteInputClass`;
  `DARK_BAND` / `DarkGrid`; `ParallaxSection`, `ScrollDrift`, `SpotlightCard`
  **client**; `SupportStatusPill` / `SupportStatusLine` **client** (support
  hours, `supportStatus` is the pure rule).
- `editorial/` (blog, article, legal): `PostCard`, `FeaturedPost` **client**,
  `RelatedCard`, `EditorialCtaBand`, `EditorialToc` / `MobileToc` **client**,
  `ReadingProgress` **client**, `ShareButton` **client**, `Shimmer`,
  `CategoryIcon` / `categoryAccent` / `categoryDot` (the `site-cat-*`
  tokens; `src/content/blog/categories.ts` holds the same hexes for the OG
  images, and a test keeps both in sync), `editorialMdxComponents`,
  `editorialDate`.

## Gotchas

- **Line-height survives a size override.** `primitives.tsx` merges classes
  with a local tailwind-merge (`font-size` no longer conflicts with
  `leading-*`), so `<SectionHeading className="text-[clamp(…)]">` keeps the
  size's line-height. Passing `leading-*` yourself still wins, and re-adding
  the default (several callers do) collapses to one class
  (tests/unitaires/site-primitives.test.ts).
- **No `duration-[Nms]` / `delay-[Nms]`.** `tailwindcss-animate` also defines
  `duration-*` and `delay-*` (for animations), so Tailwind finds the
  arbitrary form ambiguous, warns and emits nothing: the transition silently
  falls back to 150ms. Write `[transition-duration:400ms]` /
  `[transition-delay:120ms]` (and `[animation-delay:120ms]` for animations).
  The named steps (`duration-300`) are fine.
