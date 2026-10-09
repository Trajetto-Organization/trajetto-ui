// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { Window } from "happy-dom";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { contrast, over } from "./helpers/contrast";
import {
  colourOf,
  measureRenderedContrast,
  moduleBackgrounds,
  themeTokens,
} from "./helpers/rendered-contrast";
import { React, renderHtml } from "./helpers/render-html";

import Home from "@/app/page";
import About from "@/app/sobre/page";
import FleetManagementPage from "@/app/gestao-de-frotas/page";
import DeliveryManagementPage from "@/app/gestao-de-entregas/page";
import DriverAppPage from "@/app/app-do-motorista/page";

import { PanelMockup } from "@/components/site/panel-mockup";
import { PHONE_SCREENS, PhoneMockup } from "@/components/site/phone-mockup";
import {
  DELIVERY_FAQ,
  DELIVERY_FLOW,
  FLEET_FLOW,
} from "@/components/site/product/content";
import { tutorialConfigs } from "@/app/(protected)/_components/layout/protected-tutorial/tutorial-provider/data";

// The navbar is a client component with its own suite; it renders nothing
// that these tests look at.
vi.mock("@/components/site/site-header", () => ({ SiteHeader: () => null }));

// next/image needs Next's image loader and blur data; a plain <img> keeps
// what matters here (src and alt).
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string | { src: string }; alt: string }) =>
    React.createElement("img", {
      src: typeof src === "string" ? src : src.src,
      alt,
    }),
}));

/**
 * The public landing, the about page and the two product pages.
 *
 * The site spoke only of fleets while the product had grown a delivery
 * module; it printed figures nobody could source ("30% de redução", "∞
 * veículos", "99.7% de precisão", "uptime de 99.9%"); it shipped ~225 KB of
 * screenshots; and, once prerendered, it would have frozen a "next reset"
 * date computed at build time. Each of those is held here.
 */
const ORIGIN = "https://www.intrajetto.com";
const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");

beforeEach(() => {
  vi.stubEnv("METADATA_BASE", ORIGIN);
  vi.stubEnv("NODE_ENV", "development");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const PAGES = {
  "/": () => renderHtml(Home()),
  "/sobre": () => renderHtml(About()),
  "/gestao-de-frotas": () => renderHtml(FleetManagementPage()),
  "/gestao-de-entregas": () => renderHtml(DeliveryManagementPage()),
  "/app-do-motorista": () => renderHtml(DriverAppPage()),
} as const;

const PAGE_ENTRIES = [
  "src/app/page.tsx",
  "src/app/sobre/page.tsx",
  "src/app/gestao-de-frotas/page.tsx",
  "src/app/gestao-de-entregas/page.tsx",
  "src/app/app-do-motorista/page.tsx",
];

/** Visible text of an HTML fragment, entities decoded, whitespace collapsed. */
function textOf(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A rendered page as a DOM. The caller closes the window when done.
 *
 * <style> and <script> go first: no visible text in them, and happy-dom's
 * parser stops at the <style> inside the route animation's <svg>, dropping
 * the rest of the page. The guard makes sure nothing else was dropped.
 */
function parsePage(html: string): { document: Document; close: () => void } {
  const window = new Window();
  window.document.body.innerHTML = html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "");

  const parsed = (window.document.body.textContent ?? "").replace(
    /\s+/g,
    "",
  ).length;
  expect(parsed).toBeGreaterThan(
    textOf(html).replace(/\s+/g, "").length * 0.95,
  );

  return {
    document: window.document as unknown as Document,
    close: () => window.close(),
  };
}

/**
 * Claims the product cannot back (CDC art. 37). Route "optimisation" is on
 * the list because the stop order is the dispatcher's: nothing computes it.
 */
const UNBACKED_CLAIMS: [string, RegExp][] = [
  ["12 países", /12 países/i],
  ["líder de mercado", /\blíder\b/i],
  [
    "otimização de rotas",
    /otimiz\w*\s+(?:de\s+|as\s+)?rotas|rotas\s+otimizad/i,
  ],
  ["30% de redução", /\d+\s*%\s*(?:de\s+)?redução|redução de custos/i],
  ["veículos ilimitados", /∞|ilimitad/i],
  ["precisão de 99,7%", /99[.,]7/],
  ["uptime", /uptime|99[.,]9/i],
  ["telemetria", /telemetria/i],
  ["criptografia de ponta", /criptografia de ponta/i],
  ["depoimentos fictícios", /avatar\.vercel\.sh/i],
];

describe("what the public pages say", () => {
  it.each(Object.keys(PAGES))(
    "%s makes no claim the product cannot back",
    (path) => {
      const html = PAGES[path as keyof typeof PAGES]();
      const text = textOf(html);

      for (const [claim, pattern] of UNBACKED_CLAIMS) {
        expect(text, claim).not.toMatch(pattern);
      }
    },
  );

  it("the landing presents both modules and links to each product page", () => {
    const html = PAGES["/"]();
    const text = textOf(html);

    expect(text).toContain("Gestão de Frotas");
    expect(text).toContain("Gestão de Entregas");
    expect(html).toContain('href="/gestao-de-frotas"');
    expect(html).toContain('href="/gestao-de-entregas"');
    // The driver app shows the delivery side too, not only fuel and checklist.
    // The proof of delivery among them, as the old landing listed it.
    expect(text).toContain("Entregas do dia");
    expect(text).toContain("Comprovante");
    expect(text).toContain("Fila sem sinal");
    expect(text).toContain("Abastecimento");
  });

  it("the about page tells the delivery module's part of the story", () => {
    const text = textOf(PAGES["/sobre"]());

    expect(text).toMatch(/Gestão de Entregas/);
    expect(text).toMatch(/frotas e (?:de )?entregas/i);
  });

  it.each(Object.keys(PAGES))("%s has one main landmark and one h1", (path) => {
    const html = PAGES[path as keyof typeof PAGES]();

    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  // The about hero named itself after an id nothing carried, leaving the
  // region unnamed.
  it.each(Object.keys(PAGES))(
    "%s points every aria reference at an id on the page",
    (path) => {
      const html = PAGES[path as keyof typeof PAGES]();
      const ids = new Set(
        [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
      );
      const references = [
        ...html.matchAll(
          /\s(aria-labelledby|aria-describedby|aria-controls|for)="([^"]+)"/g,
        ),
      ].flatMap((match) =>
        match[2].split(/\s+/).map((id) => ({ attribute: match[1], id })),
      );

      // Every page names at least its sections this way.
      expect(references.length).toBeGreaterThan(0);
      expect(references.filter(({ id }) => !ids.has(id))).toEqual([]);
    },
  );

  // Counted up from zero on the client, the figures reached the server
  // markup (crawlers, link previews, no-JS readers) as "0% Isolamento".
  it("the about page's figures are in the markup, not a count from zero", () => {
    const text = textOf(PAGES["/sobre"]());

    // The suffix is its own (smaller) span, so tags may separate it.
    expect(text).toMatch(/\b2 Módulos/);
    expect(text).toMatch(/\b20 ?\+ Telas de gestão/);
    expect(text).toMatch(/\b100 ?% Isolamento por Empresa/);
    expect(text).toMatch(/\b7 dias Sem sinal/);
  });

  it.each(Object.keys(PAGES))(
    "%s never names a link something other than what it shows (WCAG 2.5.3)",
    (path) => {
      const html = PAGES[path as keyof typeof PAGES]();

      for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        const label = /aria-label="([^"]*)"/.exec(match[1])?.[1];
        const visible = textOf(match[2]);

        if (label && visible) {
          expect(
            textOf(label).toLowerCase(),
            `${label} / ${visible}`,
          ).toContain(visible.toLowerCase());
        }
      }
    },
  );
});

