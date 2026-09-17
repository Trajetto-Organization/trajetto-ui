import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

/**
 * A modal that holds what somebody typed must not vanish when they click beside
 * it.
 *
 * Radix closes a Dialog on an outside click by default. Eighty-two of this
 * product's dialogs turn that off; the ones written most recently — the whole
 * `features/` generation — did not, so a half-written broadcast, a webhook
 * being configured, an API key's scopes and a spreadsheet import mid-mapping
 * all disappeared to a stray click on the page behind. There is no undo and no
 * warning: the panel is simply gone, with everything in it.
 *
 * ESC and the X still close, because those are deliberate. An outside click is
 * the one gesture nobody makes on purpose.
 *
 * Checked against the source rather than a browser because the property is
 * about EVERY dialog in the product, including the ones nobody has written a
 * screen test for. Rendering forty modals to ask them one question each would
 * cost minutes and still miss the forty-first; this is the question, asked of
 * all of them, in milliseconds.
 */
const SOURCE = resolve(__dirname, "../../src");

const OPENERS = ["<DialogContent", "<DialogScrollContent"];

/**
 * Controls that mean the dialog is holding something a person produced.
 *
 * The product's own field components are in the list beside the native ones,
 * and that is not belt and braces: pulling the two import dialogs' file inputs
 * into a shared `FileDropzone` quietly took both of them OUT of this rule —
 * the `<input type="file">` was no longer in their source, so a scan that knew
 * only about native elements stopped asking them the question. The dialogs had
 * not become safer; the test had gone blind.
 */
const INPUTS =
  /<(Input|Textarea|Select|Checkbox|Switch|RadioGroup|FormInput|FieldShell|Combobox|InputOTP|FileDropzone|DatePickerField|ShipperSelector|PhotoUpload|form\b)|type="file"/;

interface DialogBlock {
  file: string;
  line: number;
  openingTag: string;
  body: string;
}

function tsxFiles(directory: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      found.push(...tsxFiles(path));
      continue;
    }

    if (path.endsWith(".tsx")) found.push(path);
  }

  return found;
}

/** Where the opening tag ends, skipping over strings and `{...}` expressions. */
function endOfOpeningTag(source: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    else if (character === ">" && depth === 0) return index;
  }

  return -1;
}

/**
 * Every dialog body in a file, with nested dialogs cut out of their parent.
 *
 * The nesting is not hypothetical: the delivery detail panel opens a
 * full-screen image viewer inside itself. The viewer holds nothing and needs
 * no guard; the panel around it changes a delivery's status and does.
 */
function dialogsIn(file: string): DialogBlock[] {
  const source = readFileSync(file, "utf8");

  const events: { at: number; name: string; opening: boolean }[] = [];

  for (const opener of OPENERS) {
    const name = opener.slice(1);

    let at = source.indexOf(opener);

    while (at !== -1) {
      // `<DialogContent` is a prefix of nothing else, but `AlertDialogContent`
      // ends with it — and an AlertDialog already refuses an outside click.
      const before = source[at - 1];

      if (before !== "t" && before !== "r") {
        const next = source[at + opener.length];

        // Guard against `<DialogContentSomethingElse`.
        if (next === " " || next === ">" || next === "\n" || next === "\r") {
          events.push({ at, name, opening: true });
        }
      }

      at = source.indexOf(opener, at + 1);
    }

    let close = source.indexOf(`</${name}>`);

    while (close !== -1) {
      events.push({ at: close, name, opening: false });
      close = source.indexOf(`</${name}>`, close + 1);
    }
  }

  events.sort((a, b) => a.at - b.at);

  const stack: { name: string; at: number; bodyFrom: number }[] = [];
  const blocks: (DialogBlock & { from: number; to: number })[] = [];

  for (const event of events) {
    if (event.opening) {
      const tagEnd = endOfOpeningTag(source, event.at);

      stack.push({ name: event.name, at: event.at, bodyFrom: tagEnd + 1 });
      continue;
    }

    const open = stack.pop();

    // A close with no open means the scan lost track; better to know than to
    // silently measure the wrong span.
    expect(open?.name, `${file}: </${event.name}> sem abertura`).toBe(
      event.name,
    );

    blocks.push({
      file,
      line: source.slice(0, open!.at).split("\n").length,
      openingTag: source.slice(open!.at, open!.bodyFrom),
      body: source.slice(open!.bodyFrom, event.at),
      from: open!.at,
      to: event.at,
    });
  }

  // Remove each child's span from its parent's body.
  return blocks.map((block) => {
    let body = block.body;

    for (const other of blocks) {
      if (other === block) continue;

      if (other.from > block.from && other.to < block.to) {
        body = body.replace(
          block.body.slice(
            other.from - block.from - block.openingTag.length,
            other.to - block.from - block.openingTag.length,
          ),
          "",
        );
      }
    }

    return { file: block.file, line: block.line, openingTag: block.openingTag, body };
  });
}

const ALL = tsxFiles(SOURCE).flatMap(dialogsIn);

const WITH_INPUT = ALL.filter((dialog) => INPUTS.test(dialog.body));

describe("the scan itself", () => {
  it("found dialogs, and found the ones holding input", () => {
    // Without this, a matcher that stopped matching would make every
    // assertion below pass over an empty list — which is how a rule quietly
    // stops being a rule.
    expect(ALL.length).toBeGreaterThan(25);

    // A floor rather than `> 0`: the rule covered 89 dialogs when it was
    // written, and the failure mode worth catching is the count SHRINKING
    // because a control moved behind a component this pattern does not know.
    expect(WITH_INPUT.length).toBeGreaterThanOrEqual(89);
  });
});

describe("a dialog holding something the user typed", () => {
  it.each(
    WITH_INPUT.map((dialog) => [
      `${relative(SOURCE, dialog.file).split("\\").join("/")}:${dialog.line}`,
      dialog,
    ] as const),
  )("%s não fecha por clique fora", (_name, dialog) => {
    expect(
      dialog.openingTag.includes("onInteractOutside"),
      "adicione onInteractOutside={(event) => event.preventDefault()} — " +
        "um clique ao lado apaga o que a pessoa digitou, sem aviso e sem desfazer",
    ).toBe(true);
  });
});
