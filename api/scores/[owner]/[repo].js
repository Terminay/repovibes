// Vercel serverless function: GET /api/scores/:owner/:repo
// Mirrors the Express endpoint in server.js so the deployed app works
// without a long-running server. Reuses the shared lib logic.
import { fetchRepoData, toPublicRepo } from '../../../src/lib/github.js';
import { computeScores } from '../../../src/lib/scoring.js';

export default async function handler(req, res) {
  const { owner, repo } = req.query;
  try {
    const data = await fetchRepoData(owner, repo);
    const scores = computeScores(data);
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).json({ repo: toPublicRepo(data), scores });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'failed' });
  }
}
