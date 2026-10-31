import { managerToken } from "../ui/support/operation";

import { test, expect, type Page } from "../ui/support/test";

import { readFileSync } from "node:fs";

/**
 * What a form says when it refuses, and to whom.
 *
 * The axe suite next door could never catch this: it walks a page at rest, and
 * a validation error only exists after somebody has tried to submit. So the
 * whole repository shipped with `aria-invalid` appearing zero times and
 * `aria-describedby` zero times — a screen reader read every rejected field as
 * perfectly fine and never said what was wrong with it (WCAG 3.3.1).
 *
 * It was not only an assistive-technology problem. The message REPLACED the
 * field's label, so an address form that failed validation showed four red
 * sentences above four boxes that no longer said what they were for, and the
 * message itself was clipped to one line behind a hover-only tooltip.
 *
 * Four things are asserted, and the third and fourth are the ones that were
 * broken for everybody:
 *
 *   1. the rejected control carries `aria-invalid`;
 *   2. its `aria-describedby` resolves to an element that really is on the
 *      page and really has the message in it;
 *   3. the label still names the FIELD, not the error;
 *   4. the message is readable in full, without hovering anything.
 */
const CONTEXT = JSON.parse(
  readFileSync("../trajetto-api/tests/load/fixtures/load-context.json", "utf8"),
);

const BASE = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3100";

async function signIn(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "tkey",
      value: managerToken(),
      domain: "localhost",
      path: "/",
    },
  ]);

  /*
    The guided tour opens over every screen the first time an account sees it,
    as a modal dialog that owns focus. It is correct behaviour and it is not
    what this file is about — without this, every test here would be measuring
    the tutorial.

    Answering "already seen" to the whole `tutorial_` namespace rather than
    listing keys: the key is derived from the path AND the active tab, so a
    list would go stale the moment a tab is added.
  */
  await page.addInitScript(() => {
    const real = Storage.prototype.getItem;

    Storage.prototype.getItem = function getItem(key: string) {
      if (key.startsWith("tutorial_")) return "true";

      return real.call(this, key);
    };
  });
}

async function open(page: Page, path: string): Promise<void> {
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  expect(page.url(), `fell through to login: ${path}`).not.toContain("/login");
}

interface InvalidField {
  id: string;
  describedBy: string;
  message: string;
  labelText: string;

  /** INPUT, TEXTAREA or BUTTON — see the coverage assertion below. */
  tag: string;
}

/**
 * Everything the page is currently marking as invalid, read from the DOM the
 * same way a screen reader would: follow the attribute, find the node, take
 * its text.
 */
async function invalidFields(page: Page): Promise<InvalidField[]> {
  return page.evaluate(() => {
    const found: InvalidField[] = [];

    const controls = document.querySelectorAll<HTMLElement>(
      '[aria-invalid="true"]',
    );

    for (const control of Array.from(controls)) {
      const id = control.id;
      const describedBy = control.getAttribute("aria-describedby") ?? "";

      const description = describedBy
        ? document.getElementById(describedBy)
        : null;

      const label = id
        ? document.querySelector<HTMLElement>(`label[for="${CSS.escape(id)}"]`)
        : null;

      found.push({
        id,
        describedBy,
        message: (description?.textContent ?? "").trim(),
        labelText: (label?.textContent ?? "").trim(),
        tag: control.tagName,
      });
    }

    return found;
  });
}

/**
 * Whether this element would clip a message instead of wrapping it.
 *
 * Measured, not inferred from class names, and measured against a sentence
 * long enough to force the question. The obvious version of this check —
 * compare `scrollWidth` to `clientWidth` as the element stands — survived the
 * mutation that put `truncate` back, because the messages this form happens to
 * produce are short enough to fit on one line either way. Short text does not
 * discriminate: it fits whether or not the box would clip.
 *
 * So a long string goes in, the box is measured, and the original text is put
 * back. A wrapping box grows downwards and never overflows horizontally; a
 * clipping box overflows by definition.
 */
