import React, { useMemo } from 'react';
import HexagonChart from './HexagonChart.jsx';
import SketchyBox from './SketchyBox.jsx';
import { circlePaths } from '../lib/rough.js';

// A small hand-drawn circle badge with a number/glyph centered inside.
function SketchCircle({ children, color = '#3a3128', fill = '#fffaf0', seed = 1, size = 56 }) {
  const paths = useMemo(
    () =>
      circlePaths(size / 2, size / 2, size - 8, {
        stroke: color,
        strokeWidth: 2.4,
        fill,
        fillStyle: 'solid',
        roughness: 1.5,
        seed,
      }),
    [color, fill, seed, size]
  );
  return (
    <span className="sketch-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            stroke={p.stroke}
            strokeWidth={p.strokeWidth}
            fill={p.fill || 'none'}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <span className="sketch-circle-inner">{children}</span>
    </span>
  );
}

const STEPS = [
  {
    n: '1',
    color: '#d8452f',
    title: 'paste any public repo url',
    body: 'drop in a github link or just owner/repo — no login, no setup, nothing to install.',
    rot: '-1.4deg',
  },
  {
    n: '2',
    color: '#3d9be5',
    title: 'we check activity, community, docs & more',
    body: 'we read the public github signals and sketch out six honest vibe scores.',
    rot: '1.2deg',
  },
  {
    n: '3',
    color: '#5a9e4f',
    title: 'get a shareable hexagon + embed it',
    body: 'copy one line of markdown and the live hexagon renders right inside your readme.',
    rot: '-0.8deg',
  },
];

const CHECKS = [
  {
    key: 'activity',
    label: 'Activity',
    color: '#d8452f',
    desc: 'how recently and how often code actually gets pushed.',
    rot: '-2deg',
  },
  {
    key: 'community',
    label: 'Community',
    color: '#3d9be5',
    desc: 'how many different people pitch in as contributors.',
    rot: '1.5deg',
  },
  {
    key: 'responsiveness',
    label: 'Responsiveness',
    color: '#e0932f',
    desc: 'how well maintainers keep up with and close issues.',
    rot: '-1deg',
  },
  {
    key: 'documentation',
    label: 'Documentation',
    color: '#5a9e4f',
    desc: 'readme depth, a license, a description and topics.',
    rot: '2deg',
  },
  {
    key: 'stability',
    label: 'Stability',
    color: '#7a5cc0',
    desc: 'tagged releases and how fresh the latest one is.',
    rot: '-1.6deg',
  },
  {
    key: 'popularity',
    label: 'Popularity',
    color: '#e5533d',
    desc: 'stars, forks and how fast they are growing over time.',
    rot: '1.1deg',
  },
];

// Pre-baked representative vibes for the live example (facebook/react).
const EXAMPLE_SCORES = {
  activity: 90,
  community: 84,
  responsiveness: 68,
  documentation: 92,
  stability: 74,
  popularity: 97,
};
const EXAMPLE_REPO = 'facebook/react';
const EXAMPLE_SNIPPET = `![RepoVibes](https://repovibes.app/api/hexagon/facebook/react.svg)`;

// A torn-paper strip used as a soft section divider instead of a hard rule.
function TornDivider() {
  return <div className="torn-divider" aria-hidden="true" />;
}

export default function Landing() {
  return (
    <div className="landing">
      {/* ── HOW IT WORKS ─────────────────────────────── */}
      <TornDivider />
      <section className="section" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          how it works
        </h2>
        <p className="section-sub">three scribbles and you&apos;re done</p>
        <div className="steps-grid">
          {STEPS.map((s, i) => (
            <SketchyBox
              key={s.n}
              className="step-card"
              contentClassName="step-inner"
              color={s.color}
              strokeWidth={2.4}
              roughness={1.8}
              seed={i + 12}
              style={{ '--rot': s.rot }}
            >
              <SketchCircle color={s.color} seed={i + 40} size={58}>
                <span className="step-num" style={{ color: s.color }}>
                  {s.n}
                </span>
              </SketchCircle>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
            </SketchyBox>
          ))}
        </div>
      </section>

      {/* ── WHAT WE CHECK ────────────────────────────── */}
      <TornDivider />
      <section className="section" aria-labelledby="check-title">
        <h2 id="check-title" className="section-title">
          what we check
        </h2>
        <p className="section-sub">six honest little vibe-o-meters</p>
        <div className="checks-grid">
          {CHECKS.map((c, i) => (
            <div
              key={c.key}
              className="check-badge"
              style={{ '--rot': c.rot, '--accent': c.color }}
            >
              <span className="check-dot" style={{ background: c.color }} aria-hidden="true" />
              <h3 className="check-label">{c.label}</h3>
              <p className="check-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── EXAMPLE ──────────────────────────────────── */}
      <TornDivider />
      <section className="section" aria-labelledby="example-title">
        <h2 id="example-title" className="section-title">
          see it on a real repo
        </h2>
        <p className="section-sub">
          here&apos;s <span className="mono-inline">{EXAMPLE_REPO}</span> — this is exactly what you get
        </p>
        <div className="example-grid">
          <div className="paper-card example-chart">
            <div className="repo-info">
              <div className="sticky-note name-note">{EXAMPLE_REPO}</div>
              <div className="sticky-note star-note">★ 228k</div>
            </div>
            <div className="chart-area example-chart-area">
              <HexagonChart scores={EXAMPLE_SCORES} />
            </div>
          </div>

          <div className="example-embed">
            <div className="embed-label">drop this in your readme</div>
            <div className="code-block">
              <span className="tape tape-left" aria-hidden="true" />
              <span className="tape tape-right" aria-hidden="true" />
              <code>{EXAMPLE_SNIPPET}</code>
            </div>
            <p className="embed-hint">
              it&apos;s a plain svg — github renders it inline, no scripts, no iframes.
            </p>
          </div>
        </div>
      </section>

      {/* ── EMBED IT ANYWHERE ────────────────────────── */}
      <TornDivider />
      <section className="section" aria-labelledby="embed-title">
        <h2 id="embed-title" className="section-title">
          embed it anywhere
        </h2>
        <p className="section-sub">
          your readme is the first thing people see — give it some vibes
        </p>

        <div className="readme-mock">
          <div className="readme-chrome">
            <span className="dot dot-r" />
            <span className="dot dot-y" />
            <span className="dot dot-g" />
            <span className="readme-filename">README.md</span>
          </div>
          <div className="readme-body">
            <div className="readme-h1">awesome-cli</div>
            <p className="readme-text">
              a tiny command-line tool that does surprisingly big things.
            </p>
            <div className="readme-h2">project vibes</div>
            <div className="readme-badge">
              <HexagonChart scores={EXAMPLE_SCORES} />
            </div>
            <p className="readme-text muted">
              — updated automatically every time someone loads your readme.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <TornDivider />
      <footer className="site-footer">
        <div className="footer-links">
          <a
            className="footer-link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            ★ star it on github
          </a>
        </div>
        <p className="footer-made">made with crayons &amp; caffeine</p>
        <p className="footer-disclaimer">
          scores are heuristic vibes, not official metrics
        </p>
      </footer>
    </div>
  );
}