/** Visible text in sentences, none running across two blocks (items, paragraphs, cells). */
function sentencesOf(html: string): string[] {
  const BLOCK_END =
    /<\/(?:p|li|dd|dt|h[1-6]|summary|td|th|figcaption|div|section|article|header|footer|button|label)>/;

  return html
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .split(BLOCK_END)
    .flatMap((block) => textOf(block).split(/(?<=[.!?])\s+/))
    .filter(Boolean);
}

/**
 * Decision 7.3: background tracking stays off until the Play Console
 * declaration, so the tower sees a driver only while their app is open.
 * The copy had promised the position "durante a rota" and, in the FAQ
 * (also published as FAQPage JSON-LD), that no location is collected
 * outside a route, although fuel records, proofs and occurrences carry the
 * GPS of the moment they are sent.
 */
describe("where the driver is (decision 7.3)", () => {
  const ABOUT_A_ROUTE = /\btorre\b|\brotas?\b/i;
  const DRIVER_POSITION =
    /\bposição\b|\blocalização\b|onde o motorista|mostra o motorista/i;
  const APP_OPEN = /\bapp\b[^.!?]*\baberto\b/i;

  /** Affirmative sentences that place the driver on the map during a route. */
  function positionPromises(html: string): string[] {
    return sentencesOf(html).filter(
      (sentence) =>
        ABOUT_A_ROUTE.test(sentence) &&
        DRIVER_POSITION.test(sentence) &&
        !sentence.endsWith("?") &&
        !/\bnão\b/i.test(sentence),
    );
  }

  it.each(Object.keys(PAGES))(
    "%s promises the driver's position only with the app open",
    (path) => {
      const promises = positionPromises(PAGES[path as keyof typeof PAGES]());

      expect(promises.filter((sentence) => !APP_OPEN.test(sentence))).toEqual(
        [],
      );
    },
  );

  it("the delivery page does talk about the tower, so the check above means something", () => {
    expect(
      positionPromises(PAGES["/gestao-de-entregas"]()).length,
    ).toBeGreaterThan(1);
  });

  it.each(Object.keys(PAGES))(
    "%s never says the location is not collected",
    (path) => {
      const text = textOf(PAGES[path as keyof typeof PAGES]());

      expect(text).not.toMatch(/não (?:é|são) coletad|não coleta/i);
    },
  );

  it("the tower FAQ answer (and its JSON-LD) states the app-open condition", () => {
    const tower = DELIVERY_FAQ.find((item) =>
      /torre de controle/i.test(item.question),
    );

    expect(tower?.answer).toMatch(APP_OPEN);
  });
});

