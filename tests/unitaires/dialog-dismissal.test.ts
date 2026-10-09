import { describe, expect, it } from "vitest";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

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
 * The refusal now lives in the primitive (decision 3.2): DialogContent and
 * DialogScrollContent block the outside click by default, and
 * `tests/unitaires/dialog-primitives.test.ts` proves it by rendering them. What
 * this scan still guards is the opt-out — `closeOnOutsideClick` exists for a
 * viewer, and a dialog holding what somebody typed must never use it.
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

    return {
      file: block.file,
      line: block.line,
      openingTag: block.openingTag,
      body,
    };
  });
}

/** Reads a source file, or null when there is none at that path. */
type ReadSource = (path: string) => string | null;

const readFromDisk: ReadSource = (path) => {
  try {
    return statSync(path).isFile() ? readFileSync(path, "utf8") : null;
  } catch {
    return null;
  }
};

/** The next top-level declaration after `from`: where a local component ends. */
const DECLARATION =
  /\n(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|function|interface|type|class|enum)\s/g;

/** The text of a component declared in the same file, or null. */
function localComponent(source: string, name: string): string | null {
  const start = new RegExp(
    `(?:^|\\n)(?:export\\s+)?(?:default\\s+)?(?:const|function)\\s+${name}\\b`,
  ).exec(source);

  if (!start) return null;

  DECLARATION.lastIndex = start.index + start[0].length;
  const next = DECLARATION.exec(source);

  return source.slice(start.index, next ? next.index : source.length);
}

/** The file a component is imported from, for relative and `@/` imports. */
function importedComponent(
  file: string,
  source: string,
  name: string,
  read: ReadSource,
): { path: string; source: string } | null {
  for (const match of source.matchAll(
    /import\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']/g,
  )) {
    if (match[1] || !new RegExp(`(^|[\\s{,])${name}([\\s},]|$)`).test(match[2]))
      continue;

    const specifier = match[3];
    const base = specifier.startsWith("@/")
      ? join(SOURCE, specifier.slice(2))
      : specifier.startsWith(".")
        ? resolve(dirname(file), specifier)
        : null;

    // A package (radix, lucide, next): not the product's own fields.
    if (!base) return null;

    for (const candidate of [
      `${base}.tsx`,
      `${base}.ts`,
      join(base, "index.tsx"),
      join(base, "index.ts"),
    ]) {
      const found = read(candidate);

      if (found !== null) return { path: candidate, source: found };
    }

    return null;
  }

  return null;
}

// The primitives: a Dialog's own header or a Button hold nothing typed.
const UI_PRIMITIVES = `${sep}components${sep}ui${sep}`;

/**
 * Whether a dialog body holds input, following the components it renders.
 *
 * Decision 8.7 merged each entity's /admin and /dashboard copies, and the
 * merged dialogs moved their fields into `*Fields` and `*FormSubmit`
 * components — declared beside the dialog or imported from the next file.
 * A scan of the body alone stopped seeing them, so the rule below stopped
 * asking them. Two levels reach every field the product has today.
 */
function holdsInput(
  file: string,
  source: string,
  body: string,
  read: ReadSource = readFromDisk,
  depth = 2,
  seen: Set<string> = new Set(),
): boolean {
  if (INPUTS.test(body)) return true;
  if (depth === 0) return false;

  for (const [, name] of body.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    const key = `${file}#${name}`;

    if (seen.has(key)) continue;
    seen.add(key);

    const local = localComponent(source, name);

    if (local !== null) {
      if (holdsInput(file, source, local, read, depth - 1, seen)) return true;
      continue;
    }

    const imported = importedComponent(file, source, name, read);

    if (!imported || imported.path.includes(UI_PRIMITIVES)) continue;

    if (
      holdsInput(
        imported.path,
        imported.source,
        imported.source,
        read,
        depth - 1,
        seen,
      )
    ) {
      return true;
    }
  }

  return false;
}

const ALL = tsxFiles(SOURCE).flatMap(dialogsIn);

const WITH_INPUT = ALL.filter((dialog) =>
  holdsInput(dialog.file, readFileSync(dialog.file, "utf8"), dialog.body),
);

