import { describe, expect, it } from "vitest";

import {
  companyZoneNote,
  deliveryHref,
  eventTitle,
  formatEventMoment,
  lastSignalLabel,
  punctualityNote,
} from "@/features/control-tower/lib/tower-format";
import {
  OSM_TILES,
  resolveMapTiles,
  tileOriginForCsp,
} from "@/features/control-tower/lib/map-tiles";
import {
  TowerRequestError,
  describeFailure,
  retryTransient,
  unwrapAnswer,
} from "@/features/control-tower/lib/tower-request";

describe("the punctuality note (TWR-5)", () => {
  const base = {
    onTime: 0,
    late: 0,
    notDeparted: 0,
    waiting: 0,
    notPlanned: 0,
    rate: null,
  };

  it("does not say 'nenhuma rota planejada' while planned routes wait for their hour", () => {
    // Five routes planned for 08:00, at 07:00: the old note said there was no plan.
    expect(punctualityNote({ ...base, waiting: 5 })).toBe(
      "5 rotas planejadas, todas ainda antes do horário de saída.",
    );
  });

  it("says there is no plan only when there is none", () => {
    expect(punctualityNote({ ...base, notPlanned: 2 })).toContain(
      "Nenhuma rota com horário planejado",
    );
    expect(punctualityNote(base)).toContain(
      "Nenhuma rota com horário planejado",
    );
  });

  it("says nothing once something can be judged", () => {
    expect(punctualityNote({ ...base, notDeparted: 1, rate: 0 })).toBeNull();
  });
});

describe("the moment of an event (TWR-7)", () => {
  const ZONE = "America/Sao_Paulo";

  it("shows only the hour for the tower's day", () => {
    expect(
      formatEventMoment("2026-09-28T13:05:00.000Z", "2026-09-28", ZONE),
    ).toBe("10:05");
  });

  it("shows the date for an event of another day, in the company's zone", () => {
    // 01:30 UTC on the 28th is 22:30 on the 27th in São Paulo.
    expect(
      formatEventMoment("2026-09-28T01:30:00.000Z", "2026-09-28", ZONE),
    ).toBe("27/09 22:30");
  });
});

describe("what an event is called", () => {
  const event = {
    id: "x",
    actor: "DRIVER_APP",
    deliveryId: "d",
    recipientName: null,
    driverName: null,
    occurredAt: "2026-09-28T13:05:00.000Z",
  };

  it("names an insucesso by its occurrence type", () => {
    expect(
      eventTitle({
        ...event,
        type: "OCCURRENCE",
        detail: "Cliente ausente",
        failure: true,
      }),
    ).toBe("Insucesso · Cliente ausente");
    expect(
      eventTitle({
        ...event,
        type: "OCCURRENCE",
        detail: "Portão fechado",
        failure: false,
      }),
    ).toBe("Ocorrência · Portão fechado");
  });

  it("names route moves and manual status changes", () => {
    expect(
      eventTitle({
        ...event,
        type: "ROUTE_STARTED",
        routeCode: 12,
        deliveryId: null,
      }),
    ).toBe("Rota 12 iniciada");
    expect(
      eventTitle({ ...event, type: "STATUS_CHANGE", detail: "FAILED" }),
    ).toBe("Status alterado · Insucesso");
    expect(eventTitle({ ...event, type: "ON_THE_WAY" })).toBe("A caminho");
  });

  it("never words a planning fact as the route's lifecycle (decision 14.7)", () => {
    expect(eventTitle({ ...event, type: "ROUTE_ADDED", routeCode: 12 })).toBe(
      "Adicionada à rota",
    );
    expect(eventTitle({ ...event, type: "ROUTE_REMOVED", routeCode: 12 })).toBe(
      "Retirada da rota",
    );
  });

  it("links to the delivery on the surface the tower is on", () => {
    expect(deliveryHref("abc", "dashboard", undefined)).toBe(
      "/dashboard/deliveries?tab=deliveries&search=abc",
    );
    expect(deliveryHref("abc", "admin", "biz")).toBe(
      "/admin/deliveries?tab=deliveries&search=abc&businessId=biz",
    );
  });

  it("says when a running route has sent nothing", () => {
    const now = Date.parse("2026-09-28T13:00:00.000Z");
    const left = "2026-09-28T08:00:00.000Z";

    expect(lastSignalLabel(null, left, now)).toBe("Sem posição desde a saída");
    expect(lastSignalLabel("2026-09-28T12:48:00.000Z", left, now)).toBe(
      "Último sinal há 12 min",
    );
  });

  it("keeps an old last signal instead of calling it 'sem posição' (TWR-9 review)", () => {
    const now = Date.parse("2026-09-28T13:00:00.000Z");

    // Quiet for fourteen hours on a route that left yesterday.
    expect(
      lastSignalLabel(
        "2026-09-27T23:00:00.000Z",
        "2026-09-27T20:00:00.000Z",
        now,
      ),
    ).toBe("Último sinal há 14 h");

    // Its last point is from before this departure: nothing on THIS route.
    expect(
      lastSignalLabel(
        "2026-09-26T13:00:00.000Z",
        "2026-09-28T08:00:00.000Z",
        now,
      ),
    ).toBe("Sem posição desde a saída · último sinal há 2 dias");
  });
});

