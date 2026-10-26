/**
 * Builds src/assets/logo/trajetto-mark.svg from src/assets/logo/trajetto-logo.png.
 *
 * Why the logo is traced: the only source we have is a 1024x1024 PNG that is
 * mostly empty canvas. Shown small, it had to be cropped with CSS and loaded
 * through /_next/image with a blur placeholder, which painted a blurry halo
 * before the mark arrived. The mark itself is nine flat facets, some with a
 * soft linear gradient, so it vectorises almost losslessly into a ~3 KB SVG
 * that every call site loads directly and that stays sharp at any size.
 *
 * How: crop the mark, split its pixels into colour classes, take the connected
 * components, fit each facet with a simplified convex hull, and fit its colour
 * with a 4-stop linear gradient along the main colour direction. Gradients
 * whose stops are all within 2 per channel collapse to a solid fill.
 *
 * When to rerun: only if trajetto-logo.png changes. The output is byte for
 * byte deterministic, so a rerun on the same PNG gives the same file.
 *
 *   node scripts/build-logo-mark.mjs          writes the SVG
 *   node scripts/build-logo-mark.mjs --check  exits 1 if the committed SVG is stale
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(ROOT, "src/assets/logo/trajetto-logo.png");
const OUTPUT = resolve(ROOT, "src/assets/logo/trajetto-mark.svg");

// Where the mark sits inside the 1024px canvas.
const CROP = { left: 193, top: 381, width: 618, height: 317 };
// Douglas-Peucker tolerance, gradient stops, erosion radius, outward offset.
const EPS = 0.8;
const BINS = 4;
const R = 1;
const OFFSET = 0;
// Gradients whose stops never differ by more than this per channel become flat.
const FLAT_TOLERANCE = 2;

/** One decimal, no trailing zeros, no "-0". */
const num = (value) => {
  const rounded = Number(value.toFixed(1));
  return String(rounded === 0 ? 0 : rounded);
};

