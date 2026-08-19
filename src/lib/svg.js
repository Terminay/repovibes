// svg.js — builds the standalone embeddable SVG for a repo's vibes chart.
// Mirrors the HexagonChart React component exactly: same rough.js paths,
// seeds, colors, and layout. Wraps the chart in a paper card
// with sticky-note repo header matching the webapp's look.
import rough from 'roughjs';
import { AXES } from './scoring.js';

let _gen;
function gen() {
  if (!_gen) _gen = rough.generator();
  return _gen;
}

function toPaths(drawable) {
  return gen().toPaths(drawable);
}

function polygonPaths(points, options = {}) {
  return toPaths(gen().polygon(points, { roughness: 1.4, bowing: 1, ...options }));
}

function linePaths(x1, y1, x2, y2, options = {}) {
  return toPaths(gen().line(x1, y1, x2, y2, { roughness: 1.2, bowing: 1, ...options }));
}

function circlePaths(cx, cy, diameter, options = {}) {
  return toPaths(gen().circle(cx, cy, diameter, { roughness: 1.3, ...options }));
}

// ── Chart constants (must match HexagonChart.jsx exactly) ──────────────
const CHART_CX = 200;
const CHART_CY = 175;
const CHART_R = 105;

function vertex(i, radiusRatio) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  const r = CHART_R * radiusRatio;
  return [CHART_CX + r * Math.cos(angle), CHART_CY + r * Math.sin(angle)];
}

function polygonPointArray(ratios) {
  return ratios.map((ratio, i) => vertex(i, ratio));
}

function scoreColor(score) {
  if (score >= 70) return '#5a9e4f';
  if (score >= 40) return '#e0932f';
  return '#d8452f';
}

// ── Colors for rough.js generation (actual hex values) ─────────────────
const GEN = {
  paper: '#f6efdd',
  paperLight: '#fffaf0',
  ink: '#3a3128',
  inkSoft: '#6b5f4d',
  grid: '#c9bda0',
  yellow: '#f2b53a',
  green: '#5a9e4f',
};

// ── Map generated hex colors to CSS variable references for SVG output ─
const TO_VAR = {
  [GEN.paper]: 'var(--rv-paper)',
  [GEN.paperLight]: 'var(--rv-paper-light)',
  [GEN.ink]: 'var(--rv-ink)',
  [GEN.inkSoft]: 'var(--rv-ink-soft)',
  [GEN.grid]: 'var(--rv-grid)',
  [GEN.yellow]: 'var(--rv-yellow)',
  [GEN.green]: 'var(--rv-green)',
  '#ffffff': '#ffffff',
};

function toVar(color) {
  if (!color || color === 'none') return color;
  return TO_VAR[color] || color;
}

// ── SVG dimensions ─────────────────────────────────────────────────────
const CARD_W = 460;
const CARD_PAD = 18;
const HEADER_H = 64;
const CHART_AREA_TOP = CARD_PAD + HEADER_H;
const CHART_AREA_H = 400;
const FOOTER_H = 42;
const CARD_H = CARD_PAD + HEADER_H + CHART_AREA_H + FOOTER_H + CARD_PAD;