describe("the scan itself", () => {
  it("found dialogs, and found the ones holding input", () => {
    // Without this, a matcher that stopped matching would make every
    // assertion below pass over an empty list — which is how a rule quietly
    // stops being a rule.
    expect(ALL.length).toBeGreaterThan(25);

    // A floor rather than `> 0`: the failure mode worth catching is the
    // count SHRINKING because a control moved behind a component this
    // pattern does not know. It covered 89 dialogs when written; merging the
    // /admin and /dashboard copies of each entity (decision 8.7) deleted the
    // duplicates on purpose. Recounted after the merges, following the
    // components each dialog renders: 46 (45 read in the body itself, plus
    // the avatar upload, whose file input sits in its FileUpload).
    expect(WITH_INPUT.length).toBeGreaterThanOrEqual(46);
  });

  it("sees a field the dialog renders through a component", () => {
    // Virtual files: the same shapes the merged dialogs have on disk.
    const files = new Map<string, string>([
      [
        join(SOURCE, "fixture/local.tsx"),
        [
          'const BillFields = () => <Input name="x" />;',
          "function Dialog() { return <DialogContent><BillFields /></DialogContent>; }",
        ].join("\n"),
      ],
      [
        join(SOURCE, "fixture/imported.tsx"),
        [
          'import { AvatarPicker } from "./avatar-picker";',
          "function Dialog() { return <DialogContent><AvatarPicker /></DialogContent>; }",
        ].join("\n"),
      ],
      [
        join(SOURCE, "fixture/avatar-picker/index.tsx"),
        'const AvatarPicker = () => <input type="file" />;',
      ],
      [
        join(SOURCE, "fixture/viewer.tsx"),
        [
          'const Photo = () => <img alt="" />;',
          "function Dialog() { return <DialogContent><Photo /></DialogContent>; }",
        ].join("\n"),
      ],
    ]);
    const read: ReadSource = (path) => files.get(path) ?? null;
    const bodyOf = (path: string) =>
      /<DialogContent>([\s\S]*)<\/DialogContent>/.exec(files.get(path)!)![1];
    const probe = (name: string) => {
      const path = join(SOURCE, `fixture/${name}.tsx`);
      return holdsInput(path, files.get(path)!, bodyOf(path), read);
    };

    expect(probe("local"), "campo declarado ao lado do diálogo").toBe(true);
    expect(probe("imported"), "campo importado de outro arquivo").toBe(true);
    expect(probe("viewer"), "visualizador sem campo").toBe(false);
  });
});

describe("a dialog holding something the user typed", () => {
  it.each(
    WITH_INPUT.map(
      (dialog) =>
        [
          `${relative(SOURCE, dialog.file).split("\\").join("/")}:${dialog.line}`,
          dialog,
        ] as const,
    ),
  )("%s does not close on an outside click", (_name, dialog) => {
    expect(
      /closeOnOutsideClick(?!\s*=\s*\{\s*false\s*\})/.test(dialog.openingTag),
      "remova closeOnOutsideClick — um clique ao lado apaga o que a pessoa " +
        "digitou, sem aviso e sem desfazer; ESC, o X e Cancelar continuam fechando",
    ).toBe(false);
  });
});

/**
 * "Voltar" is not a word for "Cancelar".
 *
 * They look interchangeable and they are the opposite of interchangeable. In a
 * dialog with one step, Voltar promises a previous screen that does not exist,
 * so the person presses it expecting to go back and instead loses what they
 * were doing — and, worse, they press it BELIEVING nothing was discarded,
 * because going back is not a destructive word. Cancelar says what actually
 * happens.
 *
 * It is only right where there is somewhere to go back TO: a multi-step flow,
 * where the previous step is on screen a second later with its answers intact.
 *
 * So the rule is not "never Voltar" — it is "Voltar only next to Avançar".
 * Zero dialogs break it today; this is what keeps the next one from being
 * written, because the mistake is a very natural one to make.
 */
const STEP_FORWARD = /(Avançar|Próximo|Continuar|Concluir|step|Step)/;

const WITH_BACK = ALL.filter((dialog) =>
  />\s*Voltar\s*<|name="Voltar"|label="Voltar"|title="Voltar"/.test(
    dialog.body,
  ),
);

describe("a dialog that offers Voltar", () => {
  it("is always multi-step, or should not say Voltar", () => {
    const wrong = WITH_BACK.filter(
      (dialog) => !STEP_FORWARD.test(dialog.body),
    ).map(
      (dialog) =>
        `${relative(SOURCE, dialog.file).split("\\").join("/")}:${dialog.line}`,
    );

    expect(
      wrong,
      "Voltar num diálogo de uma etapa promete uma tela anterior que não " +
        "existe: a pessoa aperta esperando voltar e perde o que estava " +
        "fazendo, acreditando que não perdeu. Use Cancelar.",
    ).toEqual([]);
  });
});
