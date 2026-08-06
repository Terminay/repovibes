import React, { useState, useCallback } from 'react';
import HexagonChart from './components/HexagonChart.jsx';
import { AXES } from './lib/scoring.js';

function scoreColor(score) {
  if (score >= 70) return '#3fb950';
  if (score >= 40) return '#d29922';
  return '#f85149';
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

export default function App() {
  const [input, setInput] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | loaded | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const parsed = parseRepoInput(input);
    if (!parsed) {
      setState('error');
      setError('enter a github url or owner/repo — e.g. facebook/react');
      return;
    }

    setState('loading');
    setError('');
    try {
      const res = await fetch(`/api/scores/${parsed.owner}/${parsed.repo}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `failed (${res.status})`);
      }
      const { data, scores } = await res.json();
      setResult({ data, scores });
      setState('loaded');
    } catch (err) {
      setState('error');
      setError(err.message || 'something went wrong');
    }
  }, [input]);

  // Build the embed URL from the current origin so it works on any deployment.
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain';
  const embedUrl = result
    ? `${origin}/api/hexagon/${result.data.owner}/${result.data.repo}.svg`
    : '';
  const embedSnippet = result
    ? `![Project](${embedUrl})`
    : '';

  const handleCopy = useCallback(async () => {
    if (!embedSnippet) return;
    setCopyError('');
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('copy is unavailable here — select the snippet manually');
    }
  }, [embedSnippet]);

  return (
    <div className="app">
      <header className="header">
        <h1>project</h1>
        <p>inspect any public github repo</p>
      </header>

      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="github.com/owner/repo  or  owner/repo"
          autoFocus
          spellCheck="false"
        />
        <button type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? 'checking…' : 'check vibes'}
        </button>
      </form>

      {state === 'error' && (
        <div className="preview-card">
          <div className="error-state">
            <div className="error-icon">⚠</div>
            <div>couldn't check that repo</div>
            <div className="error-msg">{error}</div>
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div className="preview-card">
          <div className="chart-area">
            <div className="loading-state">
              <div className="spinner" />
              <div>fetching repo data…</div>
            </div>
          </div>
        </div>
      )}

      {state === 'loaded' && result && (
        <>
          <div className="preview-card">
            <div className="repo-info">
              <img src={result.data.avatar} alt="" />
              <div className="repo-name">{result.data.name}</div>
              <div className="repo-stars">★ {formatNum(result.data.stars)}</div>
            </div>
            <div className="chart-area">
              <HexagonChart scores={result.scores} repo={result.data} />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="score-details">
            <h3>score breakdown</h3>
            <div className="score-list">
              {AXES.map((axis) => {
                const score = result.scores[axis.key];
                return (
                  <div key={axis.key} className="score-item">
                    <div style={{ flex: 1 }}>
                      <div className="label">{axis.label}</div>
                      <div className="score-bar">
                        <div className="score-bar-fill"
                          style={{ width: `${score}%`, background: scoreColor(score) }} />
                      </div>
                    </div>
                    <div className="value" style={{ color: scoreColor(score) }}>{score}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Embed snippet */}
          <div className="embed-section">
            <div className="embed-label">markdown embed snippet</div>
            <div className="code-block">
              <code>{embedSnippet}</code>
              <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                {copied ? 'copied!' : 'copy'}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: copyError ? 'var(--error)' : 'var(--text-faint)' }}>
              {copyError || 'paste this in your README — the svg renders directly in github'}
            </div>
          </div>
        </>
      )}

      {state === 'idle' && (
        <div className="preview-card">
          <div className="chart-area">
            <div className="empty-state">
              paste a repo url above to inspect it
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Project — scores are heuristic signals, not official metrics</p>
      </footer>
    </div>
  );
}
