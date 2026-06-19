// Generates the plugin's PNG icons (Elgato requires PNG, with @2x variants).
// Dependency-free: builds RGBA pixel buffers and encodes minimal PNGs via zlib.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const imgsRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "com.mtaro346.agent-deck.sdPlugin", "imgs");

const C = {
  bg: [26, 27, 38, 255], // #1a1b26
  keybg: [22, 22, 30, 255], // #16161e
  blue: [122, 162, 247, 255], // #7aa2f7
  green: [158, 206, 106, 255], // #9ece6a
  purple: [187, 154, 247, 255], // #bb9af7
  clear: [0, 0, 0, 0],
};

function canvas(size, fill = C.clear) {
  const b = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    b[i * 4] = fill[0];
    b[i * 4 + 1] = fill[1];
    b[i * 4 + 2] = fill[2];
    b[i * 4 + 3] = fill[3];
  }
  return b;
}

function px(b, size, x, y, c) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  b[i] = c[0];
  b[i + 1] = c[1];
  b[i + 2] = c[2];
  b[i + 3] = c[3];
}

function rect(b, size, x0, y0, w, h, c) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(b, size, x, y, c);
}

function disc(b, size, cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) px(b, size, x, y, c);
    }
}

function roundCorners(b, size) {
  const r = Math.round(size * 0.18);
  const corners = [
    [r, r],
    [size - r, r],
    [r, size - r],
    [size - r, size - r],
  ];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const nearCorner =
        (x < r && y < r && dist2(x, y, corners[0]) > r * r) ||
        (x >= size - r && y < r && dist2(x, y, corners[1]) > r * r) ||
        (x < r && y >= size - r && dist2(x, y, corners[2]) > r * r) ||
        (x >= size - r && y >= size - r && dist2(x, y, corners[3]) > r * r);
      if (nearCorner) px(b, size, x, y, C.clear);
    }
}

function dist2(x, y, [cx, cy]) {
  return (x - cx) * (x - cx) + (y - cy) * (y - cy);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const icons = [
  {
    path: "plugin/icon",
    sizes: [288, 576],
    draw: (b, s) => {
      rect(b, s, 0, 0, s, s, C.bg);
      const m = Math.round(s * 0.18);
      const bw = s - 2 * m;
      const bh = Math.round(s * 0.13);
      const gap = Math.round(s * 0.07);
      let y = Math.round(s * 0.21);
      rect(b, s, m, y, bw, bh, C.blue);
      y += bh + gap;
      rect(b, s, m, y, bw, bh, C.green);
      y += bh + gap;
      rect(b, s, m, y, bw, bh, C.purple);
      roundCorners(b, s);
    },
  },
  {
    path: "actions/session/icon",
    sizes: [20, 40],
    draw: (b, s) => {
      rect(b, s, 0, 0, s, s, C.bg);
      disc(b, s, Math.round(s * 0.3), Math.round(s * 0.5), Math.max(2, Math.round(s * 0.16)), C.green);
      rect(b, s, Math.round(s * 0.5), Math.round(s * 0.4), Math.round(s * 0.35), Math.round(s * 0.2), C.blue);
    },
  },
  {
    path: "actions/session/key",
    sizes: [72, 144],
    draw: (b, s) => {
      rect(b, s, 0, 0, s, s, C.keybg);
      rect(b, s, 0, 0, s, Math.max(2, Math.round(s * 0.06)), C.green);
      disc(b, s, Math.round(s * 0.16), Math.round(s * 0.26), Math.round(s * 0.07), C.green);
    },
  },
  {
    path: "actions/dial/icon",
    sizes: [20, 40],
    draw: (b, s) => {
      rect(b, s, 0, 0, s, s, C.bg);
      disc(b, s, Math.round(s * 0.5), Math.round(s * 0.5), Math.round(s * 0.3), C.purple);
    },
  },
  {
    path: "actions/dial/key",
    sizes: [72, 144],
    draw: (b, s) => {
      rect(b, s, 0, 0, s, s, C.keybg);
      disc(b, s, Math.round(s * 0.5), Math.round(s * 0.5), Math.round(s * 0.28), C.purple);
    },
  },
];

for (const ic of icons) {
  const [one, two] = ic.sizes;
  for (const [size, suffix] of [
    [one, ""],
    [two, "@2x"],
  ]) {
    const b = canvas(size);
    ic.draw(b, size);
    const file = `${join(imgsRoot, ic.path)}${suffix}.png`;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, encodePng(size, b));
    console.log("wrote", file.replace(imgsRoot, "imgs"), `${size}x${size}`);
  }
  const svg = `${join(imgsRoot, ic.path)}.svg`;
  if (existsSync(svg)) rmSync(svg);
}
