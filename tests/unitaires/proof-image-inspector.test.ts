import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ImageInspector } from "@/features/deliveries/proof-audits/image-inspector";

/**
 * The inspector's wiring in a DOM (DLVB-05, DLVB-06): drag, keyboard, the
 * lens. happy-dom has no layout, so the stage is given a 400×300 box and the
 * photo a 1600×900 size, as a browser would report them.
 */
const URL_ = "https://bucket.test/canhoto.jpg";

beforeAll(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("React", React);
});

let hover = true;

beforeEach(() => {
  hover = true;

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: hover && query.includes("hover"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

const unmounts: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (unmounts.length) await unmounts.pop()!();
  vi.restoreAllMocks();
});

let container: HTMLElement;

async function mount(): Promise<{
  stage: HTMLElement;
  image: HTMLImageElement;
}> {
  container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ImageInspector, { url: URL_, alt: "Canhoto da entrega" }),
    );
  });

  unmounts.push(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const image = container.querySelector("img") as HTMLImageElement;

  Object.defineProperty(image, "naturalWidth", { value: 1600 });
  Object.defineProperty(image, "naturalHeight", { value: 900 });

  await act(async () => {
    image.dispatchEvent(new Event("load"));
  });

  return {
    stage: container.querySelector('[role="group"]') as HTMLElement,
    image,
  };
}

const pointer = (type: string, x: number, y: number, pointerType = "mouse") =>
  new PointerEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType,
    button: 0,
  });

function button(name: RegExp): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (candidate) =>
      name.test(candidate.textContent ?? "") ||
      name.test(candidate.getAttribute("aria-label") ?? ""),
  );

  expect(found, `botão ${name}`).toBeDefined();
  return found!;
}

describe("a zoomed photo", () => {
  it("drags until its top-left corner meets the stage's, and no further", async () => {
    const { stage, image } = await mount();

    // Fitted at 400×225; at 2× it is 800×450 in a 400×300 stage.
    await act(async () => {
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "+", bubbles: true }),
      );
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "+", bubbles: true }),
      );
    });

    expect(stage.dataset.zoom).toBe("2");
    expect(image.style.width).toBe("400px");

    await act(async () => {
      stage.dispatchEvent(pointer("pointerdown", 100, 100));
    });
    await act(async () => {
      stage.dispatchEvent(pointer("pointermove", 900, 900));
    });
    await act(async () => {
      stage.dispatchEvent(pointer("pointerup", 900, 900));
    });

    // Pan (200, 75): the photo's left edge at -400 + 200 = -200 (the stage's
    // left) and its top at -225 + 75 = -150 (the stage's top).
    expect(image.style.transform).toContain("translate(200px, 75px)");
    expect(image.style.transform).toContain("scale(2)");
  });
});

describe("the lens", () => {
  it("follows a mouse over the photo, magnifying the point under it", async () => {
    const { stage } = await mount();

    expect(button(/^Lupa$/).getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      stage.dispatchEvent(pointer("pointermove", 200, 150));
    });

    const lens = container.querySelector(
      '[data-testid="image-inspector-lens"]',
    ) as HTMLElement;

    expect(lens).not.toBeNull();

    // The centre of the photo (u = v = 0.5) at the lens centre, 2.5× larger.
    expect(lens.style.backgroundSize).toBe("1000px 562.5px");
    expect(lens.style.backgroundPosition).toBe("-420px -201.25px");
    expect(lens.style.left).toBe("120px");
    expect(lens.style.top).toBe("70px");
  });

  it("is not drawn off the photo, and turns off with its button", async () => {
    const { stage } = await mount();

    // The letterbox above a 225px-tall photo in a 300px stage.
    await act(async () => {
      stage.dispatchEvent(pointer("pointermove", 200, 10));
    });

    expect(
      container.querySelector('[data-testid="image-inspector-lens"]'),
    ).toBeNull();

    await act(async () => button(/^Lupa$/).click());

    expect(button(/^Lupa$/).getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      stage.dispatchEvent(pointer("pointermove", 200, 150));
    });

    expect(
      container.querySelector('[data-testid="image-inspector-lens"]'),
    ).toBeNull();
  });

  it("does not exist on a touch screen", async () => {
    hover = false;

    await mount();

    expect(
      [...container.querySelectorAll("button")].some((candidate) =>
        /^Lupa$/.test(candidate.textContent ?? ""),
      ),
    ).toBe(false);
  });
});

