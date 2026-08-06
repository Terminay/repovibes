import React, { useMemo } from 'react';
import { pathPaths, polygonPaths } from '../lib/rough.js';

// A hand-drawn crayon scribbling in a loop — replaces the generic spinner.
export default function ScribbleLoader() {
  const scribble = useMemo(
    () =>
      pathPaths(
        'M10 60 C 30 20, 45 90, 65 45 S 100 15, 120 55 S 150 90, 170 40',
        { stroke: '#e5533d', strokeWidth: 4, roughness: 1.8, seed: 9 }
      ),
    []
  );

  // A little crayon body (rough polygon) that rides along the scribble.
  const crayon = useMemo(
    () =>
      polygonPaths(
        [
          [0, 4],
          [22, 4],
          [30, 10],
          [22, 16],
          [0, 16],
        ],
        { stroke: '#3a3128', strokeWidth: 2, fill: '#f2b53a', fillStyle: 'solid', roughness: 1.2, seed: 4 }
      ),
    []
  );

  return (
    <div className="scribble-loader">
      <svg viewBox="0 0 180 100" className="scribble-svg" aria-hidden="true">
        {scribble.map((p, i) => (
          <path
            key={i}
            className="scribble-path"
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill="none"
            strokeLinecap="round"
            pathLength="1"
          />
        ))}
        <g className="scribble-crayon">
          {crayon.map((p, i) => (
            <path
              key={i}
              d={p.d}
              stroke={p.stroke}
              strokeWidth={p.strokeWidth}
              fill={p.fill || 'none'}
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
