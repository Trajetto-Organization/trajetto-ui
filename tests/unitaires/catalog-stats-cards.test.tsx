import { describe, expect, it } from "vitest";

import { renderHtml } from "./helpers/render-html";

import { StatsGrid } from "@/app/(protected)/_components/shared/stats/stats-grid";
import { CatalogListSkeleton } from "@/components/shared/custom/catalog-list-skeleton";

import { profileAccessStatCards } from "@/features/profile-access/lib/stats";
import { vehicleTypeStatCards } from "@/features/vehicle-type/lib/stats";
import { fuelTypeStatCards, monthName } from "@/features/fuel-type/lib/stats";

/**
 * The three cards above Perfis de acesso, Tipos de veículo and Tipos de
 * combustível (decision 16.350): read from the API's `searchMeta` only, a
 * "—" instead of a confident zero when it did not come, and a skeleton laid
 * out like the cards it stands in for.
 */

// Intl puts a no-break space between "R$" and the number.
const plain = (text: string) => text.replace(/ /g, " ");

const values = (cards: Array<{ value: string }>) =>
  cards.map((card) => card.value);

describe("access profile cards", () => {
  it("read the API's tally over the whole search, not the page", () => {
    const cards = profileAccessStatCards(
      {
        total: 4,
        linkedUsers: 5,
        withoutUsers: 1,
        mostUsed: { id: "p1", label: "Operação", count: 3 },
      },
      4,
    );

    expect(cards.map((card) => card.title)).toEqual([
      "Perfis de acesso",
      "Usuários vinculados",
      "Perfil mais usado",
    ]);
    expect(values(cards)).toEqual(["4", "5", "Operação"]);
    expect(cards[0].description).toBe("1 sem usuários vinculados");
    expect(cards[2].description).toBe("3 usuários (60% do total)");
  });

  it("say so when no profile is in use or none exists", () => {
    const idle = profileAccessStatCards(
      { total: 2, linkedUsers: 0, withoutUsers: 2, mostUsed: null },
      2,
    );

    expect(idle[2]).toMatchObject({
      value: "—",
      description: "Nenhum perfil em uso ainda",
    });

    const empty = profileAccessStatCards(
      { total: 0, linkedUsers: 0, withoutUsers: 0, mostUsed: null },
      0,
    );

    expect(empty[0].description).toBe("Nenhum perfil cadastrado");

    const allUsed = profileAccessStatCards(
      {
        total: 1,
        linkedUsers: 1,
        withoutUsers: 0,
        mostUsed: { id: "p", label: "Gestão", count: 1 },
      },
      1,
    );

    expect(allUsed[0].description).toBe("Todos com usuários vinculados");
    expect(allUsed[2].description).toBe("1 usuário (100% do total)");
  });

  it("fall back to the pager total, and to “—” when the request failed", () => {
    expect(values(profileAccessStatCards(undefined, 7))).toEqual([
      "7",
      "—",
      "—",
    ]);
    expect(values(profileAccessStatCards(undefined, undefined))).toEqual([
      "—",
      "—",
      "—",
    ]);
  });

  it("write thousands the pt-BR way", () => {
    const cards = profileAccessStatCards(
      { total: 1200, linkedUsers: 15300, withoutUsers: 0, mostUsed: null },
      1200,
    );

    expect(values(cards).slice(0, 2)).toEqual(["1.200", "15.300"]);
  });
});

describe("vehicle type cards", () => {
  it("read the API's tally and name the type most of the fleet is", () => {
    const cards = vehicleTypeStatCards(
      {
        total: 3,
        vehicles: 4,
        withoutVehicles: 1,
        mostUsed: { id: "t", label: "Van", count: 3 },
      },
      3,
    );

    expect(cards.map((card) => card.title)).toEqual([
      "Tipos de veículo",
      "Veículos com tipo",
      "Tipo mais usado",
    ]);
    expect(values(cards)).toEqual(["3", "4", "Van"]);
    expect(cards[0].description).toBe("1 sem veículos cadastrados");
    expect(cards[2].description).toBe("3 veículos (75% do total)");
  });

  it("say “—” instead of a confident zero when the tally did not come", () => {
    expect(values(vehicleTypeStatCards(undefined, 2))).toEqual(["2", "—", "—"]);
  });
});

