import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BusinessContent } from "@/app/(protected)/admin/business/business-content";
import { QuoteContent } from "@/app/(protected)/admin/quote/quote-content";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";

/**
 * Empresas and Orçamentos (/admin) answer a 403 with the access state that
 * names the refusal (decision 4.1), as Filiais and Atividades already did —
 * not with "Houve um erro ao tentar recuperar a lista".
 */
(globalThis as { React?: typeof React }).React = React;

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every element in a rendered tree, depth first (no rendering of children). */
function elements(node: unknown): React.ReactElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];

  const props = node.props as { children?: unknown };

  return [node, ...elements(props.children)];
}

function refusal(code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

describe.each([
  ["Empresas", BusinessContent],
  ["Orçamentos", QuoteContent],
] as const)("%s on a 403", (_name, Content) => {
  it("renders the permission state with the API's sentence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        refusal("PERMISSION_DENIED", "Sem permissão para esta tela."),
      ),
    );

    const tree = await Content({ searchParams: {}, token: "t" });
    const state = elements(tree).find(
      (element) => element.type === AccessErrorState,
    );

    expect(state, "o 403 caiu no erro genérico da tabela").toBeDefined();
    expect(state?.props).toMatchObject({
      kind: "permission-denied",
      audience: "master",
      message: "Sem permissão para esta tela.",
    });
  });

  it("keeps the inactive-company refusal apart from a missing permission", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => refusal("TENANT_INACTIVE", "Empresa inativa.")),
    );

    const tree = await Content({ searchParams: {}, token: "t" });
    const state = elements(tree).find(
      (element) => element.type === AccessErrorState,
    );

    expect(state?.props).toMatchObject({ kind: "tenant-inactive" });
  });
});
