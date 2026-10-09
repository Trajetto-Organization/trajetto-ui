import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/lib/escape-html";
import { vehicleMarkerHtml } from "@/features/control-tower/map/vehicle-marker";
import { locationPopupHtml } from "@/app/(protected)/_components/shared/custom/location-picker/popup-html";

/**
 * The two places where data reaches Leaflet, which writes it with innerHTML.
 *
 * The Control Tower label is a plate or a driver's name, and the location
 * picker's popup is an address from OpenStreetMap — a map anyone can edit.
 * Today the API's regexes keep `<` out of names and plates, but a spreadsheet
 * import or an integration that writes drivers would skip them, and then a
 * name like `<img src=x onerror=…>` would run in every dispatcher's session.
 * The markup is escaped here, where it is built, instead of trusting a regex
 * two repositories away.
 */
const PAYLOAD = "<img src=x onerror=alert(1)>";

function parse(html: string): HTMLDivElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
}

describe("escapeHtml", () => {
  it("turns every markup-significant character into an entity", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("ABC1D23 · João d'Ávila")).toBe(
      "ABC1D23 · João d&#39;Ávila",
    );
  });
});

describe("the Control Tower marker", () => {
  it("shows a hostile label as text, never as an element", () => {
    const host = parse(
      vehicleMarkerHtml({ label: PAYLOAD, status: "moving", selected: false }),
    );

    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toContain(PAYLOAD);
  });

  it("still shows a plate as it is", () => {
    const host = parse(
      vehicleMarkerHtml({ label: "ABC1D23", status: "silent", selected: true }),
    );

    expect(host.textContent?.trim()).toBe("ABC1D23");
  });

  it("is what the map draws", () => {
    // The tower and the route page both draw trucks through the vehicle layer.
    const source = readFileSync(
      resolve(process.cwd(), "src/features/control-tower/map/vehicle-layer.ts"),
      "utf8",
    );

    expect(source).toContain("vehicleMarkerHtml(");
    expect(source).not.toMatch(/>\$\{label\}</);
  });
});

describe("the location picker popup", () => {
  it("shows a hostile address as text, never as an element", () => {
    const host = parse(locationPopupHtml(`${PAYLOAD}, Rua A`));

    expect(host.querySelector("img")).toBeNull();
    expect(host.textContent).toContain(`${PAYLOAD}, Rua A`);
  });

  it("is what the picker opens", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/app/(protected)/_components/shared/custom/location-picker/hooks/index.ts",
      ),
      "utf8",
    );

    expect(source).toContain("locationPopupHtml(");
    expect(source).not.toMatch(/\$\{displayAddress\}/);
  });
});
