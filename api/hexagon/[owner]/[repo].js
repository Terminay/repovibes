// Vercel serverless function: GET /api/hexagon/:owner/:repo.svg
// Returns a standalone embeddable SVG (used in READMEs). Mirrors the
// Express endpoint in server.js and reuses the shared lib logic.
import { fetchRepoData } from '../../../src/lib/github.js';
import { computeScores } from '../../../src/lib/scoring.js';
import { buildHexagonSVG } from '../../../src/lib/svg.js';

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function buildErrorSVG(message, repo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
    <rect width="400" height="120" fill="#0d1117" rx="8"/>
    <text x="200" y="45" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#f85149" font-weight="600">RepoVibes</text>
    <text x="200" y="70" text-anchor="middle" font-family="monospace" font-size="11" fill="#8b949e">${escapeXml(repo)}</text>
    <text x="200" y="92" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#f85149">${escapeXml(message)}</text>
  </svg>`;
}

export default async function handler(req, res) {
  const { owner } = req.query;
  // The route param includes the ".svg" suffix from the request path.
  const cleanRepo = String(req.query.repo || '').replace(/\.svg$/, '');

  try {
    const data = await fetchRepoData(owner, cleanRepo);
    const scores = computeScores(data);
    const svg = buildHexagonSVG(scores, { name: data.name, stars: data.stars });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(svg);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'something went wrong';
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(status).send(buildErrorSVG(message, `${owner}/${cleanRepo}`));
  }
}
