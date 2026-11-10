// Produktfoto vereinheitlichen: Rand entfernen, Objekt mittig auf weiße Fläche setzen.
// Arbeitet auf rohen BGRA-Bitmaps (wie nativeImage.toBitmap()), damit es ohne Electron testbar ist.

const BG = 238;           // ab diesem Wert (alle Kanäle) gilt ein Pixel als Hintergrund
const OUT_W = 1200;
const OUT_H = 900;        // 4:3 wie die Konsolen-Karten
const FILL_W = 0.8;       // maximale Breite des Objekts
const FILL_H = 0.78;      // maximale Höhe des Objekts

/** Pixel auf Weiß gerechnet (vormultipliziertes oder gerades Alpha) */
function onWhite(b, g, r, a) {
  if (a >= 255) return [b, g, r];
  if (a < 8) return [255, 255, 255];
  if (b <= a && g <= a && r <= a) {
    const k = 255 - a;           // vormultipliziert
    return [b + k, g + k, r + k];
  }
  const t = a / 255;             // gerades Alpha
  return [b * t + 255 * (1 - t), g * t + 255 * (1 - t), r * t + 255 * (1 - t)];
}

/** Begrenzungsrahmen des Objekts (ohne hellen/transparenten Rand) */
function contentBox(buf, w, h) {
  const isBg = (i) => {
    const [b, g, r] = onWhite(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
    return b >= BG && g >= BG && r >= BG;
  };
  const rows = new Uint32Array(h), cols = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isBg((y * w + x) * 4)) { rows[y]++; cols[x]++; }
    }
  }
  const minRow = Math.max(2, Math.round(w * 0.004)), minCol = Math.max(2, Math.round(h * 0.004));
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  while (top < h && rows[top] < minRow) top++;
  while (bottom > top && rows[bottom] < minRow) bottom--;
  while (left < w && cols[left] < minCol) left++;
  while (right > left && cols[right] < minCol) right--;
  if (top >= bottom || left >= right) return { x: 0, y: 0, width: w, height: h };
  const pad = Math.round(Math.max(right - left, bottom - top) * 0.01);
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(w - 1, right + pad); bottom = Math.min(h - 1, bottom + pad);
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/** Zielgröße des Objekts innerhalb der Fläche */
function fitSize(w, h) {
  const s = Math.min((OUT_W * FILL_W) / w, (OUT_H * FILL_H) / h);
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) };
}

/** Setzt ein (bereits skaliertes) Bitmap mittig auf eine weiße 1200×900-Fläche */
function compose(buf, w, h) {
  const out = Buffer.alloc(OUT_W * OUT_H * 4, 255);
  const ox = Math.round((OUT_W - w) / 2), oy = Math.round((OUT_H - h) / 2);
  for (let y = 0; y < h; y++) {
    const ty = oy + y;
    if (ty < 0 || ty >= OUT_H) continue;
    for (let x = 0; x < w; x++) {
      const tx = ox + x;
      if (tx < 0 || tx >= OUT_W) continue;
      const i = (y * w + x) * 4, o = (ty * OUT_W + tx) * 4;
      const [b, g, r] = onWhite(buf[i], buf[i + 1], buf[i + 2], buf[i + 3]);
      out[o] = b; out[o + 1] = g; out[o + 2] = r; out[o + 3] = 255;
    }
  }
  return out;
}

/** Komplett mit Electron-nativeImage */
function productShot(nativeImage, image) {
  const { width: w, height: h } = image.getSize();
  if (!w || !h) return image;
  // Für die Randsuche reicht eine verkleinerte Kopie
  const scan = Math.min(1, 600 / Math.max(w, h));
  const small = scan < 1 ? image.resize({ width: Math.round(w * scan), height: Math.round(h * scan) }) : image;
  const ss = small.getSize();
  const box = contentBox(small.toBitmap(), ss.width, ss.height);
  const crop = {
    x: Math.floor(box.x / scan), y: Math.floor(box.y / scan),
    width: Math.min(w - Math.floor(box.x / scan), Math.ceil(box.width / scan)),
    height: Math.min(h - Math.floor(box.y / scan), Math.ceil(box.height / scan))
  };
  const cut = image.crop(crop);
  const size = fitSize(crop.width, crop.height);
  const scaled = cut.resize({ ...size, quality: 'best' });
  const sz = scaled.getSize();
  return nativeImage.createFromBitmap(compose(scaled.toBitmap(), sz.width, sz.height), { width: OUT_W, height: OUT_H });
}

module.exports = { contentBox, fitSize, compose, onWhite, productShot, OUT_W, OUT_H };