const hex = (value) =>
  Math.round(Math.max(0, Math.min(255, value)))
    .toString(16)
    .padStart(2, "0");

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Monotone chain convex hull. */
const convexHull = (points) => {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  const upper = [];
  for (const p of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  for (const p of points.slice().reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};

/** Douglas-Peucker simplification of an open polyline. */
const simplify = (points, eps) => {
  if (points.length < 3) return points;
  const a = points[0];
  const b = points[points.length - 1];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d =
      Math.abs(
        (b[0] - a[0]) * (a[1] - points[i][1]) -
          (a[0] - points[i][0]) * (b[1] - a[1]),
      ) / length;
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }
  return maxDistance > eps
    ? simplify(points.slice(0, index + 1), eps)
        .slice(0, -1)
        .concat(simplify(points.slice(index), eps))
    : [a, b];
};

/** Moves every edge of a convex polygon outward by `distance`. */
const offsetPolygon = (polygon, distance) => {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    const q = polygon[(i + 1) % polygon.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const ccw = area > 0;
  const lines = polygon.map((p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    let nx = q[1] - p[1];
    let ny = -(q[0] - p[0]);
    const length = Math.hypot(nx, ny);
    nx /= length;
    ny /= length;
    if (!ccw) {
      nx = -nx;
      ny = -ny;
    }
    return [
      [p[0] + nx * distance, p[1] + ny * distance],
      [q[0] + nx * distance, q[1] + ny * distance],
    ];
  });
  const intersect = ([p, p2], [q, q2]) => {
    const r = [p2[0] - p[0], p2[1] - p[1]];
    const s = [q2[0] - q[0], q2[1] - q[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) return p2;
    const t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den;
    return [p[0] + t * r[0], p[1] + t * r[1]];
  };
  return lines.map((line, i) =>
    intersect(lines[(i - 1 + lines.length) % lines.length], line),
  );
};

const isFlat = (stops) =>
  [0, 1, 2].every((channel) => {
    const values = stops.map((stop) => stop.rgb[channel]);
    return Math.max(...values) - Math.min(...values) <= FLAT_TOLERANCE;
  });

const buildLogoMark = async () => {
  const { data, info } = await sharp(INPUT)
    .extract(CROP)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // Colour classes: violet, pink (split into three bands by row), dark plum, mid.
  const cls = new Int8Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    if (data[i * 4 + 3] < 128) continue;
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let c;
    if (b > 150 && r < 150) c = 0;
    else if (r > 200) c = 1;
    else if (L < 45) c = 2;
    else c = 3;
    if (c === 1) {
      const y = Math.floor(i / W);
      if (y >= 106 && y <= 189) c = 4;
      else if (y > 189) c = 5;
    }
    cls[i] = c;
  }

  // Connected components per class.
  const comp = new Int32Array(W * H).fill(-1);
  const comps = [];
  for (let i = 0; i < W * H; i++) {
    if (cls[i] < 0 || comp[i] >= 0) continue;
    const id = comps.length;
    const stack = [i];
    comp[i] = id;
    const px = [];
    while (stack.length) {
      const j = stack.pop();
      px.push(j);
      const x = j % W;
      const y = (j / W) | 0;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (comp[k] < 0 && cls[k] === cls[i]) {
          comp[k] = id;
          stack.push(k);
        }
      }
    }
    comps.push({ cls: cls[i], px });
  }

  // A facet with a notch on its left edge is not convex: split it at the notch.
  let facets = [];
  for (const c of comps.filter((component) => component.px.length > 200)) {
    const minX = new Map();
    for (const j of c.px) {
      const x = j % W;
      const y = (j / W) | 0;
      if (!minX.has(y) || x < minX.get(y)) minX.set(y, x);
    }
    const ys = [...minX.keys()].sort((a, b) => a - b);
    let notchY = -1;
    let notchX = -1;
    for (const y of ys.slice(4, -4)) {
      if (minX.get(y) > notchX) {
        notchX = minX.get(y);
        notchY = y;
      }
    }
    const reflex =
      notchY > 0 &&
      notchX > minX.get(ys[2]) + 3 &&
      notchX > minX.get(ys[ys.length - 3]) + 3;
    if (reflex) {
      facets.push({
        cls: c.cls,
        px: c.px.filter((j) => ((j / W) | 0) <= notchY),
        split: true,
      });
      facets.push({
        cls: c.cls,
        px: c.px.filter((j) => ((j / W) | 0) > notchY),
        split: true,
      });
    } else facets.push(c);
  }
  facets.forEach((facet, i) => {
    if (facet.split) for (const j of facet.px) comp[j] = 100000 + i;
  });

  const shapes = [];
  const gradients = [];
  facets.forEach((facet, ci) => {
    // Corners of the pixels that survive an erosion of radius R, then the hull.
    const points = [];
    for (const j of facet.px) {
      const x = j % W;
      const y = (j / W) | 0;
      let inside = true;
      for (let dy = -R; dy <= R && inside; dy++)
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx < 0 ||
            ny < 0 ||
            nx >= W ||
            ny >= H ||
            comp[ny * W + nx] !== comp[j]
          ) {
            inside = false;
            break;
          }
        }
      if (inside) points.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
    }
    let hull = convexHull(points);
    // Close the ring for Douglas-Peucker by splitting it at the farthest vertex.
    {
      let far = 0;
      let farDistance = 0;
      hull.forEach((p, i) => {
        const d = Math.hypot(p[0] - hull[0][0], p[1] - hull[0][1]);
        if (d > farDistance) {
          farDistance = d;
          far = i;
        }
      });
      const first = simplify(hull.slice(0, far + 1), EPS);
      const second = simplify(hull.slice(far).concat([hull[0]]), EPS);
      hull = first.slice(0, -1).concat(second.slice(0, -1));
    }
    // Undo the erosion so neighbouring facets meet again.
    hull = offsetPolygon(hull, R + OFFSET).map((p) => [
      Number(p[0].toFixed(2)),
      Number(p[1].toFixed(2)),
    ]);

    // Colour fit on interior pixels, away from anti-aliased edges.
    const interior = facet.px.filter((j) => {
      const x = j % W;
      const y = (j / W) | 0;
      for (const [dx, dy] of [
        [3, 0],
        [-3, 0],
        [0, 3],
        [0, -3],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= W ||
          ny >= H ||
          comp[ny * W + nx] !== comp[j]
        )
          return false;
      }
      return true;
    });
    const sample = interior.length > 50 ? interior : facet.px;

    // Least squares colour = a + bx*x + by*y, per channel.
    let n = 0;
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    const sc = [0, 0, 0];
    const scx = [0, 0, 0];
    const scy = [0, 0, 0];
    for (const j of sample) {
      const x = (j % W) + 0.5;
      const y = ((j / W) | 0) + 0.5;
      n++;
      sx += x;
      sy += y;
      sxx += x * x;
      syy += y * y;
      sxy += x * y;
      for (let k = 0; k < 3; k++) {
        const v = data[j * 4 + k];
        sc[k] += v;
        scx[k] += v * x;
        scy[k] += v * y;
      }
    }
    const mx = sx / n;
    const my = sy / n;
    const cxx = sxx / n - mx * mx;
    const cyy = syy / n - my * my;
    const cxy = sxy / n - mx * my;
    const det = cxx * cyy - cxy * cxy;
    const slopes = [0, 1, 2].map((k) => {
      const vx = scx[k] / n - (mx * sc[k]) / n;
      const vy = scy[k] / n - (my * sc[k]) / n;
      return [(vx * cyy - vy * cxy) / det, (vy * cxx - vx * cxy) / det];
    });
    // Main colour direction: principal eigenvector of the slopes.
    let a11 = 0;
    let a12 = 0;
    let a22 = 0;
    for (const g of slopes) {
      a11 += g[0] * g[0];
      a12 += g[0] * g[1];
      a22 += g[1] * g[1];
    }
    const theta = 0.5 * Math.atan2(2 * a12, a11 - a22);
    const dir = [Math.cos(theta), Math.sin(theta)];
    const projections = hull.map((p) => p[0] * dir[0] + p[1] * dir[1]);
    const t0 = Math.min(...projections);
    const t1 = Math.max(...projections);
    const bins = Array.from({ length: BINS }, () => [0, 0, 0, 0]);
    for (const j of sample) {
      const x = (j % W) + 0.5;
      const y = ((j / W) | 0) + 0.5;
      const t = (x * dir[0] + y * dir[1] - t0) / (t1 - t0);
      const bin = Math.min(BINS - 1, Math.max(0, Math.floor(t * BINS)));
      for (let k = 0; k < 3; k++) bins[bin][k] += data[j * 4 + k];
      bins[bin][3]++;
    }
    const stops = bins
      .map((bin, i) =>
        bin[3]
          ? {
              offset: (i + 0.5) / BINS,
              rgb: [0, 1, 2].map((k) => Math.round(bin[k] / bin[3])),
            }
          : null,
      )
      .filter(Boolean);
    const color = (rgb) => `#${rgb.map(hex).join("")}`;

    let fill;
    if (isFlat(stops)) {
      fill = color(stops[0].rgb);
    } else {
      const id = `g${ci}`;
      fill = `url(#${id})`;
      gradients.push(
        `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${num(dir[0] * t0)}" y1="${num(dir[1] * t0)}" x2="${num(dir[0] * t1)}" y2="${num(dir[1] * t1)}">` +
          stops
            .map(
              (stop) =>
                `<stop offset="${num(stop.offset)}" stop-color="${color(stop.rgb)}"/>`,
            )
            .join("") +
          `</linearGradient>`,
      );
    }
    shapes.push({
      cls: facet.cls,
      svg: `<path fill="${fill}" d="M${hull.map((p) => `${num(p[0])} ${num(p[1])}`).join("L")}Z"/>`,
    });
  });

  // Large bright facets first, so the darker ones sit on top and hide seams.
  const order = [1, 5, 4, 3, 2, 0];
  shapes.sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs>${gradients.join("")}</defs>` +
    shapes.map((shape) => shape.svg).join("") +
    `</svg>\n`
  );
};

const main = async () => {
  const svg = await buildLogoMark();
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(OUTPUT, "utf8");
    } catch {
      // Missing file counts as stale.
    }
    if (current !== svg) {
      console.error(
        "trajetto-mark.svg is stale: run node scripts/build-logo-mark.mjs",
      );
      process.exit(1);
    }
    console.log("trajetto-mark.svg is up to date");
    return;
  }
  writeFileSync(OUTPUT, svg);
  console.log(`wrote ${OUTPUT} (${Buffer.byteLength(svg)} B)`);
};

await main();
