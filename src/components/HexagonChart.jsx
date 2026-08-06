import React, { useMemo } from 'react';
import { AXES } from '../lib/scoring.js';

const CX = 200;
const CY = 165;
const R = 100;

function vertex(i, radiusRatio) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  const r = R * radiusRatio;
  return [CX + r * Math.cos(angle), CY + r * Math.sin(angle)];
}

function polygonPoints(ratios) {
  return ratios
    .map((ratio, i) => {
      const [x, y] = vertex(i, ratio);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function scoreColor(score) {
  if (score >= 70) return '#3fb950';
  if (score >= 40) return '#d29922';
  return '#f85149';
}

// Interactive SVG rendered as React DOM (animates via CSS).
export default function HexagonChart({ scores, repo }) {
  const ratios = useMemo(() => AXES.map((a) => scores[a.key] / 100), [scores]);
  const dataPts = polygonPoints(ratios);

  const rings = [0.25, 0.5, 0.75, 1.0];
  const spokes = AXES.map((_, i) => {
    const [x, y] = vertex(i, 1);
    return (
      <line key={`spoke-${i}`} x1={CX} y1={CY} x2={x.toFixed(2)} y2={y.toFixed(2)}
        stroke="#21262d" strokeWidth="1" />
    );
  });

  const overall = Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / 6);

  return (
    <svg className="hexagon-svg" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dataFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(88, 166, 255, 0.28)" />
          <stop offset="100%" stopColor="rgba(88, 166, 255, 0.12)" />
        </linearGradient>
      </defs>

      {/* Grid rings */}
      {rings.map((ratio) => {
        const pts = polygonPoints(Array(6).fill(ratio));
        return (
          <polygon key={`ring-${ratio}`} points={pts} fill="none"
            stroke={ratio === 1 ? '#30363d' : '#21262d'} strokeWidth="1" />
        );
      })}

      {/* Spokes */}
      {spokes}

      {/* Data shape */}
      <polygon className="data-shape" points={dataPts}
        fill="url(#dataFill)" stroke="#58a6ff" strokeWidth="2" strokeLinejoin="round" />

      {/* Vertex dots + labels */}
      {AXES.map((axis, i) => {
        const [x, y] = vertex(i, 1);
        const [lx, ly] = vertex(i, 1.28);
        const score = scores[axis.key];
        let anchor = 'middle';
        if (x < CX - 5) anchor = 'end';
        else if (x > CX + 5) anchor = 'start';
        return (
          <g key={axis.key} style={{ animation: `fade-in 0.5s ease ${0.3 + i * 0.08}s both` }}>
            <circle className="vertex-dot" cx={x.toFixed(2)} cy={y.toFixed(2)} r="3" fill="#58a6ff" />
            <text x={lx.toFixed(2)} y={(ly - 6).toFixed(2)} textAnchor={anchor}
              fontFamily="'JetBrains Mono', monospace" fontSize="10" fill="#8b949e">
              {axis.label}
            </text>
            <text x={lx.toFixed(2)} y={(ly + 7).toFixed(2)} textAnchor={anchor}
              fontFamily="'JetBrains Mono', monospace" fontSize="12" fontWeight="700"
              fill={scoreColor(score)}>
              {score}
            </text>
          </g>
        );
      })}

      {/* Center badge */}
      <circle cx={CX} cy={CY} r="22" fill="#161b22" stroke="#30363d" strokeWidth="1" />
      <text x={CX} y={CY - 2} textAnchor="middle" fontFamily="sans-serif" fontSize="9" fill="#8b949e">vibes</text>
      <text x={CX} y={CY + 12} textAnchor="middle" fontFamily="'JetBrains Mono', monospace"
        fontSize="15" fontWeight="700" fill={scoreColor(overall)}>{overall}</text>
    </svg>
  );
}
