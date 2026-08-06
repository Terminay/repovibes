// rough.js helper — wraps roughjs's generator to produce plain SVG path data
// so we can render (and animate) hand-drawn shapes as React <path> elements.
import rough from 'roughjs';

let _gen;
function gen() {
  if (!_gen) _gen = rough.generator();
  return _gen;
}

// Convert a roughjs "drawable" into an array of { d, stroke, strokeWidth, fill }.
function toPaths(drawable) {
  return gen().toPaths(drawable);
}

// Hand-drawn rounded-ish rectangle. roughjs has no native radius, so we inset
// slightly and rely on roughness for the wobble.
export function rectPaths(w, h, options = {}) {
  if (w <= 0 || h <= 0) return [];
  const pad = (options.strokeWidth || 2) + 2;
  const drawable = gen().rectangle(pad, pad, w - pad * 2, h - pad * 2, {
    roughness: 1.7,
    bowing: 1.4,
    ...options,
  });
  return toPaths(drawable);
}

export function polygonPaths(points, options = {}) {
  const drawable = gen().polygon(points, {
    roughness: 1.4,
    bowing: 1,
    ...options,
  });
  return toPaths(drawable);
}

export function linePaths(x1, y1, x2, y2, options = {}) {
  const drawable = gen().line(x1, y1, x2, y2, {
    roughness: 1.2,
    bowing: 1,
    ...options,
  });
  return toPaths(drawable);
}

export function circlePaths(cx, cy, diameter, options = {}) {
  const drawable = gen().circle(cx, cy, diameter, {
    roughness: 1.3,
    ...options,
  });
  return toPaths(drawable);
}

export function pathPaths(d, options = {}) {
  const drawable = gen().path(d, { roughness: 1.2, ...options });
  return toPaths(drawable);
}
