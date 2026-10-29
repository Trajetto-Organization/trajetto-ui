import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Which DatePickerField holds a civil day and which holds a fleet instant.
 *
 * A DATE-ONLY value (decision 1.3) is stored as midnight UTC and sent as
 * "YYYY-MM-DD": without `dateOnly` the field sends the browser's midnight as
 * an instant, and the API stores the day before for anyone west of UTC. A
 * fleet record's day is the opposite: the API keeps an instant (its time of
 * day orders the odometer history) and reads it with the picked-day rule, so
 * `dateOnly` there would pin every record to 00:00 UTC.
 *
 * Every field is listed on one side by its file AND the form field it posts.
 * A bare field name is not enough: a generic one ("date", "from") means a
 * civil day in one form and an instant in another, and a global verdict on
 * it would push the next author to drop a correct `dateOnly`, or to rename a
 * field only to get past this check. A new DatePickerField, or one that
 * moved, fails here until someone decides which it is.
 */
const SOURCE = resolve(__dirname, "../../src");

type Kind = "civil-day" | "instant";

const FIELDS: ReadonlyMap<string, Kind> = new Map<string, Kind>([
  // Civil days: @db.Date columns and the day keys the API takes as such.
  [
    "features/deliveries/deliveries/form-dialog/index.tsx:scheduled_date",
    "civil-day",
  ], // Delivery (@db.Date)
  ["features/routes/form-dialog/submit.tsx:scheduled_date", "civil-day"], // Route (@db.Date)
  [
    "features/routes/detail-page/add-deliveries-sheet.tsx:picker-range-from",
    "civil-day",
  ], // the picker's Delivery.scheduled_date range (decision 14.7)
  [
    "features/routes/detail-page/add-deliveries-sheet.tsx:picker-range-to",
    "civil-day",
  ],
  [
    "features/deliveries/deliveries/import-xml-dialog/index.tsx:import_scheduled_date",
    "civil-day",
  ], // the XML's deliveries
  ["features/driver/form-dialog/index.tsx:cnh_expires_at", "civil-day"], // Driver (@db.Date)
  ["features/driver/form-dialog/index.tsx:birth_date", "civil-day"], // an age, not a moment
  ["features/account-payable/form-dialog/index.tsx:due_date", "civil-day"],
  ["features/account-payable/form-dialog/index.tsx:payment_date", "civil-day"],
  ["features/fine/form-dialog/details.tsx:violation_date", "civil-day"],
  ["features/fine/form-dialog/details.tsx:due_date", "civil-day"],
  ["features/fine/form-dialog/details.tsx:payment_date", "civil-day"],
  // Pausas' period is no DatePickerField since 28/10/2026: the shared range
  // picker, which only speaks civil days (date-range-picker.test.ts).
  [
    "features/deliveries/occurrence-types/form-builder/answer-fields.tsx:occurrence_answer_date",
    "civil-day",
  ], // an occurrence form's date answer, "AAAA-MM-DD" (decision 6.2)

  // Fleet instants read by the picked-day rule, and the kanban due moment.
  ["features/fuel/form/fuel-fields.tsx:refueling_date", "instant"],
  [
    "features/vehicle-checklist/create-form/submit.tsx:checklist_date",
    "instant",
  ],
  [
    "features/vehicle-checklist/update-form/submit.tsx:checklist_date",
    "instant",
  ],
  ["features/vehicle/form-dialog/fields.tsx:acquisition_date", "instant"],
  ["features/vehicle/form-dialog/fields.tsx:last_maintenance_date", "instant"],
  ["features/service-order/create-form/submit.tsx:date", "instant"],
  ["features/service-order/create-form/submit.tsx:completion_date", "instant"],
  ["features/service-order/update-form/submit.tsx:date", "instant"],
  ["features/service-order/update-form/submit.tsx:completion_date", "instant"],
  [
    "app/(protected)/_components/kanban/card/card-modal/index.tsx:dueDate",
    "instant",
  ], // compared with now for "atrasado"
]);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return tsxFiles(path);

    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

