import { test, expect, type Page } from "@playwright/test";

import { open } from "./support/operation";

/**
 * The two controls every panel in this product has, and had five versions of.
 *
 * **Filters.** Three panels rendered their filter row as
 * `<Button variant={active ? "default" : "outline"}>`, which paints the chosen
 * filter as a PRIMARY BUTTON — the same solid dark pill as "Nova chave" right
 * beside it. A page with four primary buttons has none, and a filter that
 * looks like the page's main action is a filter people press by mistake.
 *
 * **Empty states.** Forty-nine dashed boxes and no two alike: `h-72` here,
 * `h-64` there, an icon at 10, at 12 or missing, and — worst — a single muted
 * sentence in three hundred pixels of nothing. "Nenhum comprovante esperando
 * revisão." tells the user what is absent and not one thing about what would
 * put something there.
 *
 * Both are asserted comparatively, across panels, because that is the only
 * place the inconsistency was ever visible.
 */
const PANELS = [
  {
    name: "Auditoria de Comprovantes",
    path: "/dashboard/deliveries?tab=proof-audits",
    group: "Situação dos comprovantes",
  },
  {
    name: "Monitor de Envios",
    path: "/dashboard/integrations?tab=monitor",
    group: "Situação dos envios",
  },
  {
    name: "Uso da API",
    path: "/dashboard/integrations?tab=usage",
    group: "Período",
  },
];

/** The shape of a chip group, in numbers. */
async function chipShape(page: Page, group: string) {
  const chips = page.getByRole("group", { name: group });

  await expect(chips, `${group}: o grupo de filtros não apareceu`).toBeVisible({
    timeout: 30_000,
  });

  return chips.evaluate((element) => {
    const buttons = [
      ...element.querySelectorAll("button"),
    ] as HTMLButtonElement[];

    const pressed = buttons.filter(
      (button) => button.getAttribute("aria-pressed") === "true",
    );

    const idle = buttons.find(
      (button) => button.getAttribute("aria-pressed") === "false",
    );

    const style = getComputedStyle(buttons[0]);

    return {
      count: buttons.length,
      pressedCount: pressed.length,

      trackBackground: getComputedStyle(element).backgroundColor,

      // The chosen one is lifted OUT of the track, not painted as a call to
      // action: same idea as the section strip above it.
      pressedBackground: pressed[0]
        ? getComputedStyle(pressed[0]).backgroundColor
        : null,
      idleBackground: idle ? getComputedStyle(idle).backgroundColor : null,

      height: buttons[0].offsetHeight,
      paddingX: style.paddingLeft,
      fontSize: style.fontSize,
    };
  });
}

test.describe("the panel filters", () => {
  for (const panel of PANELS) {
    test(`${panel.name}: is a toggle group, not a row of primary buttons`, async ({
      page,
    }) => {
      await open(page, panel.path);

      const shape = await chipShape(page, panel.group);

      expect(shape.count, "o grupo abriu vazio").toBeGreaterThanOrEqual(3);

      // Exactly one. `aria-pressed` on every chip and none true would leave a
      // screen-reader user with no idea which filter is on.
      expect(
        shape.pressedCount,
        `${shape.pressedCount} filtros marcados como ativos ao mesmo tempo`,
      ).toBe(1);

      expect(
        shape.pressedBackground,
        "o filtro ativo não se destaca do trilho",
      ).not.toBe(shape.trackBackground);

      /**
       * And it is NOT the primary colour.
       *
       * This is the defect in one assertion: the chosen filter used to be the
       * product's primary button, indistinguishable from "Nova chave" at a
       * glance. Whatever the palette becomes, the chip must not be it.
       */
      const primary = await page.evaluate(() => {
        const probe = document.createElement("div");

        probe.className = "bg-primary";
        document.body.appendChild(probe);

        const colour = getComputedStyle(probe).backgroundColor;

        probe.remove();

        return colour;
      });

      expect(
        shape.pressedBackground,
        "o filtro ativo está pintado como o botão primário da página",
      ).not.toBe(primary);
    });
  }

  test("and they are the SAME group in the three panels", async ({ page }) => {
    const shapes = [];

    for (const panel of PANELS) {
      await open(page, panel.path);
      shapes.push({
        name: panel.name,
        ...(await chipShape(page, panel.group)),
      });
    }

    const [first, ...rest] = shapes;

    for (const other of rest) {
      expect(
        other.height,
        `altura do chip: ${first.height}px em ${first.name}, ${other.height}px em ${other.name}`,
      ).toBe(first.height);

      expect(other.paddingX).toBe(first.paddingX);
      expect(other.fontSize).toBe(first.fontSize);
      expect(other.trackBackground).toBe(first.trackBackground);
      expect(other.pressedBackground).toBe(first.pressedBackground);
    }
  });
});

test.describe("the empty states", () => {
  test("say what is not there AND what would bring something", async ({
    page,
  }) => {
    /**
     * The queue is empty in the fixture, which is exactly the state worth
     * checking: it is the first thing a new customer sees on this screen.
     */
    await open(page, "/dashboard/deliveries?tab=proof-audits");

    const empty = page.getByText("Nenhum comprovante esperando revisão");

    await expect(empty).toBeVisible({ timeout: 30_000 });

    // The sentence that was missing: what puts a card in this queue.
    await expect(
      page.getByText(/motorista conclui uma entrega pelo aplicativo/),
      "o estado vazio diz o que falta e não como resolver",
    ).toBeVisible();
  });

  test("and have the same box in different panels", async ({ page }) => {
    /**
     * Found by the handle the primitive carries, not by their words.
     *
     * The first version looked for "Nenhuma chave emitida" and failed for a
     * reason that had nothing to do with the design: the fixture HAS keys, so
     * that panel is never empty. Which panels happen to be empty on a given
     * day is not something a design assertion should depend on — what it
     * needs is two boxes, wherever they are.
     */
    const boxesOn = async (path: string) => {
      await open(page, path);

      const boxes = page.locator("[data-empty-state]");

      await expect(
        boxes.first(),
        `${path} não tem nenhum estado vazio para medir`,
      ).toBeVisible({ timeout: 30_000 });

      return boxes.first().evaluate((element) => {
        const style = getComputedStyle(element);

        return {
          borderStyle: style.borderTopStyle,
          borderWidth: style.borderTopWidth,
          radius: style.borderTopLeftRadius,
          align: style.textAlign,
          direction: style.flexDirection,
        };
      });
    };

    const proof = await boxesOn("/dashboard/deliveries?tab=proof-audits");
    const usage = await boxesOn("/dashboard/integrations?tab=usage");

    expect(
      usage.borderStyle,
      `borda: ${proof.borderStyle} em comprovantes, ${usage.borderStyle} em uso da API`,
    ).toBe(proof.borderStyle);

    expect(usage.borderWidth).toBe(proof.borderWidth);
    expect(usage.radius).toBe(proof.radius);
    expect(usage.align).toBe(proof.align);
    expect(usage.direction).toBe(proof.direction);

    // Dashed, because that is what this product has always used to say "this
    // box would have had something in it".
    expect(proof.borderStyle).toBe("dashed");
  });
});