/**
 * In the driver app, fuel, proof, occurrence and arrival records carry the
 * GPS of the moment they are sent; the checklist carries none. The fleet
 * flow's "O motorista registra no app" step covered fuel and checklist and
 * listed "Posição capturada no envio" for both.
 */
const MOBILE_CHECKLIST = [
  "features/checklist/hooks/use-checklist.ts",
  "schemas/checklist.ts",
  "components/screens/checklist/checklist-form.tsx",
].map((file) => resolve(ROOT, "../trajetto-mobile", file));
const CHECKLIST_CAPTURES_POSITION = MOBILE_CHECKLIST.some(
  (file) =>
    existsSync(file) &&
    /captureLocation|latitude/.test(readFileSync(file, "utf8")),
);

describe.skipIf(CHECKLIST_CAPTURES_POSITION)(
  `which driver records carry a position${
    CHECKLIST_CAPTURES_POSITION
      ? " — skipped: the app's checklist now records one"
      : ""
  }`,
  () => {
    const POSITION = /\bposição\b|\blocalização\b|\bGPS\b/i;

    it("a flow step that covers the checklist names the record that carries the position", () => {
      const loose = [...FLEET_FLOW, ...DELIVERY_FLOW].flatMap((step) =>
        /checklist/i.test(`${step.title} ${step.description}`)
          ? step.points.filter(
              (point) => POSITION.test(point) && !/abastecimento/i.test(point),
            )
          : [],
      );

      expect(loose).toEqual([]);
    });

    it.each(Object.keys(PAGES))(
      "%s never ties a position to the checklist",
      (path) => {
        const offenders = sentencesOf(
          PAGES[path as keyof typeof PAGES](),
        ).filter(
          (sentence) => /checklist/i.test(sentence) && POSITION.test(sentence),
        );

        expect(offenders).toEqual([]);
      },
    );
  },
);

/**
 * Every dashboard screen has a tour since decision 9.2 (the check below
 * keeps it that way), and on a phone only the general dashboard tour starts
 * by itself (decision 9.3). The copy said "em cada página" and
 * "na primeira visita a cada página, o guia inicia sozinho".
 */
const DASHBOARD = resolve(SRC, "app/(protected)/dashboard");

/** Dashboard screens a user can open, as routes. */
function dashboardRoutes(): string[] {
  return (
    filesUnder(DASHBOARD)
      .filter((file) => file.endsWith("page.tsx"))
      // Test probes (boundary-probe) open only under E2E_PROBES: not screens.
      .filter(
        (file) =>
          !/process\.env\.E2E_PROBES\b/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(DASHBOARD, dirname(file)).replace(/\\/g, "/"))
      .filter((segment) => !segment.includes("["))
      .map((segment) => (segment ? `/dashboard/${segment}` : "/dashboard"))
  );
}

function dashboardRoutesWithoutTour(): string[] {
  // The tours are spread over several files now; the registry is the truth.
  const tours = new Set(Object.keys(tutorialConfigs));

  return dashboardRoutes().filter((route) => !tours.has(route));
}

describe("what the tutorial copy promises", () => {
  const EVERY_SCREEN = /\b(?:cada|todas as)\s+(?:páginas?|telas?)\b/i;
  const TUTORIAL = /tutorial|\bguias?\b/i;

  it("the tour check reads the dashboard's screens and tours", () => {
    expect(dashboardRoutes()).toContain("/dashboard/fuel");
    expect(dashboardRoutes()).not.toContain("/dashboard/boundary-probe");
    expect(dashboardRoutesWithoutTour()).not.toContain("/dashboard/fuel");
  });

  it.each(Object.keys(PAGES))(
    "%s promises a guide on every screen only once every screen has one",
    (path) => {
      const missing = dashboardRoutesWithoutTour();
      const promises = sentencesOf(PAGES[path as keyof typeof PAGES]()).filter(
        (sentence) => TUTORIAL.test(sentence) && EVERY_SCREEN.test(sentence),
      );

      expect(
        missing.length === 0 ? [] : promises,
        `sem tour: ${missing.join(", ")}`,
      ).toEqual([]);
    },
  );

  it.each(Object.keys(PAGES))(
    "%s says the guide starts by itself on the computer",
    (path) => {
      const offenders = sentencesOf(PAGES[path as keyof typeof PAGES]()).filter(
        (sentence) =>
          /inicia\w*\s+(?:sozinh|automaticamente)/i.test(sentence) &&
          !/computador/i.test(sentence),
      );

      expect(offenders).toEqual([]);
    },
  );
});

