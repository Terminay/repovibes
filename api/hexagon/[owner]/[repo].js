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
    <rect x="4" y="4" width="392" height="112" rx="10" fill="#fffaf0" stroke="#3a3128" stroke-width="3"/>
    <text x="200" y="40" text-anchor="middle" font-family="'Caveat', cursive" font-size="26" font-weight="700" fill="#d8452f">RepoVibes</text>
    <text x="200" y="66" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="16" fill="#6b5f4d">${escapeXml(repo)}</text>
    <text x="200" y="90" text-anchor="middle" font-family="'Patrick Hand', cursive" font-size="15" fill="#d8452f">${escapeXml(message)}</text>
  </svg>`;
}

export default async function handler(req, res) {
  const { owner } = req.query;
  // The route param includes the ".svg" suffix from the request path.
  const cleanRepo = String(req.query.repo || '').replace(/\.svg$/, '');

  try {
    const data = await fetchRepoData(owner, cleanRepo);
    const scores = computeScores(data);
    const svg = buildHexagonSVG(scores, { name: data.name, stars: data.stars, avatar: data.avatar });

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
