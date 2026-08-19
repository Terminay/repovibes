import React, { useMemo } from 'react';
import { AXES } from '../lib/scoring.js';
import { polygonPaths, linePaths, circlePaths } from '../lib/rough.js';

const CX = 200;
const CY = 175;
const R = 105;

function vertex(i, radiusRatio) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  const r = R * radiusRatio;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function polygonPointArray(ratios) {
  return ratios.map((ratio, i) => vertex(i, ratio));
}

const PALETTE = {
  light: {
    grid: '#c9bda0',
    badgeStroke: '#3a3128',
    badgeFill: '#fffaf0',
  },
  dark: {
    grid: '#5c5346',
    badgeStroke: '#d4c9b8',
    badgeFill: '#2a2520',
  },
};

// Crayon colors keyed to score bands.
function scoreColor(score) {
  if (score >= 70) return '#5a9e4f'; // grass green
  if (score >= 40) return '#e0932f'; // orange
  return '#d8452f'; // crayon red
}

// Hand-drawn radar/hexagon chart. Each grid ring, spoke, and the data shape
// is generated with rough.js. The data outline "draws itself" in, spokes
// sketch one at a time, and vertex scores bounce in staggered.
export default function HexagonChart({ scores, isDark = false }) {
  const ratios = useMemo(() => AXES.map((a) => scores[a.key] / 100), [scores]);
  const overall = Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / 6);
  const dataColor = scoreColor(overall);
  const theme = isDark ? PALETTE.dark : PALETTE.light;

  // Grid rings (static, faint crayon).
  const rings = useMemo(() => {
    return [0.35, 0.7, 1.0].map((ratio, idx) =>
      polygonPaths(polygonPointArray(Array(6).fill(ratio)), {
        stroke: theme.grid,
        strokeWidth: ratio === 1 ? 2 : 1.4,
        roughness: 1.6,
        seed: 20 + idx,
      })
    );
  }, [theme]);

  // Spokes from center to each outer vertex.
  const spokes = useMemo(
    () =>
      AXES.map((_, i) => {
        const [x, y] = vertex(i, 1);
        return linePaths(CX, CY, x, y, {
          stroke: theme.grid,
          strokeWidth: 1.3,
          roughness: 1.4,
          seed: 30 + i,
        });
      }),
    [theme]
  );

  // The data polygon — filled with a crayon hachure scribble.
  const dataPaths = useMemo(
    () =>
      polygonPaths(polygonPointArray(ratios), {
        stroke: dataColor,
        strokeWidth: 3.5,
        roughness: 1.5,
        bowing: 1.5,
        fill: dataColor,
        fillStyle: 'hachure',
        fillWeight: 2,
        hachureGap: 6,
        seed: 42,
      }),
    [ratios, dataColor]
  );

  // Center "vibes" badge circle.
  const badge = useMemo(
    () => circlePaths(CX, CY, 52, { stroke: theme.badgeStroke, strokeWidth: 2, fill: theme.badgeFill, fillStyle: 'solid', roughness: 1.3, seed: 55 }),
    [theme]
  );

  return (
    <svg
      className="hexagon-svg"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid rings */}
      {rings.map((paths, idx) =>
        paths.map((p, i) => (
          <path
            key={`ring-${idx}-${i}`}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill="none"
            strokeLinejoin="round"
          />
        ))
      )}

      {/* Spokes — sketch in one at a time */}
      {spokes.map((paths, idx) =>
        paths.map((p, i) => (
          <path
            key={`spoke-${idx}-${i}`}
            className="draw-line"
            style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill="none"
            strokeLinecap="round"
            pathLength="1"
          />
        ))
      )}

      {/* Data shape — fill fades in, outline draws itself */}
      {dataPaths.map((p, i) => {
        const isFill = !!p.fill && p.fill !== 'none';
        return (
          <path
            key={`data-${i}`}
            className={isFill ? 'data-fill' : 'data-outline'}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill || 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={isFill ? undefined : '1'}
          />
        );
      })}

      {/* Vertex labels + scores — bounce in staggered */}
      {AXES.map((axis, i) => {
        const [x, y] = vertex(i, 1);
        const [lx, ly] = vertex(i, 1.32);
        const score = scores[axis.key];
        let anchor = 'middle';
        if (x < CX - 5) anchor = 'end';
        else if (x > CX + 5) anchor = 'start';
        return (
          <g
            key={axis.key}
            className="vertex-group"
            style={{ animationDelay: `${0.7 + i * 0.12}s` }}
          >
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="4" fill={dataColor} />
            <text
              x={lx.toFixed(2)}
              y={(ly - 5).toFixed(2)}
              textAnchor={anchor}
              className="axis-label"
            >
              {axis.label}
            </text>
            <text
              x={lx.toFixed(2)}
              y={(ly + 15).toFixed(2)}
              textAnchor={anchor}
              className="axis-score"
              fill={scoreColor(score)}
            >
              {score}
            </text>
          </g>
        );
      })}

      {/* Center badge */}
      <g className="badge-group">
        {badge.map((p, i) => (
          <path
            key={`badge-${i}`}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill || 'none'}
            strokeLinejoin="round"
          />
        ))}
        <text x={CX} y={CY - 5} textAnchor="middle" className="badge-label">
          vibes
        </text>
        <text
          x={CX}
          y={CY + 16}
          textAnchor="middle"
          className="badge-score"
          fill={dataColor}
        >
          {overall}
        </text>
      </g>
    </svg>
  );
}