describe("fuel type cards", () => {
  const catalog = {
    total: 3,
    vehicles: 4,
    withoutVehicles: 1,
    mostUsed: { id: "d", label: "Diesel", count: 3 },
  };

  it("show this business month's refuelings and the fuel most refueled", () => {
    const cards = fuelTypeStatCards(
      {
        ...catalog,
        month: {
          month: "2026-10",
          refuelings: 3,
          liters: 340,
          amount: 2120,
          mostRefueled: {
            id: "d",
            label: "Diesel",
            refuelings: 2,
            liters: 300,
            averagePricePerLiter: 6.2,
          },
        },
      },
      3,
    );

    expect(cards.map((card) => card.title)).toEqual([
      "Tipos de combustível",
      "Abastecimentos em outubro",
      "Mais abastecido em outubro",
    ]);
    expect(values(cards)).toEqual(["3", "3", "Diesel"]);
    expect(plain(cards[1].description)).toBe("340 L · R$ 2.120,00");
    expect(plain(cards[2].description)).toBe("300 L · R$ 6,20/L em média");
  });

  it("say when nothing was refueled this month", () => {
    const cards = fuelTypeStatCards(
      {
        ...catalog,
        month: {
          month: "2026-03",
          refuelings: 0,
          liters: 0,
          amount: 0,
          mostRefueled: null,
        },
      },
      3,
    );

    expect(cards[1]).toMatchObject({
      title: "Abastecimentos em março",
      value: "0",
      description: "Nenhum abastecimento neste mês",
    });
    expect(cards[2]).toMatchObject({
      value: "—",
      description: "Sem abastecimentos para comparar",
    });
  });

  it("show the fleet's side instead when refuelings are not the caller's to see", () => {
    const cards = fuelTypeStatCards({ ...catalog, month: null }, 3);

    expect(cards.map((card) => card.title)).toEqual([
      "Tipos de combustível",
      "Veículos cadastrados",
      "Mais usado na frota",
    ]);
    expect(values(cards)).toEqual(["3", "4", "Diesel"]);
    expect(
      cards.some((card) => /abastec/i.test(card.title + card.description)),
    ).toBe(false);
  });

  it("names the month from the API's key, without reading a clock", () => {
    expect(monthName("2026-01")).toBe("janeiro");
    expect(monthName("2026-12")).toBe("dezembro");
  });
});

describe("the catalog skeleton", () => {
  const gridClasses = (html: string, marker: string) => {
    const match = html.match(new RegExp(`<div[^>]*${marker}[^>]*>`));

    return match?.[0].match(/class="([^"]*)"/)?.[1].split(/\s+/) ?? [];
  };

  it("lays the three cards out like StatsGrid does", () => {
    const skeleton = renderHtml(<CatalogListSkeleton mode="dashboard" />);
    const grid = renderHtml(
      <StatsGrid columns={3}>
        <span />
      </StatsGrid>,
    );

    const responsive = (classes: string[]) =>
      classes.filter((name) => /grid-cols|^gap-/.test(name)).sort();

    expect(responsive(gridClasses(skeleton, 'data-skeleton="stats"'))).toEqual(
      responsive(gridClasses(grid, 'data-tutorial="data-page-stats"')),
    );
    expect(skeleton.match(/h-\[142px\]/g)).toHaveLength(3);
  });

  it("draws only the company selector on /admin until a company is picked", () => {
    const html = renderHtml(
      <CatalogListSkeleton mode="admin" hasCompany={false} />,
    );

    expect(html).toContain('data-skeleton="select-business"');
    expect(html).not.toContain('data-skeleton="stats"');
  });
});
