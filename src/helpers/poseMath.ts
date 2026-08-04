export type Pt = [number, number];

export function calculatePoseAngle(top: Pt, mid: Pt, bot: Pt): number {
  const v1: Pt = [top[0] - mid[0], top[1] - mid[1]];
  const v2: Pt = [bot[0] - mid[0], bot[1] - mid[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const n1 = Math.hypot(v1[0], v1[1]);
  const n2 = Math.hypot(v2[0], v2[1]);
  if (n1 === 0 || n2 === 0) return 0;
  let deg = Math.acos(Math.max(-1, Math.min(1, dot / (n1 * n2)))) * (180 / Math.PI);
  if (deg > 90) deg = 180 - deg;
  return deg;
}

export function midpoint(a: Pt, b: Pt): Pt {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function edgePixels(data: Uint8Array, w: number, h: number): Pt[] {
  const at = (x: number, y: number) =>
    x >= 0 && x < w && y >= 0 && y < h && data[y * w + x] > 0;
  const pts: Pt[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1))
        pts.push([x, y]);
    }
  }
  return pts;
}

export function findClosestPoint(
  mask: Uint8Array, mw: number, mh: number,
  point: Pt, direction: number
): Pt {
  const pts = edgePixels(mask, mw, mh);
  const [px] = point;
  const cands = direction > 0 ? pts.filter(([x]) => x > px) : pts.filter(([x]) => x < px);
  if (!cands.length) return point;
  let min = Infinity, closest: Pt = point;
  for (const p of cands) {
    const d = Math.hypot(p[0] - point[0], p[1] - point[1]);
    if (d < min) { min = d; closest = p; }
  }
  return closest;
}

export function findFurthestPoint(
  mask: Uint8Array, mw: number, mh: number,
  p1: Pt, p2: Pt, direction: number, tMin = 0.0
): Pt {
  const pts = edgePixels(mask, mw, mh);
  const lv: Pt = [p2[0] - p1[0], p2[1] - p1[1]];
  const lsq = lv[0] ** 2 + lv[1] ** 2;
  const fallback: Pt = midpoint(p1, p2);
  if (lsq === 0) return fallback;

  let maxD = -1;
  let furthest: Pt = fallback;

  for (const pt of pts) {
    const pv: Pt = [pt[0] - p1[0], pt[1] - p1[1]];
    const t = (pv[0] * lv[0] + pv[1] * lv[1]) / lsq;
    if (t < tMin || t > 1) continue;
    const cross = lv[0] * pv[1] - lv[1] * pv[0];
    if (direction < 0 ? cross <= 0 : cross >= 0) continue;
    const d = Math.abs(cross) / Math.hypot(lv[0], lv[1]);
    if (d > maxD) { maxD = d; furthest = pt; }
  }
  return furthest;
}

export function confirmSidePose(
  c7: Pt, l5: Pt, lShoulder: Pt, rShoulder: Pt
): boolean {
  const torso = Math.hypot(c7[0] - l5[0], c7[1] - l5[1]);
  const shoulders = Math.hypot(lShoulder[0] - rShoulder[0], lShoulder[1] - rShoulder[1]);
  return torso > 0 && shoulders / torso < 0.5;
}

export function findPoseOrientation(midAnkles: Pt, lToe: Pt, rToe: Pt): number {
  return midAnkles[0] - (lToe[0] + rToe[0]) / 2;
}
