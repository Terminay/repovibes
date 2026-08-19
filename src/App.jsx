import React, { useState, useCallback } from 'react';
import HexagonChart from './components/HexagonChart.jsx';
import SketchyBox from './components/SketchyBox.jsx';
import ScribbleLoader from './components/ScribbleLoader.jsx';
import Landing from './components/Landing.jsx';
import { AXES } from './lib/scoring.js';

function scoreColor(score) {
  if (score >= 70) return '#5a9e4f';
  if (score >= 40) return '#e0932f';
  return '#d8452f';
}

function parseRepoInput(input) {
  const trimmed = input.trim();
  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };

  try {
    const url = new URL(trimmed);
    if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

// Render text with a playful per-letter wobble (alternating small rotations).
function Wiggle({ text, className = '' }) {
  return (
    <span className={`wiggle ${className}`} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="wiggle-letter"
          style={{ '--rot': `${(i % 2 === 0 ? 1 : -1) * (2 + (i % 3))}deg` }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | loaded | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [redrawKey, setRedrawKey] = useState(0);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const parsed = parseRepoInput(input);
    if (!parsed) {
      setState('error');
      setError('Enter a GitHub URL or owner/repo — e.g. facebook/react');
      return;
    }

    setState('loading');
    setError('');
    try {
      const res = await fetch(`/api/scores/${parsed.owner}/${parsed.repo}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed (${res.status})`);
      }
      const { data, scores } = await res.json();
      setResult({ data, scores });
      setState('loaded');
    } catch (err) {
      setState('error');
      setError(err.message || 'Something went wrong');
    }
  }, [input]);

  // Build the embed URL from the current origin so it works on any deployment.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain';
  const embedUrl = result
    ? `${origin}/api/hexagon/${result.data.owner}/${result.data.repo}.svg`
    : '';
  const embedSnippet = result ? `![RepoVibes](${embedUrl})` : '';

  const handleCopy = useCallback(async () => {
    if (!embedSnippet) return;
    setCopyError('');
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Copy is unavailable here — select the snippet manually');
    }
  }, [embedSnippet]);

  return (
    <div className="app">
      <header className="header container container-narrow">
        <h1>
          <Wiggle text="repo" />
          <Wiggle text="vibes" className="vibe" />
        </h1>
        <p>Check the vibes of any public GitHub repo</p>
      </header>

      <form className="input-form container container-narrow" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="repo-input" className="input-label">
            Paste a GitHub repo
          </label>
          <SketchyBox
            className={`input-wrap ${inputFocused ? 'is-focused' : ''}`}
            contentClassName="input-inner"
            color={inputFocused ? '#3d9be5' : '#3a3128'}
            strokeWidth={2.5}
            roughness={inputFocused ? 2 : 1.6}
            seed={3}
            redrawKey={redrawKey}
          >
            <input
              id="repo-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => {
                setInputFocused(true);
                setRedrawKey((k) => k + 1);
              }}
              onBlur={() => setInputFocused(false)}
              placeholder="github.com/owner/repo  or  owner/repo"
              autoFocus
              spellCheck="false"
            />
          </SketchyBox>
        </div>

        <div className="cta-wrap">
          <SketchyBox
            className="button-box"
            contentClassName="button-inner"
            color="#d8452f"
            fill="#f2b53a"
            fillStyle="zigzag"
            fillWeight={2}
            hachureGap={5}
            strokeWidth={3}
            roughness={1.8}
            seed={8}
          >
            <button type="submit" disabled={state === 'loading'}>
              {state === 'loading' ? 'Checking…' : 'Check the vibes!'}
            </button>
          </SketchyBox>
          <svg className="cta-arrow" viewBox="0 0 80 60" aria-hidden="true">
            <path
              d="M6 8 C 30 2, 55 18, 62 40"
              fill="none"
              stroke="#3d9be5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M62 40 L 52 34 M62 40 L 66 28"
              fill="none"
              stroke="#3d9be5"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </form>

      <div className="container container-wide">
        {state === 'error' && (
          <div className="paper-card error-card">
            <div className="error-state">
              <div className="error-icon">!?</div>
              <div className="error-title">Couldn&apos;t check that repo</div>
              <div className="error-msg">{error}</div>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div className="paper-card">
            <div className="chart-area">
              <div className="loading-state">
                <ScribbleLoader />
                <div className="loading-text">Scribbling your vibes…</div>
              </div>
            </div>
          </div>
        )}

        {state === 'loaded' && result && (
          <>
            <div className="report-card">
              <h2 className="report-heading">Vibe Report</h2>
              <div className="repo-info">
                <div className="sticky-note avatar-note">
                  <img src={result.data.avatar || '/placeholder.svg'} alt="" />
                </div>
                <div className="sticky-note name-note">{result.data.name}</div>
                <div className="sticky-note star-note">
                  &#9733; {formatNum(result.data.stars)}
                </div>
              </div>
              <div className="report-chart">
                <HexagonChart scores={result.scores} repo={result.data} />
              </div>

              {/* Score breakdown */}
              <div className="report-scores">
                <h3 className="report-scores-title">Score breakdown</h3>
                <div className="report-score-list">
                  {AXES.map((axis) => {
                    const score = result.scores[axis.key];
                    return (
                      <div key={axis.key} className="report-score-item">
                        <div className="report-score-label">{axis.label}</div>
                        <div className="report-score-bar-wrap">
                          <div
                            className="report-score-bar-fill"
                            style={{ width: `${score}%`, background: scoreColor(score) }}
                          />
                        </div>
                        <div
                          className="report-score-value"
                          style={{ color: scoreColor(score) }}
                        >
                          {score}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Embed snippet */}
            <div className="embed-section">
              <div className="embed-label">Markdown embed snippet</div>
              <div className="code-block">
                <span className="tape tape-left" aria-hidden="true" />
                <span className="tape tape-right" aria-hidden="true" />
                <code>{embedSnippet}</code>
                <button
                  className={`copy-btn ${copied ? 'copied' : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className={`embed-hint ${copyError ? 'is-error' : ''}`}>
                {copyError || 'Paste this in your README — the SVG renders directly in GitHub'}
              </div>
            </div>
          </>
        )}

        {state === 'idle' && (
          <div className="paper-card">
            <div className="chart-area">
              <div className="empty-state">
                Paste a repo URL above to see its vibes
              </div>
            </div>
          </div>
        )}
      </div>

      <Landing />
    </div>
  );
}
