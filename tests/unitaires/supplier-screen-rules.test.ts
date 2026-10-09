import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { SupplierSkeleton } from "@/features/supplier/skeleton";
import { AccountPayableSkeleton } from "@/features/account-payable/skeleton";

import {
  SUPPLIER_TABLE,
  supplierListQuery,
} from "@/features/supplier/lib/server-table";
import {
  countWithShare,
  supplierStatsData,
} from "@/features/supplier/lib/stats-data";
import {
  SUPPLIER_FIELD_ORDER,
  supplierFieldLayout,
} from "@/features/supplier/form-dialog/fields";
import { businessFieldsData } from "@/app/(protected)/_components/data";

/**
 * The unified Fornecedores screen (decisions 8.7, 8.8, 3.3): what it asks
 * the API, where its cards come from, and the form's fields.
 */
describe("the supplier list asks the server (decision 8.8)", () => {
  it("forwards the sort and the UF facet, dropping unknown values", () => {
    expect(
      supplierListQuery({
        sort: "name",
        order: "asc",
        uf: "SP,XX,mg,MG",
        page: "2",
      }),
    ).toEqual({ sort: "name", order: "asc", uf: "SP,MG" });
  });

  it("sorts only by what the API orders", () => {
    expect(SUPPLIER_TABLE.sortable).toEqual([
      "created_at",
      "updated_at",
      "name",
      "cnpj",
      "city",
      "uf",
    ]);
    expect(supplierListQuery({ sort: "telephone" })).toEqual({});
  });
});

describe("the supplier cards come from searchMeta only", () => {
  it("maps the API's numbers", () => {
    expect(
      supplierStatsData({
        total: 300,
        withTelephone: 120,
        withEmail: 75,
        topStates: "SP (180), MG (60), PR (20)",
      }),
    ).toEqual({
      totalSuppliers: 300,
      withTelephone: 120,
      withEmail: 75,
      topStates: "SP (180), MG (60), PR (20)",
    });

    expect(countWithShare(120, 300)).toBe("120 (40%)");
  });

  it("says zero and N/A before the API answers", () => {
    expect(supplierStatsData(undefined)).toEqual({
      totalSuppliers: 0,
      withTelephone: 0,
      withEmail: 0,
      topStates: "N/A",
    });
  });
});

describe("the supplier form's fields (decision 3.3)", () => {
  const layout = supplierFieldLayout({
    addressFields: businessFieldsData,
    name: "Oficina Central",
    onNameChange: () => undefined,
  });

  it("lists the supplier's fields in order, without the company's own", () => {
    expect(layout.map((field) => field.name)).toEqual([
      ...SUPPLIER_FIELD_ORDER,
    ]);
  });

  it("marks name and CNPJ required and every other field optional", () => {
    expect(
      Object.fromEntries(layout.map((field) => [field.name, field.label])),
    ).toEqual({
      name: "Nome do Fornecedor *",
      cnpj: "CNPJ *",
      email: "E-mail (opcional)",
      telephone: "Telefone (opcional)",
      cep: "CEP (opcional)",
      city: "Cidade (opcional)",
      uf: "UF (opcional)",
      street: "Rua (opcional)",
      address_number: "Número (opcional)",
      complement: "Complemento (opcional)",
    });
  });
});

describe("the loading shape follows the page (decision 3.7)", () => {
  const cards = (html: string) => html.split("h-[142px]").length - 1;
  const emptyBox = (html: string) => html.includes("min-h-64");

  it("draws the selector and the empty box on /admin without a company", () => {
    const supplier = renderHtml(
      createElement(SupplierSkeleton, { mode: "admin", hasBusiness: false }),
    );
    const bills = renderHtml(
      createElement(AccountPayableSkeleton, {
        mode: "admin",
        hasBusiness: false,
      }),
    );

    // The page shows no actions, cards or table there; the old loading drew
    // all three and the layout jumped when the empty state landed.
    for (const html of [supplier, bills]) {
      expect(cards(html)).toBe(0);
      expect(emptyBox(html)).toBe(true);
    }
  });

  it("draws the list with a company, and always on /dashboard", () => {
    for (const html of [
      renderHtml(
        createElement(SupplierSkeleton, { mode: "admin", hasBusiness: true }),
      ),
      renderHtml(createElement(SupplierSkeleton, { mode: "dashboard" })),
      renderHtml(
        createElement(AccountPayableSkeleton, {
          mode: "admin",
          hasBusiness: true,
        }),
      ),
      renderHtml(createElement(AccountPayableSkeleton, { mode: "dashboard" })),
    ]) {
      expect(cards(html)).toBe(4);
      expect(emptyBox(html)).toBe(false);
    }
  });
});
