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

// A hand-drawn arrow connecting flow steps.
function StepArrow() {
  return (
    <svg
      className="step-arrow"
      width="40"
      height="24"
      viewBox="0 0 40 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 12 Q 15 6, 28 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 8 L 28 12 L 24 16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const STEPS = [
  {
    n: '1',
    color: '#d8452f',
    title: 'Paste any public repo URL',
    body: 'Drop in a GitHub link or just owner/repo — no login, no setup, nothing to install.',
    rot: '-1.4deg',
  },
  {
    n: '2',
    color: '#3d9be5',
    title: 'We check activity, community, docs & more',
    body: 'We read the public GitHub signals and sketch out six honest vibe scores.',
    rot: '1.2deg',
  },
  {
    n: '3',
    color: '#5a9e4f',
    title: 'Get a shareable hexagon + embed it',
    body: 'Copy one line of markdown and the live hexagon renders right inside your README.',
    rot: '-0.8deg',
  },
];

const CHECKS = [
  {
    key: 'activity',
    label: 'Activity',
    color: '#d8452f',
    desc: 'How recently and how often code actually gets pushed.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l3-8 4 16 3-8h4" />
      </svg>
    ),
  },
  {
    key: 'community',
    label: 'Community',
    color: '#3d9be5',
    desc: 'How many different people pitch in as contributors.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'responsiveness',
    label: 'Responsiveness',
    color: '#e0932f',
    desc: 'How well maintainers keep up with and close issues.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: 'documentation',
    label: 'Documentation',
    color: '#5a9e4f',
    desc: 'README depth, a license, a description and topics.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    key: 'stability',
    label: 'Stability',
    color: '#7a5cc0',
    desc: 'Tagged releases and how fresh the latest one is.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    key: 'popularity',
    label: 'Popularity',
    color: '#e5533d',
    desc: 'Stars, forks and how fast they are growing over time.',
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
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
const EXAMPLE_SNIPPET = `![RepoVibes](https://repovibes.vercel.app/api/hexagon/facebook/react.svg)`;

// A torn-paper strip used as a soft section divider instead of a hard rule.
function TornDivider() {
  return <div className="torn-divider" aria-hidden="true" />;
}

export default function Landing() {
  return (
    <div className="landing">
      {/* ── How it works ──────────────────────────────────────── */}
      <TornDivider />
      <section className="section container" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          How it works
        </h2>
        <p className="section-sub">Three scribbles and you&apos;re done</p>
        <div className="steps-flow">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <StepArrow />}
              <SketchyBox
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
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ── What we check ──────────────────────────────────── */}
      <TornDivider />
      <section className="section container" aria-labelledby="check-title">
        <h2 id="check-title" className="section-title">
          What we check
        </h2>
        <p className="section-sub">Six honest little vibe-o-meters</p>
        <div className="checks-grid">
          {CHECKS.map((c) => (
            <div
              key={c.key}
              className="check-item"
              style={{ '--accent': c.color }}
            >
              <div className="check-icon">{c.icon}</div>
              <h3 className="check-label">{c.label}</h3>
              <p className="check-desc">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Example ────────────────────────────────────────────── */}
      <TornDivider />
      <section className="section container" aria-labelledby="example-title">
        <h2 id="example-title" className="section-title">
          See it on a real repo
        </h2>
        <p className="section-sub">
          Here&apos;s <span className="mono-inline">{EXAMPLE_REPO}</span> — this is exactly what you get
        </p>
        <div className="example-grid">
          <div className="paper-card example-chart">
            <div className="repo-info">
              <div className="sticky-note name-note">{EXAMPLE_REPO}</div>
              <div className="sticky-note star-note">&#9733; 228k</div>
            </div>
            <div className="chart-area example-chart-area">
              <HexagonChart scores={EXAMPLE_SCORES} />
            </div>
          </div>

          <div className="example-embed">
            <div className="embed-label">Drop this in your README</div>
            <div className="code-block">
              <span className="tape tape-left" aria-hidden="true" />
              <span className="tape tape-right" aria-hidden="true" />
              <code>{EXAMPLE_SNIPPET}</code>
            </div>
            <p className="embed-hint">
              It&apos;s a plain SVG — GitHub renders it inline, no scripts, no iframes.
            </p>
          </div>
        </div>
      </section>

      {/* ── Embed it anywhere ──────────────────────────────── */}
      <TornDivider />
      <section className="section container" aria-labelledby="embed-title">
        <h2 id="embed-title" className="section-title">
          Embed it anywhere
        </h2>
        <p className="section-sub">
          Your README is the first thing people see — give it some vibes
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
              A tiny command-line tool that does surprisingly big things.
            </p>
            <div className="readme-h2">Project vibes</div>
            <div className="readme-badge">
              <HexagonChart scores={EXAMPLE_SCORES} />
            </div>
            <p className="readme-text muted">
              — Updated automatically every time someone loads your README.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <TornDivider />
      <footer className="site-footer container">
        <div className="footer-links">
          <a
            className="footer-link"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            &#9733; Star it on GitHub
          </a>
        </div>
        <p className="footer-made">Made with crayons &amp; caffeine</p>
        <p className="footer-disclaimer">
          Scores are heuristic vibes, not official metrics
        </p>
      </footer>
    </div>
  );
}
