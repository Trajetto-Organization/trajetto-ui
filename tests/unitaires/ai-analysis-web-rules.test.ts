import { QueryClient } from "react-query";
import { describe, expect, it, vi } from "vitest";

import {
  AI_USAGE_CHANGED_EVENT,
  applyAIAnalysisChange,
  isAIAnalysisChangedEvent,
} from "@/lib/ai-analysis-sync";
import {
  confidencePercent,
  odometerDetails,
  readingLabel,
} from "@/lib/ai-confidence";
import {
  nextResetSentence,
  periodStartSentence,
  remainingSentence,
  usageRows,
} from "@/app/(protected)/_components/shared/limits/limits-content/lib/ai-usage-copy";
import { freshestUsage } from "@/store/ai-verification-store";

describe("the model's confidence on screen (AI-3)", () => {
  // Red before: the fuelling multiplied the 0–100 it got by 100 ("8500%").
  it("is one percentage whatever scale the record holds", () => {
    expect(confidencePercent(0.85)).toBe(85);
    expect(confidencePercent(85)).toBe(85);
    expect(confidencePercent(undefined)).toBeNull();
  });

  // Red before: the badge read `confidence`, the record held `confianca`.
  it("is read from a fuelling saved before and after the change", () => {
    expect(odometerDetails({ confidence: 0.9, details: "Verificado" })).toEqual(
      {
        confidence: 90,
        observation: "Verificado",
      },
    );
    expect(
      odometerDetails(JSON.stringify({ confianca: 70, observacao: "nítido" })),
    ).toEqual({ confidence: 70, observation: "nítido" });
  });

  it("names what the model saw and what was informed", () => {
    expect(readingLabel("needs_attention")).toBe("Requer atenção");
    expect(readingLabel("reserva")).toBe("Reserva");
    expect(readingLabel(150233, "km")).toBe("150.233 km");
    expect(readingLabel(false)).toBe("Não");
    expect(readingLabel(null)).toBeNull();
  });
});

describe("the end of an analysis heard by the company (AI-6)", () => {
  it("accepts only the hint it knows", () => {
    expect(
      isAIAnalysisChangedEvent({
        businessId: "b",
        recordType: "fuel",
        recordId: "r",
      }),
    ).toBe(true);
    expect(
      isAIAnalysisChangedEvent({
        businessId: "b",
        recordType: "x",
        recordId: "r",
      }),
    ).toBe(false);
    expect(isAIAnalysisChangedEvent(null)).toBe(false);
  });

  it("refetches the record's progress, and tells the usage card", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const heard: string[] = [];

    const listener = (event: Event) =>
      heard.push(
        (event as CustomEvent<{ businessId: string }>).detail.businessId,
      );

    window.addEventListener(AI_USAGE_CHANGED_EVENT, listener);

    await applyAIAnalysisChange(client, {
      businessId: "biz-1",
      recordType: "checklist",
      recordId: "chk-1",
    });

    window.removeEventListener(AI_USAGE_CHANGED_EVENT, listener);

    expect(invalidate).toHaveBeenCalledWith([
      "ai-analysis-progress",
      "checklist",
      "chk-1",
    ]);
    expect(heard).toEqual(["biz-1"]);
  });

  it("refetches the company's receipt queue for a proof", async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    await applyAIAnalysisChange(client, {
      businessId: "biz-1",
      recordType: "proof",
      recordId: "del-1",
    });

    expect(invalidate).toHaveBeenCalledWith(["proof_audit", "biz-1"]);
  });
});

describe("the quota card's words (AI-10, AI-15)", () => {
  it("counts photos, not 'verificações'", () => {
    expect(remainingSentence(100, 90, 5)).toBe(
      "5 fotos restantes neste período",
    );
    expect(remainingSentence(100, 99, 0)).toBe("1 foto restante neste período");
    expect(remainingSentence(100, 100, 0)).toBe(
      "Todas as fotos do período já foram usadas",
    );
    expect(remainingSentence(0, 0, 0)).toBe(
      "Verificação IA não habilitada para esta empresa",
    );
  });

  // Red before: the card listed nothing per kind and never named receipts.
  it("breaks the photos down by the company's modules", () => {
    const byType = { fuel: 2, checklist: 5, proof: 3 };

    expect(
      usageRows(byType, [
        { module: "FLEET", enabled: true },
        { module: "DELIVERIES", enabled: true },
      ]).map((row) => [row.label, row.count]),
    ).toEqual([
      ["Odômetros de abastecimentos", 2],
      ["Fotos de checklists", 5],
      ["Canhotos de entrega", 3],
    ]);

    expect(
      usageRows({ fuel: 0, checklist: 0, proof: 3 }, [
        { module: "DELIVERIES", enabled: true },
      ]).map((row) => row.key),
    ).toEqual(["proof"]);
  });

  // Red before: "Próximo reset: dia 1º do próximo mês", while the reset was
  // at 21:00 of the day before in Brasília.
  it("says when the quota resets, on the company's clock", () => {
    expect(
      nextResetSentence("2026-10-01T04:00:00.000Z", "America/Manaus"),
    ).toBe("A cota renova em 01/10/2026 às 00:00 (fuso da empresa)");
    expect(
      periodStartSentence("2026-09-01T03:00:00.000Z", "America/Sao_Paulo"),
    ).toBe("Período iniciado em 01/09/2026 às 00:00");
    expect(nextResetSentence(null, null)).toContain("dia 1º do próximo mês");
  });

  // Red before: the socket's NEXT reset was written over the period start.
  it("keeps the period start when the socket brings a newer total", () => {
    const merged = freshestUsage(
      {
        ai_analysis_limit: 100,
        ai_analysis_used: 1,
        ai_analysis_reset_at: "2026-09-01T03:00:00.000Z",
        ai_analysis_next_reset_at: "2026-10-01T03:00:00.000Z",
        ai_analysis_used_by_type: { fuel: 1, checklist: 0, proof: 0 },
      },
      0,
      {
        used: 2,
        limit: 100,
        remaining: 98,
        resetAt: "2026-10-01T03:00:00.000Z",
        receivedAt: 10,
      },
    );

    expect(merged).toMatchObject({
      ai_analysis_used: 2,
      ai_analysis_reset_at: "2026-09-01T03:00:00.000Z",
      ai_analysis_next_reset_at: "2026-10-01T03:00:00.000Z",
    });
  });

  // Red before: an event heard in the same millisecond the request left won,
  // and a fast machine showed the old limit after Atualizar. The server reads
  // the database after its request leaves, so on a tie its answer is at least
  // as new as the event.
  it("takes the server's answer when the event was heard the same millisecond", () => {
    const merged = freshestUsage(
      {
        ai_analysis_limit: 500,
        ai_analysis_used: 7,
        ai_analysis_reset_at: null,
      },
      1_000,
      { used: 7, limit: 100, remaining: 93, resetAt: null, receivedAt: 1_000 },
    );

    expect(merged?.ai_analysis_limit).toBe(500);
  });
});
