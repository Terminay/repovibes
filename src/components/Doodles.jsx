import React, { useMemo } from 'react';
import { polygonPaths, linePaths, pathPaths, circlePaths } from '../lib/rough.js';

// A single hand-drawn doodle glyph rendered from rough.js paths.
function Glyph({ paths, color }) {
  return (
    <>
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          stroke={p.stroke || color}
          strokeWidth={p.strokeWidth}
          fill={p.fill || 'none'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </>
  );
}

// Build a 5-point star polygon centered in a viewBox.
function starPoints(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// A handful of lightweight ambient doodles that drift/rotate slowly in the
// background. Positions are in viewport % so they spread across the page.
const DOODLES = [
  { top: '8%', left: '6%', size: 46, drift: 'drift-a', kind: 'star', color: '#f2b53a' },
  { top: '18%', left: '88%', size: 40, drift: 'drift-b', kind: 'squiggle', color: '#3d9be5' },
  { top: '46%', left: '4%', size: 42, drift: 'drift-c', kind: 'spiral', color: '#e5533d' },
  { top: '62%', left: '92%', size: 44, drift: 'drift-a', kind: 'star', color: '#6bbf59' },
  { top: '80%', left: '10%', size: 38, drift: 'drift-b', kind: 'squiggle', color: '#ec8b3c' },
  { top: '88%', left: '82%', size: 40, drift: 'drift-c', kind: 'spiral', color: '#3d9be5' },
  { top: '34%', left: '84%', size: 30, drift: 'drift-a', kind: 'plus', color: '#e5533d' },
  { top: '70%', left: '48%', size: 26, drift: 'drift-b', kind: 'plus', color: '#f2b53a' },
];

export default function Doodles() {
  const glyphs = useMemo(() => {
    return DOODLES.map((d, idx) => {
      let paths = [];
      if (d.kind === 'star') {
        paths = polygonPaths(starPoints(24, 24, 20, 8), {
          stroke: d.color,
          strokeWidth: 2,
          roughness: 1.6,
          seed: idx + 3,
        });
      } else if (d.kind === 'squiggle') {
        paths = pathPaths('M4 30 C 12 10, 20 40, 28 20 S 40 10, 44 26', {
          stroke: d.color,
          strokeWidth: 2.2,
          roughness: 1.5,
          seed: idx + 7,
        });
      } else if (d.kind === 'spiral') {
        paths = pathPaths(
          'M24 24 m0 0 a4 4 0 1 1 -6 2 a9 9 0 1 1 14 -3 a14 14 0 1 1 -20 4',
          { stroke: d.color, strokeWidth: 2, roughness: 1.4, seed: idx + 11 }
        );
      } else if (d.kind === 'plus') {
        paths = [
          ...linePaths(6, 24, 42, 24, { stroke: d.color, strokeWidth: 2.4, seed: idx + 2 }),
          ...linePaths(24, 6, 24, 42, { stroke: d.color, strokeWidth: 2.4, seed: idx + 5 }),
        ];
      }
      return { ...d, paths };
    });
  }, []);

  return (
    <div className="doodle-layer" aria-hidden="true">
      {glyphs.map((d, i) => (
        <svg
          key={i}
          className={`doodle ${d.drift}`}
          style={{ top: d.top, left: d.left, width: d.size, height: d.size }}
          viewBox="0 0 48 48"
        >
          <Glyph paths={d.paths} color={d.color} />
        </svg>
      ))}
    </div>
  );
}
