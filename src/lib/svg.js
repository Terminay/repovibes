// svg.js — builds the hexagon/radar SVG string used by both the backend
// image endpoint and the frontend interactive preview.

import { AXES } from './scoring.js';

// Center + radius for the chart polygon.
const CX = 200;
const CY = 165;
const R = 100;
const SIZE = 400; // SVG viewBox dimensions

// Color palette — self-contained, no external CSS.
const COLORS = {
  bg: '#0d1117',
  panel: '#161b22',
  grid: '#30363d',
  gridInner: '#21262d',
  fill: 'rgba(88, 166, 255, 0.18)',
  stroke: '#58a6ff',
  text: '#e6edf3',
  textDim: '#8b949e',
  textScore: '#58a6ff',
  accent: '#3fb950',
  headerBg: '#161b22',
};

// Vertex position for axis i at a given radius (0-1 of R).
function vertex(i, radiusRatio) {
  // Start at top (-90deg), go clockwise.
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

// Build the static SVG string from computed scores.
// `opts.repo` = { name, stars } for the header; optional.
export function buildHexagonSVG(scores, repo = null) {
  const ratios = AXES.map((a) => scores[a.key] / 100);

  // Grid rings at 0.25, 0.5, 0.75, 1.0.
  const rings = [0.25, 0.5, 0.75, 1.0]
    .map((ratio) => {
      const pts = polygonPoints(Array(6).fill(ratio));
      return `<polygon points="${pts}" fill="none" stroke="${ratio === 1 ? COLORS.grid : COLORS.gridInner}" stroke-width="1"/>`;
    })
    .join('');

  // Spokes from center to each vertex.
  const spokes = AXES
    .map((_, i) => {
      const [x, y] = vertex(i, 1);
      return `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${COLORS.gridInner}" stroke-width="1"/>`;
    })
    .join('');

  // Data polygon (animated via SMIL — works in GitHub's SVG renderer? 
  // GitHub sanitizes SMIL, so we render the final state statically for the
  // embed. The frontend uses CSS animation instead.)
  const dataPts = polygonPoints(ratios);

  // Vertex dots + labels.
  const labels = AXES.map((axis, i) => {
    const [x, y] = vertex(i, 1);
    const [lx, ly] = vertex(i, 1.28);
    const score = scores[axis.key];
    // Anchor adjustment based on position.
    let anchor = 'middle';
    if (x < CX - 5) anchor = 'end';
    else if (x > CX + 5) anchor = 'start';
    return `
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="${COLORS.stroke}"/>
      <text x="${lx.toFixed(2)}" y="${(ly - 6).toFixed(2)}" text-anchor="${anchor}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="10" fill="${COLORS.textDim}">${axis.label}</text>
      <text x="${lx.toFixed(2)}" y="${(ly + 7).toFixed(2)}" text-anchor="${anchor}" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="12" font-weight="700" fill="${COLORS.textScore}">${score}</text>`;
  }).join('');

  // Header: repo name + stars.
  const headerH = 50;
  const header = repo
    ? `
    <rect x="0" y="0" width="${SIZE}" height="${headerH}" fill="${COLORS.headerBg}"/>
    <text x="16" y="32" font-family="'Inter', -apple-system, sans-serif" font-size="15" font-weight="600" fill="${COLORS.text}">${escapeXml(repo.name)}</text>
    <text x="${SIZE - 14}" y="32" text-anchor="end" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="13" fill="${COLORS.accent}">★ ${formatNum(repo.stars)}</text>`
    : '';

  // Overall score badge at bottom.
  const overall = Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / 6);
  const overallColor =
    overall >= 70 ? COLORS.accent : overall >= 40 ? '#d29922' : '#f85149';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE + headerH}" viewBox="0 0 ${SIZE} ${SIZE + headerH}">
  <rect width="${SIZE}" height="${SIZE + headerH}" fill="${COLORS.bg}"/>
  ${header}
  <g transform="translate(0, ${headerH / 2})">
    ${rings}
    ${spokes}
    <polygon points="${dataPts}" fill="${COLORS.fill}" stroke="${COLORS.stroke}" stroke-width="2" stroke-linejoin="round"/>
    ${labels}
    <circle cx="${CX}" cy="${CY}" r="22" fill="${COLORS.panel}" stroke="${COLORS.grid}" stroke-width="1"/>
    <text x="${CX}" y="${CY - 2}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="9" fill="${COLORS.textDim}">vibes</text>
    <text x="${CX}" y="${CY + 12}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="15" font-weight="700" fill="${overallColor}">${overall}</text>
  </g>
  <text x="${SIZE / 2}" y="${SIZE + headerH - 8}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="10" fill="${COLORS.textDim}">RepoVibes</text>
</svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
