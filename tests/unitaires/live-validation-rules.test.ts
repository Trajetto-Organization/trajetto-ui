import { describe, expect, it } from "vitest";

import { createUserSchema } from "@/schemas/create-user-schema";
import { updateUserSchema } from "@/schemas/update-user-schema";
import { validateLoginUserFormSchema } from "@/schemas/login-schema";
import { validateForgotFormSchema } from "@/schemas/forgot-password-schema";
import { validateResetUserPasswordFormSchema } from "@/schemas/reset-password-schema";

import { checklistMileageIssue } from "@/features/vehicle-checklist/lib/mileage-rule";
import {
  CHECKLIST_ANSWER_FIELDS,
  CHECKLIST_FORM_FIELDS,
  checklistPhotoIssues,
  photoFieldKey,
} from "@/features/vehicle-checklist/lib/live-rules";

/**
 * The rules behind live validation (decision 16.700) that the client and the
 * server action share — the schemas — and the ones only the client can
 * apply from data already on screen: the checklist's mileage and photos.
 */

const messageOf = (
  result: {
    success: boolean;
    error?: { flatten: () => { fieldErrors: Record<string, string[]> } };
  },
  field: string,
) =>
  result.success ? undefined : result.error!.flatten().fieldErrors[field]?.[0];

describe("the user schemas, shared by the dialog and its action", () => {
  const base = {
    email: "ana@trajetto.com.br",
    role: "BUSINESS_ADMIN",
    businessId: "b1",
  };

  it.each([
    ["create", createUserSchema, base],
    ["update", updateUserSchema, { ...base, sendPasswordSetupLink: "false" }],
  ] as const)(
    "%s: an empty or spaces-only name is missing, not a spacing mistake",
    (_label, schema, values) => {
      // Red before: "" read "insira o nome de usuário completo" and "   "
      // read "não deve conter espaços consecutivos".
      expect(messageOf(schema.safeParse({ ...values, name: "" }), "name")).toBe(
        "O nome é obrigatório.",
      );
      expect(
        messageOf(schema.safeParse({ ...values, name: "   " }), "name"),
      ).toBe("O nome é obrigatório.");
      expect(
        messageOf(schema.safeParse({ ...values, name: "Ana  Souza" }), "name"),
      ).toBe("O nome de usuário não deve conter espaços consecutivos.");
    },
  );

  it.each([
    ["create", createUserSchema],
    ["update", updateUserSchema],
  ] as const)(
    "%s: an unchosen level asks for one; a forged value is still invalid",
    (_label, schema) => {
      // Red before: an empty select read "Nível de acesso do usuário inválido."
      expect(
        messageOf(
          schema.safeParse({ ...base, name: "Ana Souza", role: "" }),
          "role",
        ),
      ).toBe("Selecione o nível de acesso.");
      expect(
        messageOf(
          schema.safeParse({ ...base, name: "Ana Souza", role: "ROOT" }),
          "role",
        ),
      ).toBe("Nível de acesso do usuário inválido.");
    },
  );

  it("trims the e-mail before checking it, and the action sends it trimmed", () => {
    // Red before: a trailing space made the address "não é válido".
    const parsed = createUserSchema.safeParse({
      ...base,
      name: "Ana Souza",
      email: " ana@trajetto.com.br ",
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.email).toBe("ana@trajetto.com.br");
  });
});

describe("the auth schemas", () => {
  it("login: trims the e-mail, and an empty one is missing", () => {
    expect(
      validateLoginUserFormSchema.safeParse({
        email: "ana@trajetto.com.br ",
        password: "segredo1",
      }).success,
    ).toBe(true);
    expect(
      messageOf(
        validateLoginUserFormSchema.safeParse({
          email: "   ",
          password: "segredo1",
        }),
        "email",
      ),
    ).toBe("O e-mail é obrigatório.");
  });

  it("forgot password: a malformed address is not called missing", () => {
    // Red before: every failure read "O e-mail é obrigatório".
    expect(
      messageOf(validateForgotFormSchema.safeParse({ email: "ana@" }), "email"),
    ).toBe("O e-mail informado não é válido.");
    expect(
      messageOf(validateForgotFormSchema.safeParse({ email: "" }), "email"),
    ).toBe("O e-mail é obrigatório.");
  });

  it("reset password: an empty confirmation asks for it instead of passing or reading as a mismatch", () => {
    // Red before: two empty fields "matched" (no message on the confirmation).
    expect(
      messageOf(
        validateResetUserPasswordFormSchema.safeParse({
          password: "",
          confirm_password: "",
        }),
        "confirm_password",
      ),
    ).toBe("Confirme a nova senha.");
    expect(
      messageOf(
        validateResetUserPasswordFormSchema.safeParse({
          password: "segredo1",
          confirm_password: "segredo2",
        }),
        "confirm_password",
      ),
    ).toBe("As senhas não coincidem");
  });
});

describe("checklistMileageIssue", () => {
  const opened = new Date(2026, 9, 8, 15, 30).toISOString();
  const pickedToday = new Date(2026, 9, 8).toISOString();
  const lastWeek = new Date(2026, 9, 1).toISOString();
  const base = {
    checklistDate: opened,
    defaultDate: opened,
    vehicleMileage: 50_000,
  };

  it("refuses a reading at or below the vehicle's while the date is the untouched default, in the API's terms", () => {
    expect(checklistMileageIssue({ ...base, mileage: 50_000 })).toBe(
      "A quilometragem deve ser maior que a atual do veículo (50.000 km).",
    );
    expect(checklistMileageIssue({ ...base, mileage: 50_001 })).toBeNull();
  });

  it("says nothing once a date is picked, today included, since it may fit before a reading taken this morning", () => {
    expect(
      checklistMileageIssue({
        ...base,
        mileage: 40_000,
        checklistDate: pickedToday,
      }),
    ).toBeNull();
    expect(
      checklistMileageIssue({
        ...base,
        mileage: 40_000,
        checklistDate: lastWeek,
      }),
    ).toBeNull();
  });

  it("says nothing when the form did not default the date (a restored draft)", () => {
    expect(
      checklistMileageIssue({ ...base, mileage: 40_000, defaultDate: null }),
    ).toBeNull();
  });

  it("says nothing while the vehicle is loading or the field is empty (the schema speaks)", () => {
    expect(
      checklistMileageIssue({
        ...base,
        mileage: 40_000,
        vehicleMileage: undefined,
      }),
    ).toBeNull();
    expect(checklistMileageIssue({ ...base, mileage: undefined })).toBeNull();
  });

  it("reads a string mileage", () => {
    expect(checklistMileageIssue({ ...base, mileage: "40000" })).toMatch(
      /maior que a atual/,
    );
  });
});

describe("checklistPhotoIssues", () => {
  it("always asks the three legal photos, answered or not", () => {
    const issues = checklistPhotoIssues({}, {});

    expect(issues[photoFieldKey("current_mileage")]).toBe(
      "Adicione ao menos uma foto.",
    );
    expect(issues[photoFieldKey("tires_condition")]).toBe(
      "Adicione ao menos uma foto.",
    );
    expect(issues[photoFieldKey("fuel_level_adequate")]).toBe(
      "Adicione ao menos uma foto.",
    );
  });

  it("asks a conditional photo only once its answer says something is wrong", () => {
    expect(
      checklistPhotoIssues({}, {})[photoFieldKey("brakes_working")],
    ).toBeNull();
    expect(
      checklistPhotoIssues({ brakes_working: false }, {})[
        photoFieldKey("brakes_working")
      ],
    ).toBe("Adicione ao menos uma foto.");
    expect(
      checklistPhotoIssues({ brakes_working: true }, {})[
        photoFieldKey("brakes_working")
      ],
    ).toBeNull();
  });

  it("is satisfied by an attached file", () => {
    const file = new File(["x"], "odometro.jpg", { type: "image/jpeg" });

    expect(
      checklistPhotoIssues({}, { current_mileage: [file] })[
        photoFieldKey("current_mileage")
      ],
    ).toBeNull();
  });

  it("lists the answers in form order, without the photos for the edit", () => {
    expect(CHECKLIST_FORM_FIELDS.slice(0, 3)).toEqual([
      "checklist_date",
      "current_mileage",
      "photo:current_mileage",
    ]);
    expect(
      CHECKLIST_ANSWER_FIELDS.some((field) => field.startsWith("photo:")),
    ).toBe(false);
    expect(CHECKLIST_ANSWER_FIELDS).toContain("notes");
  });
});