const touch = (type: string, x: number, y: number, pointerId: number) =>
  new PointerEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    pointerId,
    pointerType: "touch",
    button: 0,
  });

const dblclick = (x: number, y: number) =>
  new MouseEvent("dblclick", {
    bubbles: true,
    clientX: x,
    clientY: y,
    button: 0,
  });

async function tap(
  stage: HTMLElement,
  x: number,
  y: number,
  pointerId: number,
) {
  await act(async () => {
    stage.dispatchEvent(touch("pointerdown", x, y, pointerId));
  });
  await act(async () => {
    stage.dispatchEvent(touch("pointerup", x, y, pointerId));
  });
}

describe("a double tap on a touch screen", () => {
  it("zooms in once, even when the browser also sends a dblclick", async () => {
    // touch-action disables the browser's own double-tap zoom, so mobile
    // browsers follow the second tap with a dblclick: both paths toggled,
    // and the photo went 1× → 2× → 1×.
    const { stage } = await mount();

    await tap(stage, 200, 150, 11);
    await tap(stage, 200, 150, 12);
    await act(async () => {
      stage.dispatchEvent(dblclick(200, 150));
    });

    expect(stage.dataset.zoom).toBe("2");

    await tap(stage, 200, 150, 13);
    await tap(stage, 200, 150, 14);
    await act(async () => {
      stage.dispatchEvent(dblclick(200, 150));
    });

    expect(stage.dataset.zoom).toBe("1");
  });

  it("leaves the mouse's double click zooming in and out", async () => {
    const { stage } = await mount();

    await act(async () => {
      stage.dispatchEvent(pointer("pointerdown", 200, 150));
      stage.dispatchEvent(pointer("pointerup", 200, 150));
      stage.dispatchEvent(dblclick(200, 150));
    });

    expect(stage.dataset.zoom).toBe("2");

    await act(async () => {
      stage.dispatchEvent(pointer("pointerdown", 200, 150));
      stage.dispatchEvent(pointer("pointerup", 200, 150));
      stage.dispatchEvent(dblclick(200, 150));
    });

    expect(stage.dataset.zoom).toBe("1");
  });
});

describe("a pinch", () => {
  it("zooms around the fingers and keeps the page from scrolling", async () => {
    const { stage } = await mount();

    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 150, 150, 21));
      stage.dispatchEvent(touch("pointerdown", 250, 150, 22));
    });

    // At 1× the stage lets a one-finger vertical swipe scroll the page
    // (pan-y); a second finger makes it a pinch, so its moves are cancelled
    // before the browser turns them into a scroll and drops the pointers.
    const twoFingers = new TouchEvent("touchmove", {
      bubbles: true,
      cancelable: true,
      touches: [{ identifier: 21 }, { identifier: 22 }] as unknown as Touch[],
    });
    const oneFinger = new TouchEvent("touchmove", {
      bubbles: true,
      cancelable: true,
      touches: [{ identifier: 21 }] as unknown as Touch[],
    });

    stage.dispatchEvent(twoFingers);
    stage.dispatchEvent(oneFinger);

    expect(twoFingers.defaultPrevented).toBe(true);
    expect(oneFinger.defaultPrevented).toBe(false);

    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 100, 150, 21));
      stage.dispatchEvent(touch("pointermove", 300, 150, 22));
    });

    expect(stage.dataset.zoom).toBe("2");

    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 100, 150, 21));
      stage.dispatchEvent(touch("pointerup", 300, 150, 22));
    });

    expect(stage.dataset.zoom).toBe("2");
  });
});