/**
 * Decision 5.6 has XML imports recorded (and reversible) like spreadsheets,
 * but until the API's XML use case writes an Import row, only a spreadsheet
 * import can be listed and reversed. The copy follows the code: once the
 * use case records XML imports this check turns itself off.
 */
const XML_IMPORT_USECASE = resolve(
  ROOT,
  "../trajetto-api/src/modules/delivery/usecases/import-delivery-xml/import-delivery-xml-usecase.ts",
);
const XML_IMPORTS_RECORDED =
  existsSync(XML_IMPORT_USECASE) &&
  /importRepository|\bimportId\b|\bimport_id\b/.test(
    readFileSync(XML_IMPORT_USECASE, "utf8"),
  );

const API_CHECKED_OUT = existsSync(XML_IMPORT_USECASE);

// trajetto-ui is its own repository: where the API sits next to it (a
// workstation, a cross-repo job) this runs; elsewhere the title says why not.
describe.skipIf(!API_CHECKED_OUT || XML_IMPORTS_RECORDED)(
  `reversing an import (decision 5.6, not yet in the API for XML)${
    !API_CHECKED_OUT
      ? " — skipped: ../trajetto-api is not checked out"
      : XML_IMPORTS_RECORDED
        ? " — skipped: the API records XML imports now (the XML and spreadsheet suite below applies)"
        : ""
  }`,
  () => {
    it.each(Object.keys(PAGES))(
      "%s offers reversal for spreadsheets only",
      (path) => {
        const offenders = sentencesOf(
          PAGES[path as keyof typeof PAGES](),
        ).filter(
          (sentence) =>
            /\bXML\b|NF-e/.test(sentence) &&
            /estorn/i.test(sentence) &&
            !/planilha com estorno/i.test(sentence),
        );

        expect(offenders).toEqual([]);
      },
    );
  },
);

// The other direction: once the API records XML imports (so they are listed
// and reversible), a sentence offering reversal must not read as
// spreadsheet-only.
describe.skipIf(!API_CHECKED_OUT || !XML_IMPORTS_RECORDED)(
  "reversing an import (decision 5.6, XML and spreadsheet)",
  () => {
    it.each(Object.keys(PAGES))(
      "%s offers reversal for XML imports too",
      (path) => {
        const offenders = sentencesOf(
          PAGES[path as keyof typeof PAGES](),
        ).filter(
          (sentence) =>
            /estorn/i.test(sentence) &&
            (/planilha/i.test(sentence)
              ? !/\bXML\b|NF-e/.test(sentence)
              : false),
        );

        expect(offenders).toEqual([]);
      },
    );

    it.each(Object.keys(PAGES))(
      "%s does not say only spreadsheets are reversible",
      (path) => {
        const offenders = sentencesOf(
          PAGES[path as keyof typeof PAGES](),
        ).filter((sentence) => /planilha com estorno/i.test(sentence));

        expect(offenders).toEqual([]);
      },
    );
  },
);

/**
 * The landing's dashboard picture draws the delivery panel's tiles. The old
 * demo carried the English "Overview" after the product renamed its tab;
 * here every tile label is read from the product's own operation panel, so
 * a rename in the product is caught.
 */
describe("the dashboard picture names the panel's tiles as the product does", () => {
  it("shows only tile labels the operation panel has", () => {
    const panel = readFileSync(
      resolve(
        SRC,
        "app/(protected)/_components/overview-dashboard/operation-panel/index.tsx",
      ),
      "utf8",
    );
    const productLabels = [...panel.matchAll(/\blabel:\s*"([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(productLabels, "rótulos do painel no produto").toContain(
      "Entregues hoje",
    );

    const { document, close } = parsePage(
      renderHtml(React.createElement(PanelMockup)),
    );
    const tiles = new Set(
      Array.from(document.querySelectorAll("p, span, div"))
        .map((element) => element.textContent?.trim() ?? "")
        .filter((text) => productLabels.includes(text)),
    );
    close();

    // The six tiles of the panel, every one of them under the product's name.
    expect([...tiles].sort()).toEqual([
      "Designadas",
      "Em rota",
      "Entregues hoje",
      "Insucessos hoje",
      "Ocorrências hoje",
      "Sem rota",
    ]);
  });
});

describe("pictures of the product are pictures, not controls", () => {
  const PICTURES: [string, () => React.ReactElement][] = [
    ["the dashboard", () => React.createElement(PanelMockup)],
    ...PHONE_SCREENS.map((screen): [string, () => React.ReactElement] => [
      `the phone's ${screen} screen`,
      () => React.createElement(PhoneMockup, { screen }),
    ]),
  ];

  it.each(PICTURES)(
    "%s offers no control, nor a stop in the tab order",
    (_name, picture) => {
      const html = renderHtml(picture());

      expect(html).not.toMatch(/<(?:button|a|input|select|textarea)[\s>]/);
      expect(html).not.toMatch(/\stabindex="(?!-1")/);
    },
  );

  // The interactive islands keep real controls, so whether each one has a
  // handler is checked in the DOM: public-landing-dom.test.ts.

  // The tutorial card drew "Pular / Ant. / Próx." with a pointer cursor, and
  // the kanban's cards (which do not move) offered a grab cursor.
  it.each(Object.keys(PAGES))(
    "%s gives a pointer or grab cursor only to real controls",
    (path) => {
      const html = PAGES[path as keyof typeof PAGES]();
      const pointers = [
        ...html.matchAll(
          /<(\w+)\b[^>]*class="[^"]*\bcursor-(?:pointer|grab|grabbing|move)\b[^"]*"/g,
        ),
      ];

      expect(
        pointers
          .map((match) => match[1])
          .filter((tag) => !["a", "button", "summary", "label"].includes(tag)),
      ).toEqual([]);
    },
  );

  // The same drawings kept hover:bg-muted/50 and hover:bg-[#c2185b], and the
  // demo's sidebar and quick-link cards lit up under the mouse: pictures of
  // controls that still behave like controls.
  it.each(Object.keys(PAGES))(
    "%s changes colour on hover only on real controls",
    (path) => {
      const { document, close } = parsePage(
        PAGES[path as keyof typeof PAGES](),
      );
      const CONTROL =
        "a[href], button, summary, label, input, select, textarea, [role='button'], [role='tab']";

      // `hover:bg-transparent` is how a drawing switches off a shared
      // component's hover (the table row's), so it does not count.
      const offenders = Array.from(document.querySelectorAll("[class]"))
        .filter((element) =>
          /(?:^|\s)hover:(?:bg-(?!transparent(?:\s|$))|text-)/.test(
            element.getAttribute("class") ?? "",
          ),
        )
        .filter((element) => !element.closest(CONTROL))
        .map(
          (element) =>
            `${element.tagName.toLowerCase()}: ${(element.textContent ?? "").trim().slice(0, 40)}`,
        );

      close();
      expect(offenders).toEqual([]);
    },
  );
});

