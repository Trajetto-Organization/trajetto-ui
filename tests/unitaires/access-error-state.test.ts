import { createElement } from "react";
import { renderHtml } from "./helpers/render-html";

import { describe, expect, it } from "vitest";

import { classifyAccessError, readAccessError } from "@/lib/access-error";
import { AccessErrorState } from "@/components/shared/custom/access-error-state";

/**
 * A 403 said as what it is (decision 4.1).
 *
 * The web turned every 403 into "Módulo Entregas não contratado", so a
 * read-only user of a company that hired Entregas was told it had not. The
 * API now names each refusal; this is the one reader of that name, and the
 * one box that shows it.
 */
describe("reading the refusal", () => {
  it("is the module state only for MODULE_NOT_ENABLED", () => {
    expect(
      classifyAccessError(403, { code: "MODULE_NOT_ENABLED", message: "x" })
        ?.kind,
    ).toBe("module-not-enabled");
  });

  it("is a permission problem for PERMISSION_DENIED and for any other 403", () => {
    for (const code of [
      "PERMISSION_DENIED",
      "TENANT_ACCESS_DENIED",
      "AUTH_ROLE_FORBIDDEN",
      "UM_CODIGO_NOVO",
      undefined,
    ]) {
      expect(classifyAccessError(403, { code })?.kind, String(code)).toBe(
        "permission-denied",
      );
    }
  });

  it("is the inactive company for TENANT_INACTIVE", () => {
    expect(classifyAccessError(403, { code: "TENANT_INACTIVE" })?.kind).toBe(
      "tenant-inactive",
    );
  });

  it("is the inactive company when the session gate says it (AUTH_BUSINESS_INACTIVE)", () => {
    // The user's own company switched off: it used to read "Sem permissão
    // para esta seção", as if a profile setting could fix it.
    expect(
      classifyAccessError(403, {
        code: "AUTH_BUSINESS_INACTIVE",
        message:
          "Esta empresa está desativada. Entre em contato com o administrador.",
      })?.kind,
    ).toBe("tenant-inactive");
  });

  it("is nothing for a status that is not 403", () => {
    expect(classifyAccessError(401, { code: "MODULE_NOT_ENABLED" })).toBeNull();
    expect(classifyAccessError(500, null)).toBeNull();
  });

  it("keeps the API's sentence", () => {
    expect(
      classifyAccessError(403, {
        code: "PERMISSION_DENIED",
        message: "Seu perfil de acesso não inclui esta seção.",
      })?.message,
    ).toBe("Seu perfil de acesso não inclui esta seção.");
  });

  it("reads a Response without consuming its body", async () => {
    const response = new Response(
      JSON.stringify({ code: "PERMISSION_DENIED", message: "sem acesso" }),
      { status: 403 },
    );

    expect((await readAccessError(response))?.kind).toBe("permission-denied");
    expect(await response.json()).toEqual({
      code: "PERMISSION_DENIED",
      message: "sem acesso",
    });
  });

  it("classifies an unreadable 403 by status, never as the module", async () => {
    const response = new Response("<html>proxy</html>", { status: 403 });

    expect((await readAccessError(response))?.kind).toBe("permission-denied");
  });
});

describe("the box", () => {
  const render = (props: Parameters<typeof AccessErrorState>[0]) =>
    renderHtml(createElement(AccessErrorState, props));

  it("says 'sem permissão' for a permission refusal", () => {
    const html = render({ kind: "permission-denied" });

    expect(html).toContain("Sem permissão para esta seção");
    expect(html).not.toContain("não contratado");
  });

  it("names the module for the company and tells it to talk to support", () => {
    const html = render({
      kind: "module-not-enabled",
      moduleLabel: "Entregas",
    });

    expect(html).toContain("Módulo Entregas não contratado");
    expect(html).toContain("sua empresa");
    expect(html).toContain("suporte");
  });

  it("tells the MASTER where to enable it, with the action it is given", () => {
    const html = render({
      kind: "module-not-enabled",
      moduleLabel: "Entregas",
      audience: "master",
      action: createElement("button", null, "Gerenciar módulos"),
    });

    expect(html).toContain("esta empresa");
    expect(html).toContain("Módulos Contratados");
    expect(html).toContain("Gerenciar módulos");
  });

  it("says the company is inactive for TENANT_INACTIVE", () => {
    expect(render({ kind: "tenant-inactive" })).toContain("Empresa desativada");
  });

  it("tells the MASTER where to reactivate a company, not to call an administrator", () => {
    // The API's sentence is written for the company's own users.
    const html = render({
      kind: "tenant-inactive",
      audience: "master",
      message:
        "Esta empresa está desativada. Entre em contato com o administrador para reativar o acesso.",
    });

    expect(html).toContain("Empresa desativada");
    expect(html).toContain("Reative o cadastro em Empresas");
    expect(html).not.toContain("Entre em contato com o administrador");
  });
});
