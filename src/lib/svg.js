import { AXES } from './scoring.js';

const CX = 260;
const CY = 275;
const R = 132;
const WIDTH = 520;
const HEIGHT = 520;

const COLORS = {
  paper: '#f6efdd',
  paperLight: '#fffaf0',
  ink: '#3a3128',
  inkSoft: '#6b5f4d',
  grid: '#c9bda0',
  blue: '#3d9be5',
  yellow: '#f2b53a',
  green: '#5a9e4f',
  orange: '#e0932f',
  red: '#d8452f',
};

function vertex(i, radiusRatio) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  const radius = R * radiusRatio;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
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
  if (score >= 70) return COLORS.green;
  if (score >= 40) return COLORS.orange;
  return COLORS.red;
}

function roughLine(x1, y1, x2, y2, color, width = 2, opacity = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  return [
    `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round"/>`,
    `<line x1="${(x1 + nx * 0.8).toFixed(2)}" y1="${(y1 + ny * 0.8).toFixed(2)}" x2="${(x2 + nx * 0.8).toFixed(2)}" y2="${(y2 + ny * 0.8).toFixed(2)}" stroke="${color}" stroke-width="${Math.max(0.8, width * 0.55)}" opacity="${opacity * 0.45}" stroke-linecap="round"/>`,
  ].join('');
}

function buildGrid() {
  const rings = [0.35, 0.7, 1]
    .map((ratio) => {
      const points = polygonPoints(Array(6).fill(ratio));
      return `<polygon points="${points}" fill="none" stroke="${COLORS.grid}" stroke-width="${ratio === 1 ? 2 : 1.4}" opacity="${ratio === 1 ? 0.95 : 0.7}" stroke-linejoin="round"/>`;
    })
    .join('');

  const spokes = AXES.map((_, i) => {
    const [x, y] = vertex(i, 1);
    return roughLine(CX, CY, x, y, COLORS.grid, 1.3, 0.75);
  }).join('');

  return `${rings}${spokes}`;
}

function buildHachure(points, color) {
  const lines = [];
  for (let i = -160; i <= 160; i += 10) {
    lines.push(`<path d="M${CX - R - 30 + i} ${CY + R + 30} L${CX + R + 30 + i} ${CY - R - 30}" stroke="${color}" stroke-width="1.5" opacity="0.22"/>`);
  }
  return `<polygon points="${points}" fill="url(#vibe-fill)" stroke="${color}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>${lines.join('')}`;
}

function buildLabels(scores) {
  return AXES.map((axis, i) => {
    const [x, y] = vertex(i, 1);
    const [labelX, labelY] = vertex(i, 1.3);
    const score = scores[axis.key];
    let anchor = 'middle';
    if (x < CX - 5) anchor = 'end';
    if (x > CX + 5) anchor = 'start';
    return `
      <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${scoreColor(score)}" stroke="${COLORS.ink}" stroke-width="1.5"/>
      <text x="${labelX.toFixed(2)}" y="${(labelY - 5).toFixed(2)}" text-anchor="${anchor}" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="16" fill="${COLORS.inkSoft}">${axis.label}</text>
      <text x="${labelX.toFixed(2)}" y="${(labelY + 16).toFixed(2)}" text-anchor="${anchor}" font-family="'Caveat', cursive" font-size="25" font-weight="700" fill="${scoreColor(score)}">${score}</text>`;
  }).join('');
}

export function buildHexagonSVG(scores, repo = null) {
  const ratios = AXES.map((axis) => scores[axis.key] / 100);
  const overall = Math.round(AXES.reduce((sum, axis) => sum + scores[axis.key], 0) / AXES.length);
  const overallColor = scoreColor(overall);
  const dataPoints = polygonPoints(ratios);
  const safeName = repo?.name ? escapeXml(repo.name) : 'RepoVibes';
  const stars = repo?.stars != null ? `★ ${formatNum(repo.stars)}` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="RepoVibes score chart for ${safeName}">
  <defs>
    <pattern id="paper-dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <rect width="22" height="22" fill="${COLORS.paperLight}"/>
      <circle cx="1" cy="1" r="1" fill="${COLORS.ink}" opacity="0.045"/>
    </pattern>
    <pattern id="paper-lines" width="1" height="30" patternUnits="userSpaceOnUse">
      <rect width="1" height="30" fill="${COLORS.paperLight}"/>
      <rect width="1" height="1" fill="${COLORS.blue}" opacity="0.08"/>
    </pattern>
    <pattern id="vibe-fill" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <rect width="12" height="12" fill="${overallColor}" opacity="0.13"/>
      <path d="M0 0 V12" stroke="${overallColor}" stroke-width="2" opacity="0.23"/>
    </pattern>
    <clipPath id="vibe-clip"><polygon points="${dataPoints}"/></clipPath>
  </defs>
  <rect x="5" y="5" width="510" height="510" rx="12" fill="${COLORS.paperLight}" stroke="${COLORS.ink}" stroke-width="3"/>
  <rect x="7" y="7" width="506" height="506" rx="10" fill="url(#paper-dots)"/>
  <rect x="7" y="7" width="506" height="506" rx="10" fill="url(#paper-lines)"/>
  <path d="M24 78 C 130 74, 390 82, 496 77" fill="none" stroke="${COLORS.blue}" stroke-width="1.5" opacity="0.3"/>
  <text x="26" y="48" font-family="'Caveat', cursive" font-size="29" font-weight="700" fill="${COLORS.ink}">${safeName}</text>
  ${stars ? `<text x="494" y="48" text-anchor="end" font-family="'Patrick Hand', cursive" font-size="20" fill="${COLORS.green}">${escapeXml(stars)}</text>` : ''}
  ${buildGrid()}
  <g clip-path="url(#vibe-clip)">
    ${buildHachure(dataPoints, overallColor)}
  </g>
  ${buildLabels(scores)}
  <circle cx="${CX}" cy="${CY}" r="31" fill="${COLORS.paperLight}" stroke="${COLORS.ink}" stroke-width="2.5"/>
  <circle cx="${CX + 1}" cy="${CY - 1}" r="30" fill="none" stroke="${COLORS.ink}" stroke-width="1" opacity="0.45"/>
  <text x="${CX}" y="${CY - 5}" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="15" fill="${COLORS.inkSoft}">vibes</text>
  <text x="${CX}" y="${CY + 19}" text-anchor="middle" font-family="'Caveat', cursive" font-size="31" font-weight="700" fill="${overallColor}">${overall}</text>
  <text x="260" y="496" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="16" fill="${COLORS.inkSoft}">checked by RepoVibes</text>
</svg>`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'\"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[character]));
}

function formatNum(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
}