describe("the AI is described, not the vendor", () => {
  // The old AI limits section explained the photo allowance without naming
  // a model; every public page keeps it that way.
  it.each(Object.keys(PAGES))("%s names no model or AI vendor", (path) => {
    expect(textOf(PAGES[path as keyof typeof PAGES]())).not.toMatch(
      /claude|anthropic|haiku|gpt|gemini/i,
    );
  });
});

describe("a prerendered page does not read the clock", () => {
  // The footer's year is the one exception, held by footer-year.test.ts: it
  // is rendered with the build's year and corrected on the client.
  const withoutFooter = (html: string) =>
    html.replace(/<footer[\s\S]*?<\/footer>/g, "");

  it.each(Object.keys(PAGES))(
    "%s says the same thing whatever the build date",
    (path) => {
      vi.useFakeTimers();

      vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
      const september = withoutFooter(PAGES[path as keyof typeof PAGES]());

      vi.setSystemTime(new Date("2027-02-03T12:00:00Z"));
      const february = withoutFooter(PAGES[path as keyof typeof PAGES]());

      expect(february).toBe(september);
    },
  );

  it("no landing, about or product component calls the clock", () => {
    const offenders = landingSources().filter((file) =>
      /\bnew Date\(|\bDate\.now\(/.test(readFileSync(file, "utf8")),
    );

    expect(offenders.map((file) => relative(ROOT, file))).toEqual([]);
  });

  it("the walk reads the site's mockups and sections, so an empty result means something", () => {
    const files = landingSources().map((file) =>
      relative(ROOT, file).replace(/\\/g, "/"),
    );

    expect(files).toEqual(
      expect.arrayContaining([
        "src/components/site/panel-mockup.tsx",
        "src/components/site/phone-mockup/index.tsx",
        "src/components/site/home/hero.tsx",
        "src/components/site/product/product-hero.tsx",
        "src/components/site/app-page/hero.tsx",
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// Source walks
// ---------------------------------------------------------------------------

const LANDING_DIRS = [
  "src/components/site/home",
  "src/components/site/product",
  "src/components/site/app-page",
  "src/components/site/phone-mockup",
  "src/components/about",
  "src/app/sobre",
  "src/app/gestao-de-frotas",
  "src/app/gestao-de-entregas",
  "src/app/app-do-motorista",
];

/** Shared drawings of the site that the landing pages render. */
const LANDING_FILES = ["src/components/site/panel-mockup.tsx"];

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return filesUnder(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function cssModulesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return cssModulesUnder(path);
    return name.endsWith(".module.css") ? [path] : [];
  });
}

function landingSources(): string[] {
  return [
    resolve(ROOT, "src/app/page.tsx"),
    ...LANDING_FILES.map((file) => resolve(ROOT, file)),
    ...LANDING_DIRS.flatMap((dir) => filesUnder(resolve(ROOT, dir))),
  ];
}

const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];
const IMAGE = /\.(png|jpe?g|webp|gif|avif)$/i;

function resolveImport(from: string, specifier: string): string | null {
  let base: string;

  if (specifier.startsWith("@/")) base = join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return null;

  if (existsSync(base) && statSync(base).isFile()) return base;

  for (const extension of EXTENSIONS) {
    if (existsSync(`${base}${extension}`)) return `${base}${extension}`;
  }

  // An import of a file that was deleted still names it.
  return IMAGE.test(base) ? base : null;
}

/** Every raster image the page's modules import, transitively. */
function rasterImports(entry: string): string[] {
  const images = new Set<string>();
  const seen = new Set<string>();

  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);

    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(
      /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g,
    )) {
      const target = resolveImport(file, match[1]);
      if (!target) continue;

      if (IMAGE.test(target))
        images.add(relative(ROOT, target).replace(/\\/g, "/"));
      else if (/\.(ts|tsx)$/.test(target)) visit(target);
    }
  };

  visit(resolve(ROOT, entry));
  return [...images].sort();
}

describe("the public pages stay light", () => {
  // The logo and the partners' photos stay; everything else is drawn in
  // HTML and CSS.
  const ALLOWED = [
    "src/assets/about/gabriel-about-co-founder.webp",
    "src/assets/about/jomar-about-co-founder.webp",
    "src/assets/about/michael-about-co-founder.webp",
    "src/assets/about/thiago-about-co-founder.webp",
    "src/assets/logo/trajetto-logo.png",
  ];

  it.each(PAGE_ENTRIES)(
    "%s imports no raster image but the logo and the partners",
    (entry) => {
      const outside = rasterImports(entry).filter(
        (image) => !ALLOWED.includes(image),
      );

      expect(outside).toEqual([]);
    },
  );

  it("the old screenshots and the about background are gone from the repository", () => {
    expect(existsSync(resolve(ROOT, "src/assets/home"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/assets/about/about.webp"))).toBe(
      false,
    );
  });

  it("the walk does see an image import, so an empty result means something", () => {
    // Guard against a walker that silently resolves nothing: /about shows
    // the partners' photos, and its navbar the logo.
    expect(rasterImports("src/app/sobre/page.tsx")).toEqual(ALLOWED);
  });
});

/**
 * Light-only colours on a page whose theme follows the system: a grey-800
 * heading on a dark card is invisible. A class string that sets a grey text
 * colour must say what it becomes in dark mode, and no inline style may pin
 * a light background.
 *
 * The phone's screens are exempt on purpose: they draw the Android app,
 * which has a light theme only.
 */
describe("the public pages work in dark mode", () => {
  const EXEMPT = ["src/components/site/phone-mockup/index.tsx"];
  const TOKENS = themeTokens(
    readFileSync(resolve(SRC, "app/globals.css"), "utf8"),
  );
  const DARK_CARD = TOKENS.dark.get("card")!;

  /**
   * A palette text colour (or black) that the dark card cannot carry, with
   * no `dark:text-` variant and no light surface of its own in the same
   * string. Measured, not listed: the grey-only list let `text-blue-600`
   * (3.3:1 on the dark card, 2.8:1 on the hero's slate-800) through.
   *
   * A string that sizes or weighs its text is text: 4.5:1 (3:1 when large).
   * One that does not may colour an icon, which WCAG holds to 3:1; the
   * rendered-page measure below holds the actual text to 4.5:1.
   */
  const TEXT_SIZE =
    /^text-(?:xs|sm|base|lg|xl|[2-9]xl|\[\d+(?:\.\d+)?(?:px|rem)\])$/;
  const TEXT_WEIGHT =
    /^font-(?:thin|light|normal|medium|semibold|bold|extrabold|black)$/;

  function unreadableInDark(literal: string): string | null {
    const names = literal.split(/\s+/).filter(Boolean);
    if (names.some((name) => name.startsWith("dark:text-"))) return null;

    const size = names
      .map((name) => TEXT_SIZE.exec(name)?.[0])
      .filter(Boolean)
      .pop();
    const bold = names.some((name) =>
      /^font-(?:semibold|bold|extrabold|black)$/.test(name),
    );
    const isText = !!size || names.some((name) => TEXT_WEIGHT.test(name));
    const large =
      !!size && (/^text-[2-9]xl$/.test(size) || (size === "text-xl" && bold));
    const floor = isText && !large ? 4.5 : 3;

    const ownLightSurface =
      !names.some((name) => name.startsWith("dark:bg-")) &&
      names.some((name) => {
        const paint = name.startsWith("bg-")
          ? colourOf(name.slice(3), "light", TOKENS)
          : null;
        return (
          !!paint &&
          !paint.token &&
          paint.alpha >= 0.9 &&
          contrast(paint.rgb, [0, 0, 0]) >= 10
        );
      });
    if (ownLightSurface) return null;

    for (const name of names) {
      if (!/^text-(?:black|[a-z]+-\d{2,3})(?:\/\d+)?$/.test(name)) continue;

      const paint = colourOf(name.slice(5), "dark", TOKENS);
      if (!paint || paint.token) continue;
      if (contrast(over(paint.rgb, paint.alpha, DARK_CARD), DARK_CARD) < floor)
        return name;
    }

    return null;
  }

  const LIGHT_INLINE_BACKGROUND =
    /background(?:Color)?:\s*["'`](?:#fff(?:fff)?|#f8fafc|white)["'`]/i;

  /** A white surface; a faint white tint (up to /40) does not make a surface light. */
  const WHITE_SURFACE = /(?:^|\s)(bg-white(?:\/(?:[5-9]\d|100))?)(?=\s|$)/;
  /**
   * A text colour that stays put across themes. `text-foreground` does not
   * count: it is the very colour that turns near-white in dark mode.
   */
  const FIXED_TEXT_COLOUR =
    /(?:^|\s)text-(?:white|black|\[#|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d)/;

  /**
   * Every string in the file, as the compiler reads it. A regex over the
   * source missed JSX attributes that span lines — the class strings of the
   * floating tour controls among them.
   */
  function literals(file: string, source: string): string[] {
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const found: string[] = [];

    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
      ) {
        found.push(node.text);
      } else if (ts.isTemplateExpression(node)) {
        found.push(
          [
            node.head.text,
            ...node.templateSpans.map((span) => span.literal.text),
          ].join(" "),
        );
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return found;
  }

  function classStrings(): { path: string; literal: string }[] {
    return landingSources().flatMap((file) => {
      const path = relative(ROOT, file).replace(/\\/g, "/");
      if (EXEMPT.includes(path)) return [];

      return literals(file, readFileSync(file, "utf8")).map((literal) => ({
        path,
        literal,
      }));
    });
  }

  it("reads class strings that span lines", () => {
    // Guard for the walker itself: a JSX attribute and a template literal,
    // each split over lines (the old tour controls were written that way).
    const source = [
      "const a = <button",
      '  className="w-12 h-12',
      '    rounded-full border-2"',
      "/>;",
      "const b = `bg-white",
      "  ${tone} text-gray-700`;",
    ].join("\n");
    const found = literals("probe.tsx", source);

    expect(
      found.some((literal) => /\bw-12\b[\s\S]*\bborder-2\b/.test(literal)),
    ).toBe(true);
    expect(
      found.some((literal) =>
        /\bbg-white\b[\s\S]*\btext-gray-700\b/.test(literal),
      ),
    ).toBe(true);
    // And it does read the landing's sources.
    expect(classStrings().length).toBeGreaterThan(200);
  });

  it("no class string pins a text colour the dark theme cannot read", () => {
    const problems = classStrings()
      .map(({ path, literal }) => ({
        path,
        unreadable: unreadableInDark(literal),
      }))
      .filter(({ unreadable }) => unreadable !== null)
      .map(({ path, unreadable }) => `${path}: ${unreadable}`);

    expect(problems).toEqual([]);
  });

  it("the measure flags a saturated colour, not only greys", () => {
    // Guard for the rule itself, on the class string that slipped through.
    expect(unreadableInDark("text-xs text-blue-600 font-medium")).toBe(
      "text-blue-600",
    );
    expect(
      unreadableInDark("text-xs text-blue-600 dark:text-blue-400"),
    ).toBeNull();
    expect(unreadableInDark("bg-blue-100 text-blue-700")).toBeNull();
    expect(unreadableInDark("text-green-400")).toBeNull();
    // An icon's colour clears 3:1; a grey-700 icon vanishes on the dark card.
    expect(unreadableInDark("h-4 w-4 text-indigo-500")).toBeNull();
    expect(unreadableInDark("h-4 w-4 text-gray-700")).toBe("text-gray-700");
  });

  it("a white surface says what it is in dark mode or fixes its own text colour", () => {
    // White with inherited text is near-white on white in dark mode: the
    // tour's "previous" arrow and step counter disappeared that way.
    const problems = classStrings()
      .map(({ path, literal }) => ({
        path,
        literal,
        white: WHITE_SURFACE.exec(literal),
      }))
      .filter(
        ({ literal, white }) =>
          white &&
          !/(?:^|\s)dark:bg-/.test(literal) &&
          !FIXED_TEXT_COLOUR.test(literal),
      )
      .map(({ path, white }) => `${path}: ${white![1]}`);

    expect(problems).toEqual([]);
  });

  it("no inline style pins a light background", () => {
    const problems = landingSources()
      .filter((file) =>
        LIGHT_INLINE_BACKGROUND.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(ROOT, file));

    expect(problems).toEqual([]);
  });
});

/**
 * The CSS modules of the landing animate only for visitors who did not ask
 * the system for less motion. The global reduced-motion rule shortens
 * Tailwind's animations; these declare their own, so each one must sit
 * inside the media query.
 */
describe("motion respects prefers-reduced-motion", () => {
  const MODULES = [
    "src/components/site/home/home.module.css",
    "src/components/site/product/product.module.css",
  ];

  /** [start, end) of every `@media (prefers-reduced-motion: no-preference)` block. */
  function motionBlocks(css: string): [number, number][] {
    const blocks: [number, number][] = [];
    const opener = /@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{/g;

    for (const match of css.matchAll(opener)) {
      let depth = 1;
      let index = (match.index ?? 0) + match[0].length;

      while (depth > 0 && index < css.length) {
        if (css[index] === "{") depth += 1;
        if (css[index] === "}") depth -= 1;
        index += 1;
      }
      blocks.push([match.index ?? 0, index]);
    }

    return blocks;
  }

  it.each(MODULES)(
    "%s declares every animation inside the media query",
    (file) => {
      const css = readFileSync(resolve(ROOT, file), "utf8").replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      );
      const blocks = motionBlocks(css);
      const declarations = [
        ...css.matchAll(/(?:^|[;{\s])animation(?:-name)?\s*:/g),
      ];

      expect(blocks.length).toBeGreaterThan(0);
      expect(declarations.length).toBeGreaterThan(0);

      for (const declaration of declarations) {
        const at = declaration.index ?? 0;
        expect(
          blocks.some(([start, end]) => at > start && at < end),
          `${file}: animation at offset ${at}`,
        ).toBe(true);
      }
    },
  );
});

/**
 * Text against what is painted behind it, in both themes (a translucent
 * surface shows the page beneath), against WCAG AA: 4.5:1, or 3:1 for large
 * text. See helpers/rendered-contrast.ts for what is read.
 *
 * The CTA's #f50057 → #a374e0 with text-white/90 fell to 3.1:1 at the
 * purple end; the about cards' translucent gradients washed out to 1.8:1
 * over the light background; the demo's status badges put small white text
 * on bg-yellow-400 (1.5:1) and bg-emerald-500 (2.5:1), which the hex-only
 * reading of the previous version did not see.
 */
describe("text stays readable in both themes", () => {
  const SOURCES = {
    tokens: themeTokens(readFileSync(resolve(SRC, "app/globals.css"), "utf8")),
    moduleBackgrounds: moduleBackgrounds(
      LANDING_DIRS.flatMap((dir) => cssModulesUnder(resolve(ROOT, dir))).map(
        (file) => readFileSync(file, "utf8"),
      ),
    ),
  };

  function failures(html: string) {
    const { document, close } = parsePage(html);
    const { findings, measured } = measureRenderedContrast(document, SOURCES);
    close();

    return {
      measured,
      findings,
      failing: findings.filter(({ ratio, floor }) => ratio < floor),
    };
  }

  it("the measure reads palette, hex and token colours, and dark: overrides", () => {
    // Guard for the walker itself, on the defects it exists to catch.
    const { failing } = failures(
      [
        '<div class="bg-yellow-400 text-white text-xs">Pendente</div>',
        '<div class="bg-emerald-500"><span class="text-white text-xs">Completo</span></div>',
        '<div class="bg-[#c2185b] text-white">Legível</div>',
        '<div class="bg-white dark:bg-slate-800"><span class="text-blue-600">Ações</span></div>',
        '<div class="bg-white dark:bg-slate-800"><span class="text-blue-600 dark:text-blue-400">Ok</span></div>',
        '<div class="bg-yellow-400"><span class="text-foreground">Token</span></div>',
        '<div class="bg-white opacity-40"><span class="text-gray-900 text-xs">Esmaecido</span></div>',
        '<div class="bg-white"><span class="text-gray-900 text-xs">Nítido</span></div>',
        '<div style="background-color:#0ea5e9"><span class="text-white text-xs">24</span></div>',
        '<div class="bg-card"><span style="color:#0ea5e9">★ Inline</span></div>',
      ].join(""),
    );

    expect(
      failing.map(({ text, theme }) => `${text} (${theme})`).sort(),
    ).toEqual([
      "24 (dark)",
      "24 (light)",
      "Ações (dark)",
      "Completo (dark)",
      "Completo (light)",
      "Esmaecido (dark)",
      "Esmaecido (light)",
      "Pendente (dark)",
      "Pendente (light)",
      "Token (dark)",
      "★ Inline (light)",
    ]);
  });

  // The old demo's badges put small white text on bg-yellow-400 (1.5:1);
  // the dashboard card's status pills are the same kind of small text on a
  // tint, so the walk must actually reach them, in both themes.
  it("the dashboard card's status pills are among what is measured", () => {
    const { findings } = failures(PAGES["/gestao-de-frotas"]());

    // The tint is per theme (/[.12] light, /[.16] dark); its hue is the same.
    for (const [label, surface] of [
      ["Em rota", "bg-[#0ea5e9]/"],
      ["Ativo", "bg-[#10b981]/"],
      ["Bloqueado", "bg-[#ef4444]/"],
    ]) {
      const measured = findings.filter(
        ({ text, where }) => text === label && where.includes(surface),
      );
      expect(
        [...new Set(measured.map(({ theme }) => theme))].sort(),
        label,
      ).toEqual(["dark", "light"]);
    }
  });

  it.each(Object.keys(PAGES))("%s: every text clears AA", (path) => {
    const { measured, failing } = failures(PAGES[path as keyof typeof PAGES]());

    // Something was measured, so an empty failure list means something.
    expect(measured).toBeGreaterThan(10);
    expect(failing).toEqual([]);
  });
});
