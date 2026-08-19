// Vercel serverless function: GET /api/hexagon/:owner/:repo.svg
// Returns a standalone embeddable SVG (used in READMEs). Mirrors the
// Express endpoint in server.js and reuses the shared lib logic.
import { fetchRepoData, fetchImageAsBase64 } from '../../../src/lib/github.js';
import { computeScores } from '../../../src/lib/scoring.js';
import { buildHexagonSVG, buildErrorSVG } from '../../../src/lib/svg.js';

export default async function handler(req, res) {
  const { owner } = req.query;
  // The route param includes the ".svg" suffix from the request path.
  const cleanRepo = String(req.query.repo || '').replace(/\.svg$/, '');

  try {
    const data = await fetchRepoData(owner, cleanRepo);
    const scores = computeScores(data);
    const avatarBase64 = data.avatar ? await fetchImageAsBase64(data.avatar) : null;
    const svg = buildHexagonSVG(scores, { name: data.name, stars: data.stars, avatar: data.avatar, avatarBase64 });

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
