export interface Point {
  x: number;
  y: number;
}

export function cubicPoint(
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function buildFlowPath(from: Point, to: Point): { d: string; p0: Point; p1: Point; p2: Point; p3: Point } {
  const midY = (from.y + to.y) / 2;
  const p0 = from;
  const p3 = to;
  const p1 = { x: from.x, y: midY };
  const p2 = { x: to.x, y: midY };

  const d = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  return { d, p0, p1, p2, p3 };
}

export function approximatePathLength(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  samples = 24,
): number {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= samples; i++) {
    const pt = cubicPoint(i / samples, p0, p1, p2, p3);
    length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return length;
}