/** The opening tag from `start`, skipping strings and `{…}` expressions. */
function openingTag(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`")
      quote = character;
    else if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    else if (character === ">" && depth === 0)
      return source.slice(start, index + 1);
  }

  return source.slice(start);
}

interface Usage {
  /** src-relative file and field: the key of FIELDS. */
  key: string;
  line: number;
  dateOnly: boolean;
}

function usagesIn(file: string, source: string): Usage[] {
  return [...source.matchAll(/<DatePickerField\b/g)].map((match) => {
    const tag = openingTag(source, match.index!);
    const name =
      /\bname="([^"]+)"/.exec(tag)?.[1] ??
      /\bhtmlfor="([^"]+)"/.exec(tag)?.[1] ??
      "?";

    return {
      key: `${file}:${name}`,
      line: source.slice(0, match.index).split("\n").length,
      dateOnly: /\bdateOnly\b(?!\s*=\s*\{\s*false\s*\})/.test(tag),
    };
  });
}

/** The three verdicts, each a list of `file:field (line N)`. */
function classify(usages: Usage[], fields: ReadonlyMap<string, Kind>) {
  const where = ({ key, line }: Usage) => `${key} (linha ${line})`;

  return {
    unknown: usages.filter(({ key }) => !fields.has(key)).map(where),
    missingDateOnly: usages
      .filter(
        ({ key, dateOnly }) => fields.get(key) === "civil-day" && !dateOnly,
      )
      .map(where),
    dateOnlyOnInstant: usages
      .filter(({ key, dateOnly }) => fields.get(key) === "instant" && dateOnly)
      .map(where),
  };
}

const usages: Usage[] = tsxFiles(SOURCE).flatMap((path) =>
  usagesIn(
    relative(SOURCE, path).replace(/\\/g, "/"),
    readFileSync(path, "utf8"),
  ),
);

const verdict = classify(usages, FIELDS);

describe("the product's date fields", () => {
  it("are found", () => {
    expect(usages.length).toBeGreaterThan(15);
  });

  it("are all classified as civil day or instant", () => {
    expect(
      verdict.unknown,
      "decida: dia civil (dateOnly) ou instante da frota",
    ).toEqual([]);
  });

  it("mark dateOnly on every value that is only a day", () => {
    expect(verdict.missingDateOnly).toEqual([]);
  });

  it("do not mark dateOnly on a fleet instant", () => {
    expect(verdict.dateOnlyOnInstant).toEqual([]);
  });

  it("do not leave a list entry without a matching field", () => {
    const found = new Set(usages.map(({ key }) => key));

    expect([...FIELDS.keys()].filter((key) => !found.has(key))).toEqual([]);
  });
});

describe("the classification", () => {
  it("is by file and field, not only by name", () => {
    // A new civil-day form whose field is called "date", done right. With
    // a global "date = instant" it read as a wrong dateOnly; now it only
    // waits for a decision.
    const planted = usagesIn(
      "features/novo/form-dialog/index.tsx",
      '<DatePickerField name="date" label="Data *" dateOnly />',
    );
    const result = classify(planted, FIELDS);

    expect(result.dateOnlyOnInstant).toEqual([]);
    expect(result.unknown).toEqual([
      "features/novo/form-dialog/index.tsx:date (linha 1)",
    ]);
  });

  it("enforces the right side of a field already decided", () => {
    const serviceOrderWithDateOnly = usagesIn(
      "features/service-order/create-form/submit.tsx",
      '<DatePickerField name="date" dateOnly />',
    );
    const routeWithoutDateOnly = usagesIn(
      "features/routes/form-dialog/submit.tsx",
      '<DatePickerField name="scheduled_date" />',
    );
    const result = classify(
      [...serviceOrderWithDateOnly, ...routeWithoutDateOnly],
      FIELDS,
    );

    expect(result.dateOnlyOnInstant).toEqual([
      "features/service-order/create-form/submit.tsx:date (linha 1)",
    ]);
    expect(result.missingDateOnly).toEqual([
      "features/routes/form-dialog/submit.tsx:scheduled_date (linha 1)",
    ]);
  });
});