describe("whose clock the hours are on", () => {
  it("says nothing when the browser is on the company's zone", () => {
    expect(
      companyZoneNote("America/Sao_Paulo", "America/Sao_Paulo"),
    ).toBeNull();
    expect(companyZoneNote(undefined, "America/Sao_Paulo")).toBeNull();
  });

  it("names the company's zone when the browser is elsewhere", () => {
    expect(companyZoneNote("America/Rio_Branco", "America/Sao_Paulo")).toBe(
      "Horários no fuso da empresa (Rio Branco)",
    );
  });
});

describe("the base map (decision 7.4)", () => {
  it("uses the configured provider, with its credit", () => {
    expect(
      resolveMapTiles({
        url: "https://{s}.tiles.example.com/{z}/{x}/{y}.png?key=abc",
        attribution: "© Exemplo",
        appEnv: "production",
      }),
    ).toEqual({
      url: "https://{s}.tiles.example.com/{z}/{x}/{y}.png?key=abc",
      attribution: "© Exemplo",
    });
  });

  it("falls back to OpenStreetMap in development only", () => {
    expect(resolveMapTiles({ appEnv: "development" })).toEqual(OSM_TILES);
    expect(resolveMapTiles({ appEnv: "production" })).toBeNull();
    expect(resolveMapTiles({ appEnv: "staging" })).toBeNull();
  });

  it("credits OpenStreetMap in Portuguese, linked to its copyright page", () => {
    const credit = document.createElement("div");
    credit.innerHTML = OSM_TILES.attribution;

    expect(credit.textContent).toBe("© colaboradores do OpenStreetMap");

    const link = credit.querySelector("a");

    expect(link?.getAttribute("href")).toBe(
      "https://www.openstreetmap.org/copyright",
    );
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("refuses a template that is not one, or plain http outside development", () => {
    expect(
      resolveMapTiles({
        url: "https://tiles.example.com/map.png",
        appEnv: "production",
      }),
    ).toBeNull();
    expect(
      resolveMapTiles({
        url: "http://tiles.example.com/{z}/{x}/{y}.png",
        appEnv: "production",
      }),
    ).toBeNull();
  });

  it("gives the CSP owner the origin to allow", () => {
    expect(
      tileOriginForCsp("https://{s}.tiles.example.com/{z}/{x}/{y}.png"),
    ).toBe("https://*.tiles.example.com");
  });
});

describe("a refused read (UI-TWR-1)", () => {
  it("is thrown, so the last good tower stays on screen", () => {
    expect(() =>
      unwrapAnswer({
        success: false,
        message: "x",
        code: "MODULE_NOT_ENABLED",
        status: 403,
      }),
    ).toThrow(TowerRequestError);
    expect(unwrapAnswer({ success: true, message: "", data: 1 })).toBe(1);
  });

  it("is not retried when asking again cannot help", () => {
    expect(
      retryTransient(0, new TowerRequestError("x", "PERMISSION_DENIED", 403)),
    ).toBe(false);
    expect(retryTransient(0, new TowerRequestError("x", undefined, 502))).toBe(
      true,
    );
    expect(retryTransient(2, new TowerRequestError("x", undefined, 502))).toBe(
      false,
    );
  });

  it("tells the module, the permission and the outage apart (decision 4.1)", () => {
    expect(
      describeFailure(new TowerRequestError("x", "MODULE_NOT_ENABLED", 403))
        .title,
    ).toBe("Módulo Entregas não contratado");
    expect(
      describeFailure(new TowerRequestError("x", "PERMISSION_DENIED", 403))
        .title,
    ).toBe("Sem permissão para ver a operação");
    expect(
      describeFailure(
        new TowerRequestError("Falhou", undefined, 500),
        "as rotas",
      ),
    ).toEqual({
      title: "Não foi possível carregar as rotas",
      description: "Falhou",
    });
  });

  it("reads a switched-off company the same whichever gate said it", () => {
    // TENANT_INACTIVE from the route guard, AUTH_BUSINESS_INACTIVE from the
    // session check: one fact, one sentence (the full-screen state already
    // maps both through classifyAccessError).
    for (const code of ["TENANT_INACTIVE", "AUTH_BUSINESS_INACTIVE"]) {
      expect(describeFailure(new TowerRequestError("x", code, 403)).title).toBe(
        "Empresa inativa",
      );
    }
  });
});

describe("the configured map credit", () => {
  // Leaflet writes the credit as HTML on every map of the panel: a value
  // from the environment is text, never markup.
  it("is plain text, whatever the setting holds", () => {
    const tiles = resolveMapTiles({
      url: "https://tiles.example.com/{z}/{x}/{y}.png",
      attribution: '© Exemplo <img src=x onerror="alert(1)">',
      appEnv: "production",
    });

    const credit = document.createElement("div");
    credit.innerHTML = tiles!.attribution;

    expect(credit.querySelector("img")).toBeNull();
    expect(credit.textContent).toBe('© Exemplo <img src=x onerror="alert(1)">');
  });
});
