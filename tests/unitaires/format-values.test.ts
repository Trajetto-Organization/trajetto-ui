import { describe, expect, it } from "vitest";

import {
  applyMask,
  emptyStringToNull,
  formatCep,
  formatCnpj,
  formatCpf,
  formatPhoneNumber,
  formatTelephone,
  formatToBrazilianCurrency,
  hasConsecutiveSpaces,
  hasSpaceAtEdges,
  isEmptyOrWhitespace,
  isValidDateString,
  parseCurrencyToNumber,
  stringToBoolean,
} from "@/lib/format-values";

/**
 * The four hundred lines every screen in the product goes through.
 *
 * Money, documents, plates and phone numbers are what a dispatcher reads all
 * day and what ends up in an export that goes to an accountant. None of it had
 * a test, and none of it fails loudly: a currency parser that drops a thousands
 * separator turns R$ 1.234,50 into R$ 1,23, and the screen shows a perfectly
 * formatted wrong number.
 *
 * The parsing half is the dangerous one. Brazilian money uses the separators
 * the other way round from the ones `parseFloat` understands, so every value
 * that reaches the API goes through a conversion whose failure mode is a
 * plausible number rather than an error.
 */
describe("reading money a person typed", () => {
  it("understands the Brazilian order of separators", () => {
    // The one that matters: dot groups thousands, comma opens the cents. Read
    // the other way round this is 1.23, which is a number nobody would query.
    expect(parseCurrencyToNumber("1.234,50")).toBe(1234.5);
    expect(parseCurrencyToNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("copes with the symbol and the spaces around it", () => {
    expect(parseCurrencyToNumber("R$ 1.234,50")).toBe(1234.5);
    expect(parseCurrencyToNumber("R$1.234,50")).toBe(1234.5);
  });

  it("takes a number back unchanged", () => {
    expect(parseCurrencyToNumber(1234.5)).toBe(1234.5);
    expect(parseCurrencyToNumber(0)).toBe(0);
  });

  it("says nothing for nothing", () => {
    // Undefined and zero are different answers: one means "not filled in" and
    // the other means "free of charge".
    expect(parseCurrencyToNumber("")).toBeUndefined();
    expect(parseCurrencyToNumber(null)).toBeUndefined();
    expect(parseCurrencyToNumber(undefined)).toBeUndefined();
  });

  it("reads the last comma as the decimal when somebody types two", () => {
    // A slip on the keyboard. The last comma is taken as the cents separator
    // and the earlier ones as grouping, which is the reading that matches
    // what the person was trying to type — and beats NaN on a form they then
    // cannot submit.
    expect(parseCurrencyToNumber("1,234,50")).toBe(1234.5);
  });

  it("answers zero rather than NaN for something unreadable", () => {
    // NaN escapes into a request body as null and the API refuses with a
    // message about a field the person did fill in.
    expect(parseCurrencyToNumber("abc")).toBe(0);
  });
});

describe("writing money back out", () => {
  it("uses the Brazilian shape", () => {
    const formatted = formatToBrazilianCurrency(1234.5);

    expect(formatted).toContain("1.234,50");
    expect(formatted).toContain("R$");
  });

  it("always shows the cents", () => {
    // A row reading "R$ 1.234" next to one reading "R$ 1.234,50" looks like
    // two different precisions of the same thing.
    expect(formatToBrazilianCurrency(1234)).toContain(",00");
  });

  it("survives a round trip", () => {
    const original = 9876.54;

    expect(parseCurrencyToNumber(formatToBrazilianCurrency(original))).toBe(
      original,
    );
  });
});

describe("Brazilian documents", () => {
  it("punctuates a CPF", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
  });

  it("punctuates a CNPJ", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("punctuates a CEP", () => {
    expect(formatCep("01001000")).toBe("01001-000");
  });

  it("leaves a wrong-length value alone rather than inventing punctuation", () => {
    // Half-formatting a malformed document hides the fact that it is
    // malformed, and the person never fixes it.
    expect(formatCnpj("112223330001")).toBe("112223330001");
    expect(formatCep("0100100")).toBe("0100100");
  });

  it("does not quietly trim a value that is too LONG", () => {
    /**
     * The end anchor is the half that is easy to lose.
     *
     * Too-short is caught either way — the pattern simply does not match. Too
     * long is not: without the `$`, fifteen digits match on the first
     * fourteen and come out looking like a perfectly punctuated CNPJ with the
     * last digit gone, which is worse than showing the mess as it is.
     */
    expect(formatCnpj("112223330001815")).toBe("112223330001815");
    expect(formatCep("010010000")).toBe("010010000");
  });

  it("answers empty for nothing", () => {
    expect(formatCnpj(null)).toBe("");
    expect(formatCnpj(undefined)).toBe("");
    expect(formatCep(null)).toBe("");
  });
});

describe("phone numbers", () => {
  it("formats a mobile", () => {
    expect(formatPhoneNumber("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats a landline", () => {
    // Eleven digits and ten digits break differently; one rule for both puts
    // the dash in the wrong place on every landline in the database.
    expect(formatPhoneNumber("1133334444")).toBe("(11) 3333-4444");
  });

  it("strips whatever punctuation came from the database", () => {
    expect(formatPhoneNumber("(11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhoneNumber("11 98765 4321")).toBe("(11) 98765-4321");
  });

  it("leaves a number carrying the country code exactly as stored", () => {
    // Thirteen digits is outside what the column holds — the API stores ten
    // or eleven — so this is the "I do not recognise this" path rather than a
    // format. Reshaping it would mean guessing which two digits to drop.
    expect(formatPhoneNumber("+55 11 98765 4321")).toBe("+55 11 98765 4321");
  });

  it("says N/A rather than showing an empty gap", () => {
    expect(formatPhoneNumber(null)).toBe("N/A");
    expect(formatPhoneNumber("   ")).toBe("N/A");
  });

  it("hands back anything it does not recognise, unchanged", () => {
    // Better a number that looks odd than a number silently reshaped into
    // something that is not what the carrier stored.
    expect(formatPhoneNumber("123")).toBe("123");
  });

  it("writes the international form for a stored telephone", () => {
    expect(formatTelephone("11987654321")).toBe("+55 (11) 98765-4321");
    expect(formatTelephone("1133334444")).toBe("+55 (11) 3333-4444");
  });
});

describe("applying a mask", () => {
  it("fills the pattern with the digits it is given", () => {
    // The placeholder is `9`, which is what every caller passes.
    expect(applyMask("12345678901", "999.999.999-99")).toBe("123.456.789-01");
  });

  it("stops when the digits run out instead of leaving loose punctuation", () => {
    /**
     * This one found a real defect rather than confirming one.
     *
     * The loop used to walk the whole mask regardless, so anything shorter
     * kept collecting the literal characters after the last digit: a
     * half-typed CPF came out as `123..-`, and an eight-digit RG — a normal
     * length, the issuing state decides — was pre-filled into the edit form
     * as `12.345.678-`, complete with a dash the person never typed.
     */
    expect(applyMask("123", "999.999.999-99")).toBe("123");
    expect(applyMask("1234", "999.999.999-99")).toBe("123.4");
    expect(applyMask("12345678", "99.999.999-9")).toBe("12.345.678");
  });

  it("still punctuates a value that fills the mask", () => {
    expect(applyMask("123456789", "99.999.999-9")).toBe("12.345.678-9");
  });

  it("ignores everything that is not a digit", () => {
    expect(applyMask("abc123", "999-999")).toBe("123");
  });

  it("answers empty for nothing", () => {
    expect(applyMask("", "999.999.999-99")).toBe("");
  });
});

describe("the small guards a form leans on", () => {
  it("catches a space at either edge", () => {
    expect(hasSpaceAtEdges(" nome")).toBe(true);
    expect(hasSpaceAtEdges("nome ")).toBe(true);
    expect(hasSpaceAtEdges("nome")).toBe(false);
  });

  it("catches a double space in the middle", () => {
    expect(hasConsecutiveSpaces("João  Silva")).toBe(true);
    expect(hasConsecutiveSpaces("João Silva")).toBe(false);
  });

  it("treats whitespace as empty", () => {
    // A name of three spaces passes `required` and reaches the database as a
    // row nobody can find again.
    expect(isEmptyOrWhitespace("   ")).toBe(true);
    expect(isEmptyOrWhitespace("")).toBe(true);
    expect(isEmptyOrWhitespace("a")).toBe(false);
  });

  it("turns an empty string into null for the API", () => {
    expect(emptyStringToNull("")).toBeNull();
    expect(emptyStringToNull("valor")).toBe("valor");
  });

  it("reads a checkbox that arrives as text", () => {
    expect(stringToBoolean("true")).toBe(true);
    expect(stringToBoolean("false")).toBe(false);
    expect(stringToBoolean(true)).toBe(true);
    expect(stringToBoolean(false)).toBe(false);
  });

  it("rejects a date that is not one", () => {
    expect(isValidDateString("2026-09-15")).toBe(true);
    expect(isValidDateString("nao-e-data")).toBe(false);
  });
});
