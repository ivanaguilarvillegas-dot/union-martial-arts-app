#!/usr/bin/env node

/*
  Usage:
  node split-assets.js \
    --source assets/sheets/belts-master.png \
    --cols 6 \
    --rows 3 \
    --names names-belts.json \
    --out assets/belts/home
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    args[key] = val;
  }
  return args;
}

function absFromCwd(p) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseList(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  const s = String(value).trim();
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => Number(x));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function idx(x, y, w) {
  return (y * w) + x;
}

async function keepLargestAlphaComponent(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const visited = new Uint8Array(w * h);
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  let best = null;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = idx(x, y, w);
      if (visited[k]) continue;
      const a = data[(k * c) + 3];
      if (a <= 8) continue;

      const queue = [k];
      const pixels = [];
      visited[k] = 1;
      let area = 0;

      while (queue.length) {
        const cur = queue.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);
        area++;

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nk = idx(nx, ny, w);
          if (visited[nk]) continue;
          const na = data[(nk * c) + 3];
          if (na <= 8) continue;
          visited[nk] = 1;
          queue.push(nk);
        }
      }

      if (!best || area > best.area) {
        best = { area, pixels };
      }
    }
  }

  if (!best) return buffer;

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    out[(i * c) + 3] = 0;
  }
  for (const p of best.pixels) {
    const i = p * c;
    out[i + 3] = data[i + 3];
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function defringeAlpha(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const neighbors = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (idx(x, y, w) * c);
      const a = data[i + 3];
      if (a === 0 || a >= 250) continue;

      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;

      for (const [dx, dy] of neighbors) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = (idx(nx, ny, w) * c);
        const na = data[ni + 3];
        if (na < 180) continue;
        sr += data[ni];
        sg += data[ni + 1];
        sb += data[ni + 2];
        n++;
      }

      if (n > 0) {
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function removeSmallAlphaComponents(buffer, minArea = 120) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const visited = new Uint8Array(w * h);
  const keep = new Uint8Array(w * h);
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (visited[p]) continue;
      const a = data[(p * c) + 3];
      if (a <= 12) continue;

      const queue = [p];
      const pixels = [];
      visited[p] = 1;

      while (queue.length) {
        const cur = queue.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (visited[np]) continue;
          const na = data[(np * c) + 3];
          if (na <= 12) continue;
          visited[np] = 1;
          queue.push(np);
        }
      }

      if (pixels.length >= minArea) {
        for (const q of pixels) keep[q] = 1;
      }
    }
  }

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    if (!keep[i]) out[(i * c) + 3] = 0;
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function adjustBrownStripeInward(buffer, inwardPx = 9) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  // Apply only when dominant opaque tone is clearly brown.
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let cnt = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 160) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 45 || (max - min) < 14) continue;
      // Ignore stripe whites while sampling dominant tone.
      if (max > 170 && (max - min) < 36) continue;
      sumR += r;
      sumG += g;
      sumB += b;
      cnt++;
    }
  }
  if (cnt < 500) return buffer;
  const avgR = sumR / cnt;
  const avgG = sumG / cnt;
  const avgB = sumB / cnt;
  const isBrown = avgR > avgG + 12 && avgG > avgB + 6 && avgR > 70;
  if (!isBrown) return buffer;

  const mask = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);
  const comps = [];
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      const i = p * c;
      const a = data[i + 3];
      if (a < 120) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 170 || (max - min) > 32) continue;
      mask[p] = 1;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (!mask[p] || visited[p]) continue;
      const queue = [p];
      visited[p] = 1;
      const pixels = [];
      let sx = 0;
      let sy = 0;
      while (queue.length) {
        const cur = queue.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);
        sx += cx;
        sy += cy;
        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (!mask[np] || visited[np]) continue;
          visited[np] = 1;
          queue.push(np);
        }
      }
      if (pixels.length >= 16) {
        comps.push({ pixels, cx: sx / pixels.length, cy: sy / pixels.length });
      }
    }
  }

  const centerX = w / 2;
  const centerY = h * 0.44;

  // Paint over old stripe positions with nearby leather tones.
  for (const comp of comps) {
    for (const p of comp.pixels) {
      const y = Math.floor(p / w);
      const x = p - (y * w);
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let oy = -3; oy <= 3; oy++) {
        for (let ox = -3; ox <= 3; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (mask[np]) continue;
          const ni = np * c;
          const na = data[ni + 3];
          if (na < 120) continue;
          sr += data[ni];
          sg += data[ni + 1];
          sb += data[ni + 2];
          n++;
        }
      }
      if (n > 0) {
        const i = p * c;
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      }
    }
  }

  // Repaint stripes inward toward knot center.
  for (const comp of comps) {
    let dx = centerX - comp.cx;
    let dy = centerY - comp.cy;
    const mag = Math.sqrt((dx * dx) + (dy * dy)) || 1;
    dx = Math.round((dx / mag) * inwardPx);
    dy = Math.round((dy / mag) * inwardPx);

    for (const p of comp.pixels) {
      const y = Math.floor(p / w);
      const x = p - (y * w);
      const nx = clamp(x + dx, 0, w - 1);
      const ny = clamp(y + dy, 0, h - 1);
      const si = p * c;
      const di = idx(nx, ny, w) * c;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = Math.max(out[di + 3], data[si + 3]);
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enhanceBlack11Gold(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const mask = new Uint8Array(w * h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      const i = p * c;
      const a = data[i + 3];
      if (a < 220) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (x < Math.floor(w * 0.58) || y < Math.floor(h * 60 / 100)) continue;
      if (max < 170 || (max - min) > 24) continue;
      mask[p] = 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return buffer;
  }

  // Slight dilation to make lines thicker.
  const thick = new Uint8Array(w * h);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = idx(x, y, w);
      if (!mask[p]) continue;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = idx(nx, ny, w) * c;
          if (data[ni + 3] < 220) continue;
          thick[idx(nx, ny, w)] = 1;
        }
      }
    }
  }

  const span = Math.max(1, maxX - minX);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = idx(x, y, w);
      if (!thick[p]) continue;
      const i = p * c;
      const t = (x - minX) / span;
      const shine = Math.sin(t * Math.PI) * 0.35;
      const r = clamp(Math.round(150 + (90 * t) + (40 * shine)), 0, 255);
      const g = clamp(Math.round(118 + (70 * t) + (36 * shine)), 0, 255);
      const b = clamp(Math.round(30 + (26 * t) + (22 * shine)), 0, 255);
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
      out[i + 3] = Math.max(out[i + 3], 230);
    }
  }

  // Subtle gloss on top area of stripe group.
  const glossBottom = minY + Math.floor((maxY - minY) * 0.28);
  for (let y = minY; y <= glossBottom; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = idx(x, y, w);
      if (!thick[p]) continue;
      const i = p * c;
      out[i] = clamp(out[i] + 18, 0, 255);
      out[i + 1] = clamp(out[i + 1] + 18, 0, 255);
      out[i + 2] = clamp(out[i + 2] + 10, 0, 255);
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function cleanupBlack5Spill(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const cutX1 = Math.floor(w * 0.92);
  const cutY1 = Math.floor(h * 0.64);
  const cutX2 = Math.floor(w * 0.89);
  const cutY2 = Math.floor(h * 0.78);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      if (out[i + 3] === 0) continue;
      if ((x >= cutX1 && y >= cutY1) || (x >= cutX2 && y >= cutY2)) {
        out[i + 3] = 0;
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceBlack5FourStripes(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  // Remove pre-existing gold-like marks on the right tip area.
  const xMin = Math.floor(w * 0.60);
  const yMin = Math.floor(h * 0.52);
  for (let y = yMin; y < h; y++) {
    for (let x = xMin; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = out[i + 3];
      if (a < 80) continue;
      const r = out[i];
      const g = out[i + 1];
      const b = out[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (r > 120 && g > 90 && b < 110 && (max - min) <= 70) {
        out[i] = 44;
        out[i + 1] = 44;
        out[i + 2] = 44;
      }
    }
  }

  const base = await sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
  const stripeW = Math.max(10, Math.round(w * 0.018));
  const stripeH = Math.max(72, Math.round(h * 0.14));
  const gap = Math.max(7, Math.round(stripeW * 0.7));
  const startX = Math.round(w * 0.695);
  const startY = Math.round(h * 0.63);

  const rects = Array.from({ length: 4 }, (_, n) => {
    const x = startX + (n * (stripeW + gap));
    return `<rect x="${x}" y="${startY}" width="${stripeW}" height="${stripeH}" rx="2" fill="url(#gold)"/>`;
  }).join('');

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#8f6c18"/>
        <stop offset="45%" stop-color="#d7b24a"/>
        <stop offset="65%" stop-color="#f3db86"/>
        <stop offset="100%" stop-color="#a37a1f"/>
      </linearGradient>
    </defs>
    <g transform="rotate(-18 ${Math.round(w * 0.77)} ${Math.round(h * 0.76)})">
      ${rects}
    </g>
  </svg>`;

  return sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}

async function softenBelt(buffer, blurSigma = 0.55, sharpenSigma = 1.05) {
  return sharp(buffer)
    .blur(blurSigma)
    .sharpen({ sigma: sharpenSigma, m1: 0.7, m2: 0.9, x1: 2, y2: 10, y3: 20 })
    .png()
    .toBuffer();
}

async function ensureStripesSingleSide(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const stripeMask = new Uint8Array(w * h);
  const visited = new Uint8Array(w * h);
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      const i = p * c;
      const a = data[i + 3];
      if (a < 120) continue;
      if (y < Math.floor(h * 0.50)) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      if (max < 170 || sat > 34) continue;
      stripeMask[p] = 1;
    }
  }

  const comps = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (!stripeMask[p] || visited[p]) continue;
      const queue = [p];
      visited[p] = 1;
      const pixels = [];
      let minX = w;
      let minY = h;
      let maxX = -1;
      let maxY = -1;
      let sumX = 0;

      while (queue.length) {
        const cur = queue.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);
        sumX += cx;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (!stripeMask[np] || visited[np]) continue;
          visited[np] = 1;
          queue.push(np);
        }
      }

      if (pixels.length < 12) continue;
      const cx = sumX / pixels.length;
      const isSideStripe = Math.abs(cx - (w / 2)) > (w * 0.10);
      if (!isSideStripe) continue;
      comps.push({ pixels, cx, minX, minY, maxX, maxY, area: pixels.length });
    }
  }

  if (!comps.length) return buffer;

  // Keep stripes only on right tip (same visual convention as black belts).
  const removeLeft = true;

  // Remove stripe marks from weaker side, filling with nearby belt color.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const isRemoveSide = removeLeft ? (x < (w / 2)) : (x >= (w / 2));
      if (!isRemoveSide) continue;
      const p = idx(x, y, w);
      if (!stripeMask[p]) continue;

      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let oy = -4; oy <= 4; oy++) {
        for (let ox = -4; ox <= 4; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (stripeMask[np]) continue;
          const ni = np * c;
          if (data[ni + 3] < 90) continue;
          sr += data[ni];
          sg += data[ni + 1];
          sb += data[ni + 2];
          n++;
        }
      }

      const i = p * c;
      if (n > 0) {
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      } else {
        out[i] = 90;
        out[i + 1] = 62;
        out[i + 2] = 46;
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function cleanupBrown2LeftTipStripes(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const xMax = Math.floor(w * 0.48);
  const yMin = Math.floor(h * 0.53);

  for (let y = yMin; y < h; y++) {
    for (let x = 0; x < xMax; x++) {
      const p = idx(x, y, w);
      const i = p * c;
      const a = data[i + 3];
      if (a < 100) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;

      // Stripe-like bright neutral marks in the left tip area.
      if (max < 130 || sat > 60) continue;

      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let oy = -5; oy <= 5; oy++) {
        for (let ox = -5; ox <= 5; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          const ni = np * c;
          const na = data[ni + 3];
          if (na < 100) continue;
          const nr = data[ni];
          const ng = data[ni + 1];
          const nb = data[ni + 2];
          const nMax = Math.max(nr, ng, nb);
          const nMin = Math.min(nr, ng, nb);
          const nSat = nMax - nMin;
          // Prefer nearby brown leather tones.
          const isBrownish = nr > (ng + 4) && ng > (nb - 6) && nMax >= 52 && nMax <= 175 && nSat >= 12 && nSat <= 95;
          if (!isBrownish) continue;
          sr += nr;
          sg += ng;
          sb += nb;
          n++;
        }
      }

      if (n > 0) {
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function smoothBrown2Pixelation(buffer) {
  const meta = await sharp(buffer).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;
  const upW = Math.round(w * 1.45);
  const upH = Math.round(h * 1.45);
  return sharp(buffer)
    .resize(upW, upH, { kernel: 'mitchell' })
    .median(1)
    .resize(w, h, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
}

async function buildBrown2FromBrown1(referenceBuffer) {
  return buildBrownFromBrown1(referenceBuffer, 3);
}

async function applyAlphaMask(colorBuffer, alphaSourceBuffer, hardThreshold = null) {
  const color = await sharp(colorBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaSrc = await sharp(alphaSourceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (color.info.width !== alphaSrc.info.width || color.info.height !== alphaSrc.info.height) {
    return colorBuffer;
  }

  const w = color.info.width;
  const h = color.info.height;
  const c = color.info.channels;
  const out = Buffer.from(color.data);
  for (let i = 0; i < w * h; i++) {
    const ai = (i * c) + 3;
    const srcA = alphaSrc.data[ai];
    const masked = Math.min(out[ai], srcA);
    if (hardThreshold === null) {
      out[ai] = masked;
    } else {
      out[ai] = srcA >= hardThreshold ? 255 : 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function decontaminateAlphaEdges(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      const i = p * c;
      const a = data[i + 3];
      if (a <= 0 || a >= 240) continue;

      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          const ni = np * c;
          if (data[ni + 3] < 245) continue;
          sr += data[ni];
          sg += data[ni + 1];
          sb += data[ni + 2];
          n++;
        }
      }

      if (n > 0) {
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function replaceAlphaFromSource(colorBuffer, alphaSourceBuffer) {
  const color = await sharp(colorBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaSrc = await sharp(alphaSourceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (color.info.width !== alphaSrc.info.width || color.info.height !== alphaSrc.info.height) {
    return colorBuffer;
  }

  const w = color.info.width;
  const h = color.info.height;
  const c = color.info.channels;
  const ac = alphaSrc.info.channels;
  const out = Buffer.from(color.data);

  for (let i = 0; i < w * h; i++) {
    const ai = (i * c) + 3;
    const srcA = alphaSrc.data[(i * ac) + 3];
    out[ai] = srcA;
    if (srcA === 0) {
      out[(i * c)] = 0;
      out[(i * c) + 1] = 0;
      out[(i * c) + 2] = 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function cleanAlphaSpikes(buffer, alphaThreshold = 96) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = data[(i * c) + 3] >= alphaThreshold ? 1 : 0;
  }

  const eroded = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let ok = 1;
      for (let oy = -1; oy <= 1 && ok; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (!mask[idx(x + ox, y + oy, w)]) {
            ok = 0;
            break;
          }
        }
      }
      eroded[idx(x, y, w)] = ok;
    }
  }

  const opened = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let on = 0;
      for (let oy = -1; oy <= 1 && !on; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (eroded[idx(x + ox, y + oy, w)]) {
            on = 1;
            break;
          }
        }
      }
      opened[idx(x, y, w)] = on;
    }
  }

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    if (!opened[i]) {
      out[(i * c) + 3] = 0;
      out[(i * c)] = 0;
      out[(i * c) + 1] = 0;
      out[(i * c) + 2] = 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

function smoothSeries(values, radius = 12) {
  const n = values.length;
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let k = i - radius; k <= i + radius; k++) {
      if (k < 0 || k >= n) continue;
      const v = values[k];
      if (v < 0) continue;
      sum += v;
      count++;
    }
    out[i] = count > 0 ? Math.round(sum / count) : values[i];
  }
  return out;
}

async function smoothAlphaBoundary(buffer, alphaThreshold = 96) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const top = new Int32Array(w).fill(-1);
  const left = new Int32Array(h).fill(-1);
  const right = new Int32Array(h).fill(-1);

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const a = data[(idx(x, y, w) * c) + 3];
      if (a >= alphaThreshold) {
        top[x] = y;
        break;
      }
    }
  }

  for (let y = 0; y < h; y++) {
    let l = -1;
    let r = -1;
    for (let x = 0; x < w; x++) {
      const a = data[(idx(x, y, w) * c) + 3];
      if (a >= alphaThreshold) {
        l = x;
        break;
      }
    }
    for (let x = w - 1; x >= 0; x--) {
      const a = data[(idx(x, y, w) * c) + 3];
      if (a >= alphaThreshold) {
        r = x;
        break;
      }
    }
    left[y] = l;
    right[y] = r;
  }

  const topSm = smoothSeries(top, 18);
  const leftSm = smoothSeries(left, 14);
  const rightSm = smoothSeries(right, 14);

  for (let x = 0; x < w; x++) {
    const ty = topSm[x];
    if (ty < 0) continue;
    const cut = Math.max(0, ty - 1);
    for (let y = 0; y < cut; y++) {
      const i = idx(x, y, w) * c;
      out[i + 3] = 0;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
  }

  for (let y = 0; y < h; y++) {
    const l = leftSm[y];
    const r = rightSm[y];
    if (l < 0 || r < 0) continue;
    for (let x = 0; x < l; x++) {
      const i = idx(x, y, w) * c;
      out[i + 3] = 0;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
    for (let x = r + 1; x < w; x++) {
      const i = idx(x, y, w) * c;
      out[i + 3] = 0;
      out[i] = 0;
      out[i + 1] = 0;
      out[i + 2] = 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function cleanTipStripeResidue(buffer, mode = 'brown') {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const yMin = Math.floor(h * 0.56);
  const leftMax = Math.floor(w * 0.35);
  const rightMin = Math.floor(w * 0.65);

  for (let y = yMin; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const onTip = x <= leftMax || x >= rightMin;
      if (!onTip) continue;
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 100) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;

      const looksLikeStripe = max >= 138 && sat <= 56;
      if (!looksLikeStripe) continue;

      let sr = 0;
      let sg = 0;
      let sb = 0;
      let n = 0;
      for (let oy = -5; oy <= 5; oy++) {
        for (let ox = -5; ox <= 5; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = idx(nx, ny, w) * c;
          const na = data[ni + 3];
          if (na < 120) continue;
          const nr = data[ni];
          const ng = data[ni + 1];
          const nb = data[ni + 2];
          const nMax = Math.max(nr, ng, nb);
          const nMin = Math.min(nr, ng, nb);
          const nSat = nMax - nMin;

          let ok = false;
          if (mode === 'brown') {
            ok = nr > (ng + 4) && ng > (nb - 7) && nMax >= 44 && nMax <= 170 && nSat >= 10 && nSat <= 98;
          } else {
            ok = nMax <= 110 && nSat <= 40;
          }
          if (!ok) continue;

          sr += nr;
          sg += ng;
          sb += nb;
          n++;
        }
      }

      if (n > 0) {
        out[i] = Math.round(sr / n);
        out[i + 1] = Math.round(sg / n);
        out[i + 2] = Math.round(sb / n);
      }
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function mirrorRightTipFromLeft(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  const yMin = Math.floor(h * 0.55);
  const leftBandMin = Math.floor(w * 0.10);
  const leftBandMax = Math.floor(w * 0.34);

  for (let y = yMin; y < h; y++) {
    for (let lx = leftBandMin; lx <= leftBandMax; lx++) {
      const rx = (w - 1) - lx;
      if (rx < 0 || rx >= w) continue;

      const li = idx(lx, y, w) * c;
      const ri = idx(rx, y, w) * c;
      const la = data[li + 3];
      if (la < 40) continue;

      out[ri] = data[li];
      out[ri + 1] = data[li + 1];
      out[ri + 2] = data[li + 2];
      out[ri + 3] = la;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function buildBrownFromBrown1(referenceBuffer, count) {
  let base = await cleanupBrown2LeftTipStripes(referenceBuffer);
  base = await cleanTipStripeResidue(base, 'brown');
  const meta = await sharp(base).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;

  const stripeW = Math.max(200, Math.round(w * 0.34));
  const stripeH = Math.max(18, Math.round(h * 0.036));
  const gap = Math.max(8, Math.round(h * 0.014));
  const startX = Math.round(w * 0.50);
  const bottomAnchorY = Math.round(h * 0.75);
  const startY = bottomAnchorY - ((Math.max(0, count - 1)) * (stripeH + gap));

  const stripes = Array.from({ length: Math.max(0, count) }, (_, n) => {
    const y = startY + (n * (stripeH + gap));
    return `<rect x="${startX}" y="${y}" width="${stripeW}" height="${stripeH}" rx="2.2" fill="#ffffff"/>`;
  }).join('');

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${stripes}
  </svg>`;

  const painted = await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  return applyAlphaMask(painted, base);
}

async function buildTipStripesFromBase(referenceBuffer, count, tone = 'white') {
  const meta = await sharp(referenceBuffer).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;

  let base = referenceBuffer;

  if (count <= 0) return base;

  const stripeW = Math.max(200, Math.round(w * 0.34));
  const stripeH = Math.max(18, Math.round(h * 0.036));
  const gap = Math.max(8, Math.round(h * 0.014));
  const startX = Math.round(w * 0.50);
  const bottomAnchorY = Math.round(h * 0.75);
  const startY = bottomAnchorY - ((Math.max(0, count - 1)) * (stripeH + gap));

  const fill = tone === 'gold' ? 'url(#gold)' : '#ffffff';
  const stripes = Array.from({ length: count }, (_, n) => {
    const y = startY + (n * (stripeH + gap));
    return `<rect x="${startX}" y="${y}" width="${stripeW}" height="${stripeH}" rx="2.2" fill="${fill}"/>`;
  }).join('');

  const defs = '';

  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${stripes}
  </svg>`;

  const painted = await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  return applyAlphaMask(painted, referenceBuffer);
}

async function patchBrown2LeftTipFromBrown1(targetBuffer, referenceBuffer) {
  const t = await sharp(targetBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = await sharp(referenceBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = t.info.width;
  const h = t.info.height;
  const c = t.info.channels;
  if (w !== r.info.width || h !== r.info.height || c !== r.info.channels) return targetBuffer;

  const out = Buffer.from(t.data);
  const xMax = Math.floor(w * 0.46);
  const yMin = Math.floor(h * 0.53);

  for (let y = yMin; y < h; y++) {
    for (let x = 0; x < xMax; x++) {
      const i = idx(x, y, w) * c;
      if (r.data[i + 3] < 70) continue;
      out[i] = r.data[i];
      out[i + 1] = r.data[i + 1];
      out[i + 2] = r.data[i + 2];
      out[i + 3] = r.data[i + 3];
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function removeBrownLeftDebris(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const visited = new Uint8Array(w * h);
  const comps = [];
  const nb = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (visited[p]) continue;
      const a = data[(p * c) + 3];
      if (a < 22) continue;

      const q = [p];
      visited[p] = 1;
      const pixels = [];
      let sx = 0;
      let sy = 0;

      while (q.length) {
        const cur = q.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);
        sx += cx;
        sy += cy;

        for (const [dx, dy] of nb) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (visited[np]) continue;
          const na = data[(np * c) + 3];
          if (na < 22) continue;
          visited[np] = 1;
          q.push(np);
        }
      }

      comps.push({
        pixels,
        area: pixels.length,
        cx: sx / pixels.length,
        cy: sy / pixels.length
      });
    }
  }

  if (comps.length <= 1) return buffer;
  comps.sort((a, b) => b.area - a.area);
  const main = comps[0];
  const keepSet = new Set(main.pixels);

  const out = Buffer.from(data);
  for (let i = 1; i < comps.length; i++) {
    const comp = comps[i];
    const inProblemZone = comp.cx < (w * 0.58) && comp.cy > (h * 0.42);
    if (!inProblemZone) continue;
    for (const p of comp.pixels) {
      if (keepSet.has(p)) continue;
      out[(p * c) + 3] = 0;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function cleanAlphaFromStrongCore(buffer, strongAlpha = 150, fringeRadius = 2) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  const strong = new Uint8Array(w * h);
  const vis = new Uint8Array(w * h);
  const nb = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let i = 0; i < w * h; i++) {
    if (data[(i * c) + 3] >= strongAlpha) strong[i] = 1;
  }

  let best = null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (!strong[p] || vis[p]) continue;
      const q = [p];
      vis[p] = 1;
      const pixels = [];
      while (q.length) {
        const cur = q.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        pixels.push(cur);
        for (const [dx, dy] of nb) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const np = idx(nx, ny, w);
          if (!strong[np] || vis[np]) continue;
          vis[np] = 1;
          q.push(np);
        }
      }
      if (!best || pixels.length > best.length) best = pixels;
    }
  }

  if (!best || best.length < 10) return buffer;

  const keep = new Uint8Array(w * h);
  for (const p of best) keep[p] = 1;

  // Keep a small fringe around the core for natural antialiasing.
  const fringe = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = idx(x, y, w);
      if (!keep[p]) continue;
      for (let oy = -fringeRadius; oy <= fringeRadius; oy++) {
        for (let ox = -fringeRadius; ox <= fringeRadius; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          fringe[idx(nx, ny, w)] = 1;
        }
      }
    }
  }

  const out = Buffer.from(data);
  for (let i = 0; i < w * h; i++) {
    if (!fringe[i]) out[(i * c) + 3] = 0;
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}


async function enforceWhiteBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.34) + (g * 0.42) + (b * 0.24);

      // Preserve folds/stitching by mapping luminance to a soft white ramp.
      const tone = clamp(Math.round(198 + (base * 0.22)), 175, 245);
      out[i] = tone;
      out[i + 1] = tone;
      out[i + 2] = clamp(tone + 2, 175, 247);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceYellowBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.40) + (g * 0.46) + (b * 0.14);

      // Keep folds but map to a clear yellow ramp.
      out[i] = clamp(Math.round(205 + (base * 0.18)), 185, 248);
      out[i + 1] = clamp(Math.round(162 + (base * 0.16)), 140, 220);
      out[i + 2] = clamp(Math.round(28 + (base * 0.06)), 16, 78);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceOrangeBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.45) + (g * 0.38) + (b * 0.17);

      // Keep folds/texture while mapping to orange.
      out[i] = clamp(Math.round(214 + (base * 0.14)), 190, 250);
      out[i + 1] = clamp(Math.round(106 + (base * 0.11)), 76, 180);
      out[i + 2] = clamp(Math.round(24 + (base * 0.05)), 10, 66);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforcePurpleBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.34) + (g * 0.33) + (b * 0.33);

      // Keep folds/texture while mapping to purple.
      out[i] = clamp(Math.round(112 + (base * 0.10)), 82, 172);
      out[i + 1] = clamp(Math.round(54 + (base * 0.08)), 34, 116);
      out[i + 2] = clamp(Math.round(156 + (base * 0.16)), 116, 232);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceBrownBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.41) + (g * 0.36) + (b * 0.23);

      out[i] = clamp(Math.round(78 + (base * 0.30)), 54, 162);
      out[i + 1] = clamp(Math.round(42 + (base * 0.19)), 26, 108);
      out[i + 2] = clamp(Math.round(24 + (base * 0.12)), 12, 82);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceBlackBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.34) + (g * 0.40) + (b * 0.26);

      const tone = clamp(Math.round(14 + (base * 0.06)), 8, 42);
      out[i] = tone;
      out[i + 1] = tone;
      out[i + 2] = clamp(tone + 2, 10, 44);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceRedBelt(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const out = Buffer.from(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y, w) * c;
      const a = data[i + 3];
      if (a < 24) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const base = (r * 0.40) + (g * 0.34) + (b * 0.26);

      out[i] = clamp(Math.round(186 + (base * 0.20)), 150, 250);
      out[i + 1] = clamp(Math.round(28 + (base * 0.08)), 8, 86);
      out[i + 2] = clamp(Math.round(28 + (base * 0.08)), 8, 86);
      out[i + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels: c } }).png().toBuffer();
}

async function enforceRedBlackBelt(buffer) {
  let base = await enforceRedBelt(buffer);
  const meta = await sharp(base).metadata();
  const w = meta.width || 512;
  const h = meta.height || 512;

  // Blacken the right side to obtain a clear red/black split style.
  const svg = `
  <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <g opacity="0.92">
      <path d="M ${Math.round(w * 0.62)} ${Math.round(h * 0.18)} L ${Math.round(w * 0.92)} ${Math.round(h * 0.18)} L ${Math.round(w * 0.92)} ${Math.round(h * 0.74)} L ${Math.round(w * 0.70)} ${Math.round(h * 0.92)} L ${Math.round(w * 0.58)} ${Math.round(h * 0.92)} L ${Math.round(w * 0.72)} ${Math.round(h * 0.70)} L ${Math.round(w * 0.73)} ${Math.round(h * 0.22)} Z" fill="#141414"/>
    </g>
  </svg>`;

  base = await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  return applyAlphaMask(base, buffer);
}


async function makeTransparentBg(inputBuffer, width, height, tolerance = 24) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const channels = info.channels;

  // Estimate background color from image border.
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  const border = clamp(Math.floor(Math.min(width, height) * 0.06), 1, 20);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder = x < border || y < border || x >= (width - border) || y >= (height - border);
      if (!isBorder) continue;
      const idx = ((y * width) + x) * channels;
      sumR += out[idx];
      sumG += out[idx + 1];
      sumB += out[idx + 2];
      count++;
    }
  }

  const bgR = Math.round(sumR / Math.max(1, count));
  const bgG = Math.round(sumG / Math.max(1, count));
  const bgB = Math.round(sumB / Math.max(1, count));

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max - min;
    const dr = r - bgR;
    const dg = g - bgG;
    const db = b - bgB;
    const dist = Math.sqrt((dr * dr) + (dg * dg) + (db * db));

    // Remove low-saturation background near border color (checker/pattern).
    if (dist <= tolerance && sat <= 24) {
      out[i + 3] = 0;
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function trimAlpha(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const c = info.channels;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y * w) + x) * c;
      const a = data[i + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { buffer, width: w, height: h };
  }

  const width = (maxX - minX) + 1;
  const height = (maxY - minY) + 1;
  const trimmed = await sharp(buffer).extract({ left: minX, top: minY, width, height }).png().toBuffer();
  return { buffer: trimmed, width, height };
}

async function placeOnCanvas(buffer, canvasW, canvasH, offsetYRatio = 0.12, fitWidthRatio = 0) {
  let input = buffer;
  let meta = await sharp(input).metadata();
  let w = meta.width || 1;
  let h = meta.height || 1;

  if (fitWidthRatio > 0 && fitWidthRatio <= 1) {
    const targetW = Math.max(1, Math.floor(canvasW * fitWidthRatio));
    if (w !== targetW) {
      input = await sharp(input)
        .resize({ width: targetW, fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer();
      meta = await sharp(input).metadata();
      w = meta.width || 1;
      h = meta.height || 1;
    }
  }

  if (w > canvasW || h > canvasH) {
    input = await sharp(input)
      .resize({ width: canvasW, height: canvasH, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
    meta = await sharp(input).metadata();
    w = meta.width || 1;
    h = meta.height || 1;
  }

  const left = Math.floor((canvasW - w) / 2);
  const top = Math.floor((canvasH - h) * offsetYRatio);

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{ input, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

async function detectComponentsFromSheet(sourcePath, tolerance, minArea = 500) {
  const meta = await sharp(sourcePath).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error('Invalid source dimensions for component detection.');

  const raw = await sharp(sourcePath).png().toBuffer();
  const transparent = await makeTransparentBg(raw, width, height, tolerance);
  const { data, info } = await sharp(transparent).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const c = info.channels;
  const visited = new Uint8Array(w * h);
  const comps = [];

  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1]
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w) + x;
      if (visited[idx]) continue;
      const a = data[(idx * c) + 3];
      if (a <= 8) continue;

      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;

      const queue = [idx];
      visited[idx] = 1;

      while (queue.length) {
        const cur = queue.pop();
        const cy = Math.floor(cur / w);
        const cx = cur - (cy * w);
        area++;

        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const nIdx = (ny * w) + nx;
          if (visited[nIdx]) continue;
          const na = data[(nIdx * c) + 3];
          if (na <= 8) continue;
          visited[nIdx] = 1;
          queue.push(nIdx);
        }
      }

      if (area >= minArea) {
        comps.push({ minX, minY, maxX, maxY, area, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 });
      }
    }
  }

  // Keep largest components and order by reading flow.
  comps.sort((a, b) => b.area - a.area);
  return comps;
}

async function buildContactSheet(files, outputPath) {
  if (!files.length) return;

  const metas = await Promise.all(files.map((f) => sharp(f).metadata()));
  const maxW = Math.max(...metas.map((m) => m.width || 0));
  const maxH = Math.max(...metas.map((m) => m.height || 0));
  const cols = 5;
  const rows = Math.ceil(files.length / cols);
  const pad = 18;

  const sheetW = (maxW * cols) + (pad * (cols + 1));
  const sheetH = (maxH * rows) + (pad * (rows + 1));

  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const meta = metas[i];
    const left = pad + (col * (maxW + pad)) + Math.floor((maxW - (meta.width || 0)) / 2);
    const top = pad + (row * (maxH + pad)) + Math.floor((maxH - (meta.height || 0)) / 2);
    composites.push({ input: files[i], left, top });
  }

  await sharp({
    create: {
      width: sheetW,
      height: sheetH,
      channels: 4,
      background: { r: 248, g: 250, b: 255, alpha: 1 }
    }
  })
    .composite(composites)
    .png()
    .toFile(outputPath);
}

async function main() {
  const args = parseArgs(process.argv);

  const source = args.source;
  const cols = Number(args.cols);
  const rows = Number(args.rows);
  const namesFile = args.names;
  const outDir = args.out;

  const sheetCropTop = toNum(args.sheetCropTop, 0);
  const sheetCropBottom = toNum(args.sheetCropBottom, 0);
  const sheetCropLeft = toNum(args.sheetCropLeft, 0);
  const sheetCropRight = toNum(args.sheetCropRight, 0);
  const cellInsetTop = toNum(args.cellInsetTop, 0);
  const cellInsetBottom = toNum(args.cellInsetBottom, 0);
  const cellInsetLeft = toNum(args.cellInsetLeft, 0);
  const cellInsetRight = toNum(args.cellInsetRight, 0);
  const rowInsetTop = parseList(args.rowInsetTop);
  const rowInsetBottom = parseList(args.rowInsetBottom);
  const rowInsetLeft = parseList(args.rowInsetLeft);
  const rowInsetRight = parseList(args.rowInsetRight);
  const transparentBg = String(args.transparentBg || 'false').toLowerCase() === 'true';
  const bgTolerance = toNum(args.bgTolerance, 24);
  const detectComponents =
    String(args.detectComponents || 'false').toLowerCase() === 'true' ||
    args.detect === true;
  const detectMinArea = toNum(args.detectMinArea || args.minComp, 700);
  const componentPad = toNum(args.componentPad, 6);
  const normalizeCanvas =
    String(args.normalizeCanvas || 'false').toLowerCase() === 'true' ||
    args.normalize === true ||
    args.targetW !== undefined ||
    args.targetH !== undefined;
  const canvasWidth = toNum(args.canvasWidth || args.targetW, 0);
  const canvasHeight = toNum(args.canvasHeight || args.targetH, 0);
  const anchorTop = toNum(args.anchorTop, 0.12);
  const fitWidthRatio = toNum(args.fitWidthRatio, 0);
  const cellIndices = parseList(args.indices);
  let contactSheet = null;

  if (!source || !namesFile || !outDir || !Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
    console.error('Missing required args.');
    console.error('Required: --source <file> --cols <n> --rows <n> --names <json> --out <folder>');
    process.exit(1);
  }

  const sourcePath = absFromCwd(source);
  const namesPath = absFromCwd(namesFile);
  const outPath = absFromCwd(outDir);
  contactSheet = args.contactSheet === true
    ? path.join(outPath, 'contact-sheet.png')
    : (args.contactSheet ? absFromCwd(args.contactSheet) : null);

  if (!fs.existsSync(sourcePath)) {
    console.error('Source file not found:', sourcePath);
    process.exit(1);
  }
  if (!fs.existsSync(namesPath)) {
    console.error('Names JSON not found:', namesPath);
    process.exit(1);
  }

  const names = JSON.parse(fs.readFileSync(namesPath, 'utf8'));
  if (!Array.isArray(names) || names.length === 0) {
    console.error('Names JSON must be a non-empty array.');
    process.exit(1);
  }

  if (!detectComponents) {
    const maxCells = cols * rows;
    if (names.length > maxCells) {
      console.error(`Names (${names.length}) exceed grid capacity (${maxCells}).`);
      process.exit(1);
    }
  }

  fs.mkdirSync(outPath, { recursive: true });

  const img = sharp(sourcePath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) {
    console.error('Could not read source dimensions.');
    process.exit(1);
  }

  const belts = [];
  let cellW = 0;
  let cellH = 0;

  if (detectComponents) {
    const compsAll = await detectComponentsFromSheet(sourcePath, bgTolerance, detectMinArea);
    if (compsAll.length < names.length) {
      throw new Error(`Detected ${compsAll.length} components, expected at least ${names.length}.`);
    }

    const comps = compsAll.slice(0, names.length);
    comps.sort((a, b) => {
      const rowBand = 90;
      const ra = Math.round(a.cy / rowBand);
      const rb = Math.round(b.cy / rowBand);
      if (ra !== rb) return ra - rb;
      return a.cx - b.cx;
    });

    for (let i = 0; i < names.length; i++) {
      const c = comps[i];
      const fileName = names[i];
      const left = Math.max(0, c.minX - componentPad);
      const top = Math.max(0, c.minY - componentPad);
      const right = Math.min(meta.width - 1, c.maxX + componentPad);
      const bottom = Math.min(meta.height - 1, c.maxY + componentPad);
      const width = Math.max(1, (right - left) + 1);
      const height = Math.max(1, (bottom - top) + 1);
      belts.push({ fileName, left, top, width, height });
      cellW = Math.max(cellW, width);
      cellH = Math.max(cellH, height);
    }
  } else {
    const workLeft = Math.max(0, sheetCropLeft);
    const workTop = Math.max(0, sheetCropTop);
    const workWidth = Math.max(1, meta.width - workLeft - Math.max(0, sheetCropRight));
    const workHeight = Math.max(1, meta.height - workTop - Math.max(0, sheetCropBottom));

    const colStarts = Array.from({ length: cols + 1 }, (_, i) =>
      workLeft + Math.round((i * workWidth) / cols)
    );
    const rowStarts = Array.from({ length: rows + 1 }, (_, i) =>
      workTop + Math.round((i * workHeight) / rows)
    );

    cellW = Math.round(workWidth / cols);
    cellH = Math.round(workHeight / rows);

    let useIndices = cellIndices;
    if (!useIndices) {
      useIndices = Array.from({ length: names.length }, (_, i) => i);
    }

    if (useIndices.length < names.length) {
      console.error('Not enough cell indices for names length.');
      process.exit(1);
    }

    names.forEach((fileName, i) => {
      const idx = Number(useIndices[i]);
      const col = idx % cols;
      const row = Math.floor(idx / cols);

    const topInset = rowInsetTop && Number.isFinite(Number(rowInsetTop[row]))
      ? Number(rowInsetTop[row])
      : cellInsetTop;
    const bottomInset = rowInsetBottom && Number.isFinite(Number(rowInsetBottom[row]))
      ? Number(rowInsetBottom[row])
      : cellInsetBottom;
    const leftInset = rowInsetLeft && Number.isFinite(Number(rowInsetLeft[row]))
      ? Number(rowInsetLeft[row])
      : cellInsetLeft;
    const rightInset = rowInsetRight && Number.isFinite(Number(rowInsetRight[row]))
      ? Number(rowInsetRight[row])
      : cellInsetRight;

      const baseLeft = colStarts[col];
      const baseTop = rowStarts[row];
      const baseW = colStarts[col + 1] - colStarts[col];
      const baseH = rowStarts[row + 1] - rowStarts[row];

      const insetW = baseW - leftInset - rightInset;
      const insetH = baseH - topInset - bottomInset;
      if (insetW <= 0 || insetH <= 0) {
        throw new Error(`Invalid inset for row ${row}. Insets exceed cell dimensions.`);
      }

      const left = baseLeft + leftInset;
      const top = baseTop + topInset;
      belts.push({ fileName, left, top, width: insetW, height: insetH });
    });
  }

  const processed = [];
  for (const b of belts) {
    let imgBuf = await sharp(sourcePath)
      .extract({ left: b.left, top: b.top, width: b.width, height: b.height })
      .png()
      .toBuffer();

    if (transparentBg) {
      imgBuf = await makeTransparentBg(imgBuf, b.width, b.height, bgTolerance);
    }

    imgBuf = await keepLargestAlphaComponent(imgBuf);

    const trimmed = await trimAlpha(imgBuf);
    processed.push({ fileName: b.fileName, buffer: trimmed.buffer, width: trimmed.width, height: trimmed.height });
  }

  let outW = canvasWidth;
  let outH = canvasHeight;
  if (normalizeCanvas) {
    if (!outW) outW = Math.max(...processed.map((p) => p.width));
    if (!outH) outH = Math.max(...processed.map((p) => p.height));
  }

  const outFiles = [];
  const renderedByName = new Map();
  let brownBaseClean = null;
  let blackBaseClean = null;
  for (const p of processed) {
    const outputFile = path.join(outPath, p.fileName);
    outFiles.push(outputFile);
    let finalBuf = p.buffer;
    let skipAggressiveEdgeCleanup = false;
    if (normalizeCanvas && outW > 0 && outH > 0) {
      finalBuf = await placeOnCanvas(finalBuf, outW, outH, anchorTop, fitWidthRatio);
    }

    if (p.fileName === 'belt-brown-2.png' || p.fileName === 'belt-brown-3.png') {
      finalBuf = await adjustBrownStripeInward(finalBuf, 9);
    }

    if (p.fileName === 'belt-black-5.png') {
      // keep black-5 styling controlled by the unified white-stripe progression block below
      finalBuf = await cleanupBlack5Spill(finalBuf);
    }

    if (p.fileName === 'belt-black-5.png') {
      finalBuf = await softenBelt(finalBuf, 0.58, 1.0);
    }

    if (p.fileName === 'belt-brown-1.png' || p.fileName === 'belt-brown-2.png') {
      finalBuf = await ensureStripesSingleSide(finalBuf);
    }

    if (p.fileName === 'belt-brown-1.png') {
      const blueRef = renderedByName.get('belt-blue.png') || finalBuf;
      brownBaseClean = await enforceBrownBelt(blueRef);
      brownBaseClean = await replaceAlphaFromSource(brownBaseClean, blueRef);
      brownBaseClean = await cleanTipStripeResidue(brownBaseClean, 'brown');
      brownBaseClean = await mirrorRightTipFromLeft(brownBaseClean);
      finalBuf = await buildBrownFromBrown1(brownBaseClean, 1);
      finalBuf = await removeBrownLeftDebris(finalBuf);
      skipAggressiveEdgeCleanup = true;
    }

    if (p.fileName === 'belt-brown-2.png') {
      if (brownBaseClean) {
        finalBuf = await buildBrownFromBrown1(brownBaseClean, 2);
        skipAggressiveEdgeCleanup = true;
      } else {
        finalBuf = await softenBelt(finalBuf, 0.92, 0.86);
        finalBuf = await cleanupBrown2LeftTipStripes(finalBuf);
        finalBuf = await smoothBrown2Pixelation(finalBuf);
        finalBuf = await keepLargestAlphaComponent(finalBuf);
      }
      finalBuf = await removeBrownLeftDebris(finalBuf);
    }

    if (p.fileName === 'belt-brown-3.png') {
      if (brownBaseClean) {
        finalBuf = await buildBrownFromBrown1(brownBaseClean, 3);
        skipAggressiveEdgeCleanup = true;
      } else {
        finalBuf = await removeBrownLeftDebris(finalBuf);
      }
    }

    if (p.fileName === 'belt-black.png') {
      const blueRef = renderedByName.get('belt-blue.png') || finalBuf;
      finalBuf = await enforceBlackBelt(blueRef);
      finalBuf = await replaceAlphaFromSource(finalBuf, blueRef);
      finalBuf = await cleanTipStripeResidue(finalBuf, 'black');
      blackBaseClean = await mirrorRightTipFromLeft(finalBuf);
      finalBuf = blackBaseClean;
      skipAggressiveEdgeCleanup = true;
    }

    // Enforce black progression 0..5 stripes from one clean black base.
    if (p.fileName === 'belt-black-1.png') {
      const refBlack = blackBaseClean || renderedByName.get('belt-black.png');
      if (refBlack) {
        finalBuf = await buildTipStripesFromBase(refBlack, 1, 'white');
        skipAggressiveEdgeCleanup = true;
      }
    }
    if (p.fileName === 'belt-black-2.png') {
      const refBlack = blackBaseClean || renderedByName.get('belt-black.png');
      if (refBlack) {
        finalBuf = await buildTipStripesFromBase(refBlack, 2, 'white');
        skipAggressiveEdgeCleanup = true;
      }
    }
    if (p.fileName === 'belt-black-3.png') {
      const refBlack = blackBaseClean || renderedByName.get('belt-black.png');
      if (refBlack) {
        finalBuf = await buildTipStripesFromBase(refBlack, 3, 'white');
        skipAggressiveEdgeCleanup = true;
      }
    }
    if (p.fileName === 'belt-black-4.png') {
      const refBlack = blackBaseClean || renderedByName.get('belt-black.png');
      if (refBlack) {
        finalBuf = await buildTipStripesFromBase(refBlack, 4, 'white');
        skipAggressiveEdgeCleanup = true;
      }
    }
    if (p.fileName === 'belt-black-5.png') {
      const refBlack = blackBaseClean || renderedByName.get('belt-black.png');
      if (refBlack) {
        finalBuf = await buildTipStripesFromBase(refBlack, 5, 'white');
        skipAggressiveEdgeCleanup = true;
      }
    }

    if (
      p.fileName === 'belt-brown-1.png' ||
      p.fileName === 'belt-brown-2.png' ||
      p.fileName === 'belt-brown-3.png' ||
      p.fileName === 'belt-black-1.png' ||
      p.fileName === 'belt-black-2.png' ||
      p.fileName === 'belt-black-3.png' ||
      p.fileName === 'belt-black-4.png' ||
      p.fileName === 'belt-black-5.png'
    ) {
      finalBuf = await softenBelt(finalBuf, 0.62, 0.94);
    }

    if (p.fileName === 'belt-white.png') {
      finalBuf = await enforceWhiteBelt(finalBuf);
    }

    if (p.fileName === 'belt-yellow.png') {
      finalBuf = await enforceYellowBelt(finalBuf);
    }

    if (p.fileName === 'belt-orange.png') {
      finalBuf = await enforceOrangeBelt(finalBuf);
      finalBuf = await smoothBrown2Pixelation(finalBuf);
      finalBuf = await softenBelt(finalBuf, 0.68, 0.92);
    }

    if (p.fileName === 'belt-purple.png') {
      const blueRef = renderedByName.get('belt-blue.png') || finalBuf;
      finalBuf = await enforcePurpleBelt(blueRef);
      finalBuf = await applyAlphaMask(finalBuf, blueRef);
      finalBuf = await keepLargestAlphaComponent(finalBuf);
    }

    if (p.fileName === 'belt-red.png') {
      finalBuf = await enforceRedBelt(finalBuf);
    }

    if (p.fileName === 'belt-red-black.png') {
      finalBuf = await enforceRedBlackBelt(finalBuf);
    }

    if (skipAggressiveEdgeCleanup) {
      finalBuf = await keepLargestAlphaComponent(finalBuf);
    } else {
      finalBuf = await defringeAlpha(finalBuf);
      finalBuf = await removeSmallAlphaComponents(finalBuf, 220);
      finalBuf = await keepLargestAlphaComponent(finalBuf);
      finalBuf = await cleanAlphaFromStrongCore(finalBuf, 205, 2);
      finalBuf = await decontaminateAlphaEdges(finalBuf);
    }

    if (p.fileName === 'belt-purple.png') {
      const blueRef = renderedByName.get('belt-blue.png');
      if (blueRef) {
        finalBuf = await replaceAlphaFromSource(finalBuf, blueRef);
        finalBuf = await keepLargestAlphaComponent(finalBuf);
      }
    }

    const needsBlueSilhouette = /^belt-(brown|black)(?:-|\.)/.test(p.fileName) || p.fileName === 'belt-black.png';
    if (needsBlueSilhouette) {
      const blueRef = renderedByName.get('belt-blue.png');
      if (blueRef) {
        finalBuf = await replaceAlphaFromSource(finalBuf, blueRef);
        finalBuf = await keepLargestAlphaComponent(finalBuf);
      }
    }

    if (p.fileName === 'belt-red.png' || p.fileName === 'belt-red-black.png') {
      const cleanRef = renderedByName.get('belt-blue.png') || renderedByName.get('belt-green.png');
      if (cleanRef) {
        finalBuf = await replaceAlphaFromSource(finalBuf, cleanRef);
        finalBuf = await keepLargestAlphaComponent(finalBuf);
      }
    }

    finalBuf = await cleanAlphaSpikes(finalBuf, 96);
    finalBuf = await smoothAlphaBoundary(finalBuf, 96);

    await sharp(finalBuf).png().toFile(outputFile);
    renderedByName.set(p.fileName, finalBuf);
  }

  // Global cleanup pass: unify all belt silhouettes to the clean blue alpha mask.
  const globalBlueRef = renderedByName.get('belt-blue.png');
  if (globalBlueRef) {
    for (const file of outFiles) {
      const base = path.basename(file).toLowerCase();
      if (!base.startsWith('belt-') || base === 'belt-blue.png') continue;
      let cur = await sharp(file).png().toBuffer();
      cur = await replaceAlphaFromSource(cur, globalBlueRef);
      cur = await keepLargestAlphaComponent(cur);
      cur = await cleanAlphaSpikes(cur, 96);
      cur = await smoothAlphaBoundary(cur, 96);
      await sharp(cur).png().toFile(file);
    }
  }

  if (contactSheet) {
    await buildContactSheet(outFiles, contactSheet);
  }

  console.log('Done.');
  console.log('Source:', sourcePath);
  console.log('Grid:', `${cols}x${rows}`, 'Cell:', `${cellW}x${cellH}`);
  console.log('Cell crop: per-row insets applied');
  console.log('Files written:', names.length);
  console.log('Output:', outPath);
  if (contactSheet) console.log('Contact sheet:', contactSheet);
}

main().catch((err) => {
  console.error('Split failed:', err.message || err);
  process.exit(1);
});