async function clipsLongText(page: Page, elementId: string): Promise<boolean> {
  return page.evaluate((id) => {
    const node = document.getElementById(id);

    if (!node) return true;

    const original = node.textContent;

    node.textContent =
      "Uma mensagem de validação bastante longa, do tamanho que o servidor " +
      "realmente devolve quando explica por que o campo foi recusado e o que " +
      "a pessoa precisa corrigir para seguir adiante.";

    const clipped = node.scrollWidth - node.clientWidth > 2;

    node.textContent = original;

    return clipped;
  }, elementId);
}

/** Whether the message announces itself, rather than waiting to be found. */
async function announcesItself(
  page: Page,
  elementId: string,
): Promise<boolean> {
  return page.evaluate((id) => {
    const node = document.getElementById(id);

    if (!node) return false;

    const role = node.getAttribute("role");
    const live = node.getAttribute("aria-live");

    return role === "alert" || live === "assertive" || live === "polite";
  }, elementId);
}

test.describe.configure({ mode: "parallel" });

/**
 * The delivery form, because it is the one that exercises every shape of
 * control the shell has to serve: plain text inputs, masked inputs, a Radix
 * `<Select>` whose trigger is a button, and a combobox built out of a popover.
 * Those forward props in different ways, and a shell that works for an
 * `<input>` while silently dropping everything on a `asChild` button would
 * pass a test that only ever looked at text fields — hence the coverage
 * assertion at the end.
 */
const FORMS = [
  {
    name: "new delivery",
    path: "/dashboard/deliveries",
    openLabel: /nova entrega/i,
    submitLabel: /^criar entrega$/i,
  },
] as const;

for (const form of FORMS) {
  test(`${form.name}: an empty submit is announced, not just coloured`, async ({
    page,
  }) => {
    await open(page, form.path);

    const trigger = page.getByRole("button", { name: form.openLabel }).first();

    await expect(
      trigger,
      "o botão que abre o formulário não foi encontrado",
    ).toBeVisible({ timeout: 30_000 });

    await trigger.click();

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // Nothing filled in: the point is what the form says when it refuses.
    const submit = dialog
      .getByRole("button", { name: form.submitLabel })
      .first();

    await expect(submit).toBeVisible();
    await submit.click();

    // The refusal is a server action round-trip, so it is not instant.
    await expect
      .poll(async () => (await invalidFields(page)).length, {
        timeout: 20_000,
        message: "nenhum campo foi marcado como inválido",
      })
      .toBeGreaterThan(0);

    const fields = await invalidFields(page);

    for (const field of fields) {
      expect(field.id, "um campo inválido sem id").not.toBe("");

      expect(
        field.describedBy,
        `${field.id}: aria-invalid sem aria-describedby`,
      ).not.toBe("");

      expect(
        field.message,
        `${field.id}: aria-describedby aponta para nada legível`,
      ).not.toBe("");

      // The label must still say what the field is. Before the fix it said
      // what was wrong with it, and the field lost its name entirely.
      expect(
        field.labelText,
        `${field.id}: rótulo virou a mensagem de erro`,
      ).not.toBe(field.message);

      expect(field.labelText, `${field.id}: sem rótulo associado`).not.toBe("");

      expect(
        await clipsLongText(page, field.describedBy),
        `${field.id}: a mensagem é cortada e só um hover a completaria`,
      ).toBe(false);

      expect(
        await announcesItself(page, field.describedBy),
        `${field.id}: a mensagem não é anunciada, só existe`,
      ).toBe(true);
    }

    /*
      More than one kind of control, or the assertions above prove only that
      `<input>` works. The shell threads its attributes through a render prop
      precisely so a Radix trigger cannot be forgotten, and this is what says
      the threading actually arrived.
    */
    const kinds = new Set(fields.map((field) => field.tag));

    expect(
      kinds.size,
      `só um tipo de controle foi exercitado: ${[...kinds].join(", ")}`,
    ).toBeGreaterThan(1);
  });
}