const CHART_OFFSET_X = (CARD_W - 400) / 2;
const CHART_OFFSET_Y = CHART_AREA_TOP;

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function formatNum(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function pathsToSvg(paths, extra = '') {
  return paths.map((p) => {
    const fill = p.fill && p.fill !== 'none' ? toVar(p.fill) : 'none';
    const stroke = toVar(p.stroke);
    return `<path d="${p.d}" stroke="${stroke}" stroke-width="${p.strokeWidth}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
  }).join('');
}

function buildChart(scores) {
  const ratios = AXES.map((a) => scores[a.key] / 100);
  const overall = Math.round(AXES.reduce((s, a) => s + scores[a.key], 0) / 6);
  const dataColor = scoreColor(overall);

  // Grid rings (same seeds/options as HexagonChart).
  const rings = [0.35, 0.7, 1.0].map((ratio, idx) =>
    polygonPaths(polygonPointArray(Array(6).fill(ratio)), {
      stroke: GEN.grid,
      strokeWidth: ratio === 1 ? 2 : 1.4,
      roughness: 1.6,
      seed: 20 + idx,
    })
  );

  // Spokes.
  const spokes = AXES.map((_, i) => {
    const [x, y] = vertex(i, 1);
    return linePaths(CHART_CX, CHART_CY, x, y, {
      stroke: GEN.grid,
      strokeWidth: 1.3,
      roughness: 1.4,
      seed: 30 + i,
    });
  });

  // Data polygon with hachure fill.
  const dataPaths = polygonPaths(polygonPointArray(ratios), {
    stroke: dataColor,
    strokeWidth: 3.5,
    roughness: 1.5,
    bowing: 1.5,
    fill: dataColor,
    fillStyle: 'hachure',
    fillWeight: 2,
    hachureGap: 6,
    seed: 42,
  });

  // Center badge circle.
  const badge = circlePaths(CHART_CX, CHART_CY, 52, {
    stroke: GEN.ink,
    strokeWidth: 2,
    fill: GEN.paperLight,
    fillStyle: 'solid',
    roughness: 1.3,
    seed: 55,
  });

  // Assemble chart SVG content (no animations — static embed).
  let chart = '';

  for (const ring of rings) chart += pathsToSvg(ring);
  for (const spoke of spokes) chart += pathsToSvg(spoke);

  // Data shape: fill paths at opacity 0.9, outline at full.
  for (const p of dataPaths) {
    const isFill = !!p.fill && p.fill !== 'none';
    chart += isFill
      ? `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill}" fill-opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Vertex labels + scores.
  for (let i = 0; i < AXES.length; i++) {
    const axis = AXES[i];
    const [x, y] = vertex(i, 1);
    const [lx, ly] = vertex(i, 1.32);
    const score = scores[axis.key];
    let anchor = 'middle';
    if (x < CHART_CX - 5) anchor = 'end';
    else if (x > CHART_CX + 5) anchor = 'start';

    chart += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4" fill="${dataColor}"/>`;
    chart += `<text x="${lx.toFixed(2)}" y="${(ly - 5).toFixed(2)}" text-anchor="${anchor}" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="14" fill="var(--rv-ink-soft)">${escapeXml(axis.label)}</text>`;
    chart += `<text x="${lx.toFixed(2)}" y="${(ly + 15).toFixed(2)}" text-anchor="${anchor}" font-family="'Caveat', cursive" font-size="24" font-weight="700" fill="${scoreColor(score)}">${score}</text>`;
  }

  // Center badge.
  chart += pathsToSvg(badge);
  chart += `<text x="${CHART_CX}" y="${CHART_CY - 5}" text-anchor="middle" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="13" fill="var(--rv-ink-soft)">vibes</text>`;
  chart += `<text x="${CHART_CX}" y="${CHART_CY + 16}" text-anchor="middle" font-family="'Caveat', cursive" font-size="30" font-weight="700" fill="${dataColor}">${overall}</text>`;

  return chart;
}

function buildStickyNote(x, y, w, h, bg, rotate, dashedBorder = false) {
  const border = dashedBorder ? 'stroke-dasharray="5,3"' : '';
  const shadow = `<rect x="${x + 2}" y="${y + 3}" width="${w}" height="${h}" rx="2" fill="var(--rv-shadow-strong)"/>`;
  return `${shadow}<g transform="rotate(${rotate} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${toVar(bg)}" stroke="var(--rv-ink)" stroke-width="1.5" ${border}/></g>`;
}

function buildHeader(repo) {
  let header = '';
  const top = CARD_PAD + 10;

  // Avatar sticky note (yellow, rotated -4deg).
  const avatarSize = 40;
  const avatarPad = 6;
  const avatarNoteW = avatarSize + avatarPad * 2;
  const avatarNoteH = avatarSize + avatarPad * 2;
  const avatarX = CARD_PAD + 8;
  const avatarY = top;

  const avatarSrc = repo?.avatarBase64 || repo?.avatar;
  if (avatarSrc) {
    header += buildStickyNote(avatarX, avatarY, avatarNoteW, avatarNoteH, GEN.yellow, -4);
    const imgX = avatarX + avatarPad;
    const imgY = avatarY + avatarPad;
    header += `<g transform="rotate(${-4} ${avatarX + avatarNoteW / 2} ${avatarY + avatarNoteH / 2})"><image href="${escapeXml(avatarSrc)}" x="${imgX}" y="${imgY}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid meet"/><rect x="${imgX}" y="${imgY}" width="${avatarSize}" height="${avatarSize}" fill="none" stroke="var(--rv-ink)" stroke-width="1.5"/></g>`;
  }

  // Name sticky note (white, dashed border, rotated 1.2deg).
  const rawName = repo?.name ? String(repo.name) : 'RepoVibes';
  const maxNameW = 280;
  const maxChars = Math.floor((maxNameW - 24) / 10);
  const displayName = rawName.length > maxChars ? `${rawName.slice(0, maxChars - 1)}…` : rawName;
  const nameText = escapeXml(displayName);
  const nameW = Math.min(maxNameW, Math.max(80, displayName.length * 10 + 24));
  const nameH = 36;
  const nameX = avatarX + avatarNoteW + 14;
  const nameY = top + 4;
  header += buildStickyNote(nameX, nameY, nameW, nameH, '#ffffff', 1.2, true);
  header += `<g transform="rotate(${1.2} ${nameX + nameW / 2} ${nameY + nameH / 2})"><text x="${nameX + 12}" y="${nameY + 25}" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="20" font-weight="700" fill="var(--rv-ink)">${nameText}</text></g>`;

  // Star sticky note (green, rotated 2.5deg, right-aligned).
  const starsText = repo?.stars != null ? `★ ${formatNum(repo.stars)}` : '';
  if (starsText) {
    const starW = starsText.length * 12 + 24;
    const starH = 32;
    const starX = CARD_W - CARD_PAD - 8 - starW;
    const starY = top + 8;
    header += buildStickyNote(starX, starY, starW, starH, GEN.green, 2.5);
    header += `<g transform="rotate(${2.5} ${starX + starW / 2} ${starY + starH / 2})"><text x="${starX + 12}" y="${starY + 22}" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="18" fill="#ffffff">${escapeXml(starsText)}</text></g>`;
  }

  return header;
}

export function buildHexagonSVG(scores, repo = null) {
  const chartContent = buildChart(scores);
  const headerContent = buildHeader(repo);

  const shadowRect = `<rect x="${CARD_PAD + 3}" y="${CARD_PAD + 4}" width="${CARD_W - CARD_PAD * 2}" height="${CARD_H - CARD_PAD * 2}" rx="10" fill="var(--rv-shadow)"/>`;
  const cardRect = `<rect x="${CARD_PAD}" y="${CARD_PAD}" width="${CARD_W - CARD_PAD * 2}" height="${CARD_H - CARD_PAD * 2}" rx="10" fill="var(--rv-paper-light)" stroke="var(--rv-ink)" stroke-width="2"/>`;
  const paperLines = `<rect x="${CARD_PAD}" y="${CARD_PAD}" width="${CARD_W - CARD_PAD * 2}" height="${CARD_H - CARD_PAD * 2}" rx="10" fill="url(#paper-lines)"/>`;

  const safeName = repo?.name ? escapeXml(repo.name) : 'RepoVibes';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}" role="img" aria-label="RepoVibes score chart for ${safeName}">
  <defs>
    <style>
      <![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Kalam:wght@400;700&family=Patrick+Hand&display=swap');
      :root {
        --rv-paper: #f6efdd;
        --rv-paper-light: #fffaf0;
        --rv-ink: #3a3128;
        --rv-ink-soft: #6b5f4d;
        --rv-grid: #c9bda0;
        --rv-yellow: #f2b53a;
        --rv-green: #5a9e4f;
        --rv-shadow: rgba(58,49,40,0.18);
        --rv-shadow-strong: rgba(58,49,40,0.2);
        --rv-blue-line: rgba(61,155,229,0.08);
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --rv-paper: #2a2520;
          --rv-paper-light: #1e1a16;
          --rv-ink: #d4c9b8;
          --rv-ink-soft: #a89b87;
          --rv-grid: #5c5346;
          --rv-yellow: #c4901f;
          --rv-green: #4a8a3f;
          --rv-shadow: rgba(0,0,0,0.35);
          --rv-shadow-strong: rgba(0,0,0,0.4);
          --rv-blue-line: rgba(61,155,229,0.04);
        }
      }
      ]]>
    </style>
    <pattern id="paper-lines" width="100" height="30" patternUnits="userSpaceOnUse">
      <rect width="100" height="30" fill="none"/>
      <line x1="0" y1="30" x2="100" y2="30" stroke="var(--rv-blue-line)" stroke-width="0.5"/>
    </pattern>
  </defs>
  ${shadowRect}
  ${cardRect}
  ${paperLines}
  ${headerContent}
  <g transform="translate(${CHART_OFFSET_X}, ${CHART_OFFSET_Y})">
    ${chartContent}
  </g>
  <text x="${CARD_W / 2}" y="${CARD_H - CARD_PAD - 10}" text-anchor="middle" font-family="'Patrick Hand', 'Comic Sans MS', cursive" font-size="14" fill="var(--rv-ink-soft)">checked by RepoVibes</text>
</svg>`;
}

export function buildErrorSVG(message, repo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
    <defs>
      <style>
        <![CDATA[
        :root {
          --rv-paper-light: #fffaf0;
          --rv-ink: #3a3128;
          --rv-ink-soft: #6b5f4d;
          --rv-error: #d8452f;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --rv-paper-light: #1e1a16;
            --rv-ink: #d4c9b8;
            --rv-ink-soft: #a89b87;
            --rv-error: #e85d4a;
          }
        }
        ]]>
      </style>
    </defs>
    <rect x="4" y="4" width="392" height="112" rx="10" fill="var(--rv-paper-light)" stroke="var(--rv-ink)" stroke-width="3"/>
    <text x="200" y="40" text-anchor="middle" font-family="'Caveat', cursive" font-size="26" font-weight="700" fill="var(--rv-error)">RepoVibes</text>
    <text x="200" y="66" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="16" fill="var(--rv-ink-soft)">${escapeXml(repo)}</text>
    <text x="200" y="90" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="15" fill="var(--rv-error)">${escapeXml(message)}</text>
  </svg>`;
}