describe("the end of a pinch", () => {
  it("is not taken for a double tap when both fingers lift close together", async () => {
    // Pinching in ends with the fingers side by side, lifted together: two
    // touch pointerups a few pixels apart used to read as a double tap and
    // zoomed the photo back in right after it was zoomed out.
    const { stage } = await mount();

    await act(async () => {
      for (let press = 0; press < 3; press += 1) {
        stage.dispatchEvent(
          new KeyboardEvent("keydown", { key: "+", bubbles: true }),
        );
      }
    });

    expect(stage.dataset.zoom).toBe("3");

    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 100, 150, 31));
      stage.dispatchEvent(touch("pointerdown", 300, 150, 32));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 190, 150, 31));
      stage.dispatchEvent(touch("pointermove", 210, 150, 32));
    });

    expect(stage.dataset.zoom).toBe("1");

    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 190, 150, 31));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 210, 150, 32));
    });

    expect(stage.dataset.zoom).toBe("1");
  });

  it("does not count a finger that dragged as a tap", async () => {
    const { stage } = await mount();

    await tap(stage, 200, 150, 41);

    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 200, 150, 42));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 200, 60, 42));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 205, 160, 42));
    });

    expect(stage.dataset.zoom).toBe("1");
  });
});

/** The pan of the photo, read from its transform (the second translate). */
function panOf(image: HTMLImageElement): { x: number; y: number } {
  const match =
    /translate\(-50%, -50%\) translate\(([-\d.e]+)px, ([-\d.e]+)px\)/.exec(
      image.style.transform,
    );

  expect(match, image.style.transform).not.toBeNull();

  return { x: Number(match![1]), y: Number(match![2]) };
}

describe("a finger left down after a pinch", () => {
  it("drags from where it is, without the photo jumping", async () => {
    // The first finger landed on a zoomed photo and started a drag from its
    // point; the pinch moved it without updating that point, so when the
    // other finger lifted, the next move panned by the whole distance the
    // finger had travelled during the pinch.
    const { stage, image } = await mount();

    await act(async () => {
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "+", bubbles: true }),
      );
      stage.dispatchEvent(
        new KeyboardEvent("keydown", { key: "+", bubbles: true }),
      );
    });

    expect(stage.dataset.zoom).toBe("2");

    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 100, 150, 51));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 300, 150, 52));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 80, 150, 51));
      stage.dispatchEvent(touch("pointermove", 320, 150, 52));
    });

    // 200px apart → 240px: 2× → 2.4×.
    expect(stage.dataset.zoom).toBe("2.4");

    const afterPinch = panOf(image);

    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 320, 150, 52));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 85, 150, 51));
    });

    // The finger moved 5px right, so the photo moves 5px right. It used to
    // jump 15px LEFT: from 100 (where the finger first landed) to 85.
    const afterDrag = panOf(image);

    expect(afterDrag.x - afterPinch.x).toBeCloseTo(5, 6);
    expect(afterDrag.y).toBeCloseTo(afterPinch.y, 6);
    expect(image.style.transform).toContain("scale(2.4)");

    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 85, 150, 51));
    });
  });
});

describe("two fingers that barely moved", () => {
  it("are not a double tap when they lift, even without travelling far", async () => {
    // The fingers of a small pinch each travel less than a tap's slack and
    // lift a few pixels apart. Only the multi-touch flag, kept until the
    // LAST finger lifts, tells them from two taps.
    const { stage } = await mount();

    await act(async () => {
      stage.dispatchEvent(touch("pointerdown", 185, 150, 61));
      stage.dispatchEvent(touch("pointerdown", 215, 150, 62));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointermove", 192, 150, 61));
      stage.dispatchEvent(touch("pointermove", 208, 150, 62));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 192, 150, 61));
    });
    await act(async () => {
      stage.dispatchEvent(touch("pointerup", 208, 150, 62));
    });

    expect(stage.dataset.zoom).toBe("1");
  });
});
