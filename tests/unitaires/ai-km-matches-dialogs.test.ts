import * as React from "react";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";

import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The refueling and checklist detail dialogs (ADR 0010 §5, design P6.2).
 *
 * The local OCR reader reads the km and cannot tell a photo of a screen from
 * a dashboard, so its "verified" only means the km read agrees with the km
 * typed: "Km confere", neutral, never the green "Verificado IA" seal. A
 * checklist with no photo the reader covers says so instead of "não
 * analisado", without an error icon.
 */
vi.hoisted(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
});

(globalThis as { React?: typeof React }).React = React;

vi.mock("@/app/(protected)/_components/shared/ai-verification", () => ({
  AIAnalysisProgressFallback: () => null,
  RequestAIVerificationButton: () => null,
}));

import { fraudUnassessed } from "@/lib/ai-confidence";
import {
  KM_MATCHES_NOTE,
  fuelDisplayStatus,
} from "@/app/(protected)/_components/shared/fuel-details-dialog/data";
import {
  NOT_COVERED_NOTE,
  checklistDisplayStatus,
} from "@/app/(protected)/_components/shared/checklist-details-dialog/data";
import { AIVerificationSection } from "@/app/(protected)/_components/shared/fuel-details-dialog/ai-verification-section";
import { ChecklistAIVerificationSection } from "@/app/(protected)/_components/shared/checklist-details-dialog/checklist-ai-verification-section";

let root: Root | null = null;

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

async function render(element: React.ReactElement): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);

  await act(async () => {
    root!.render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        element,
      ),
    );
  });

  return host;
}

describe("a reading without a fraud check", () => {
  it("is read off the stored details, string or object", () => {
    expect(fraudUnassessed({ fraudAssessed: false })).toBe(true);
    expect(fraudUnassessed(JSON.stringify({ fraudAssessed: false }))).toBe(
      true,
    );
    expect(fraudUnassessed({ confidence: 0.9 })).toBe(false);
    expect(fraudUnassessed(null)).toBe(false);
  });

  it("turns a refueling's 'verified' into 'Km confere', and nothing else", () => {
    expect(fuelDisplayStatus("verified", true)).toBe("km_matches");
    expect(fuelDisplayStatus("verified", false)).toBe("verified");
    expect(fuelDisplayStatus("mismatch", true)).toBe("mismatch");
    expect(fuelDisplayStatus(undefined, true)).toBeUndefined();
  });

  it("turns a checklist's 'verified' into 'Km confere'", () => {
    expect(
      checklistDisplayStatus("verified", {
        details: {
          current_mileage: { status: "confirmed", fraudAssessed: false },
        },
      }),
    ).toBe("km_matches");
    expect(
      checklistDisplayStatus("verified", {
        details: { current_mileage: { status: "confirmed" } },
      }),
    ).toBe("verified");
    expect(
      checklistDisplayStatus("verified", { liveFraudUnassessed: true }),
    ).toBe("km_matches");
  });

  it("says a checklist without a covered photo has no automatic reading", () => {
    expect(
      checklistDisplayStatus("skipped", {
        photosByField: { tires_condition: ["k1"] },
      }),
    ).toBe("not_covered");
    // An odometer photo was there: skipped for another reason (quota, no reader).
    expect(
      checklistDisplayStatus("skipped", {
        photosByField: { current_mileage: ["k1"] },
      }),
    ).toBe("skipped");
    // No photos to look at: say nothing new.
    expect(checklistDisplayStatus("skipped", { photosByField: null })).toBe(
      "skipped",
    );
  });
});

describe("the refueling dialog", () => {
  it("shows 'Km confere' with the reader's limit, never the seal", async () => {
    const host = await render(
      createElement(AIVerificationSection, {
        fuelData: {
          id: "f1",
          current_mileage: 150233,
          odometer_verified: false,
          odometer_photo: "k",
          odometer_ai_status: "verified",
          odometer_ai_reading: 150233,
          odometer_ai_details: { confidence: 0.9, fraudAssessed: false },
          odometer_ai_analyzed_at: null,
        } as never,
      }),
    );

    expect(host.textContent).toContain("Km confere");
    expect(host.textContent).not.toContain("Verificado IA");
    expect(host.textContent).toContain(KM_MATCHES_NOTE);
  });

  it("keeps the seal for a reading that judged fraud", async () => {
    const host = await render(
      createElement(AIVerificationSection, {
        fuelData: {
          id: "f2",
          current_mileage: 150233,
          odometer_verified: true,
          odometer_photo: "k",
          odometer_ai_status: "verified",
          odometer_ai_reading: 150233,
          odometer_ai_details: { confidence: 0.9 },
          odometer_ai_analyzed_at: null,
        } as never,
      }),
    );

    expect(host.textContent).toContain("Verificado IA");
  });
});

describe("the checklist dialog", () => {
  it("shows 'Km confere' when the km was read without a fraud check", async () => {
    const host = await render(
      createElement(ChecklistAIVerificationSection, {
        checklistData: {
          id: "c1",
          ai_verification_status: "verified",
          ai_verification_details: {
            current_mileage: { status: "confirmed", fraudAssessed: false },
          },
          photos_by_field: { current_mileage: ["k1"] },
          ai_verified_at: null,
        } as never,
      }),
    );

    expect(host.textContent).toContain("Km confere");
    expect(host.textContent).not.toContain("Verificado IA");
  });

  it("says there is no automatic reading for photos the reader does not cover", async () => {
    const host = await render(
      createElement(ChecklistAIVerificationSection, {
        checklistData: {
          id: "c2",
          ai_verification_status: "skipped",
          ai_verification_details: null,
          photos_by_field: { tires_condition: ["k1"] },
          ai_verified_at: null,
        } as never,
      }),
    );

    expect(host.textContent).toContain(NOT_COVERED_NOTE);
    expect(host.textContent).not.toContain("Não Analisado");
  });
});
