import { describe, expect, it } from "vitest";

import { devicePrecheckView } from "@/features/deliveries/proof-audits/lib/device-precheck";
import {
  AI_STATE_LABELS,
  AI_STATE_NOTICES,
  aiStateOf,
} from "@/features/deliveries/proof-audits/lib/criteria";

/**
 * The driver's phone pre-check on the review card (decision 14.2; design
 * §P6.2): a provisional hint next to the server's reading, never a verdict.
 */
const precheck = {
  kind: "proof" as const,
  invoice_number_found: true,
  date_out_of_window: false,
  typed_mileage_found: null,
  outcome: "ok" as const,
  driver_overrode: false,
};

describe("devicePrecheckView", () => {
  it("says the number was found, provisional while the server reads", () => {
    expect(
      devicePrecheckView({
        device_precheck: precheck,
        aiState: "device_provisional",
      }),
    ).toEqual({
      summary:
        "Pré-checagem do celular: NF encontrada na foto (provisória, aguardando a leitura do servidor).",
      details: [],
      provisional: true,
      agreement: null,
    });
  });

  it("says the driver sent it anyway after the warning, and the date outside the day", () => {
    const view = devicePrecheckView({
      device_precheck: {
        ...precheck,
        invoice_number_found: false,
        date_out_of_window: true,
        outcome: "warned",
        driver_overrode: true,
      },
      aiState: "read",
      deviceAgreement: "AGREE",
    });

    expect(view?.summary).toBe(
      "Pré-checagem do celular: NF não encontrada na foto.",
    );
    expect(view?.details).toEqual([
      "A data legível na foto está fora do dia da entrega.",
      "O motorista foi avisado e enviou mesmo assim.",
    ]);
    expect(view?.provisional).toBe(false);
    expect(view?.agreement).toBe(
      "A leitura do servidor confirmou a pré-checagem do celular.",
    );
  });

  it("names a disagreement and a check that could not read", () => {
    expect(
      devicePrecheckView({
        device_precheck: precheck,
        deviceAgreement: "DISAGREE",
      })?.agreement,
    ).toBe(
      "A leitura do servidor discorda da pré-checagem do celular. Confira a foto.",
    );

    expect(
      devicePrecheckView({
        device_precheck: {
          ...precheck,
          outcome: "error",
          date_out_of_window: true,
        },
      }),
    ).toMatchObject({
      summary: "Pré-checagem do celular: o celular não conseguiu ler a foto.",
      details: [],
    });
  });

  it("shows nothing without a receipt pre-check, or with an odd value", () => {
    expect(devicePrecheckView({})).toBeNull();
    expect(devicePrecheckView({ device_precheck: null })).toBeNull();
    expect(
      devicePrecheckView({
        device_precheck: { ...precheck, kind: "odometer" },
      }),
    ).toBeNull();
    expect(devicePrecheckView({ device_precheck: "ok" })).toBeNull();
    expect(
      devicePrecheckView({
        device_precheck: precheck,
        deviceAgreement: "MAYBE",
      })?.agreement,
    ).toBeNull();
  });
});

describe("the card's state with a pre-check", () => {
  it("knows the provisional state instead of falling back to 'sem leitura'", () => {
    expect(
      aiStateOf({ ai_suggestion: null, aiState: "device_provisional" }),
    ).toBe("device_provisional");
    expect(AI_STATE_LABELS.device_provisional).toBe("Pré-checagem do celular");
    expect(AI_STATE_NOTICES.device_provisional).toMatch(/celular do motorista/);
  });
});
