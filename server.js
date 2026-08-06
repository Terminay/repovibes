// server.js — Express backend serving the SVG embed endpoint + static frontend.
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fetchRepoData } from './src/lib/github.js';
import { computeScores } from './src/lib/scoring.js';
import { buildHexagonSVG } from './src/lib/svg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const distDir = path.join(__dirname, 'dist');
const distExists = fs.existsSync(distDir);

// Parse a repo URL or "owner/repo" shorthand → { owner, repo }.
function parseRepoInput(input) {
  const trimmed = input.trim();
  // Match https://github.com/owner/repo
  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
  }
  // Match owner/repo
  const shortMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
  return null;
}

// GET /api/hexagon/:owner/:repo.svg — standalone embeddable SVG.
app.get('/api/hexagon/:owner/:repo.svg', async (req, res) => {
  const { owner, repo } = req.params;
  // Strip any trailing artifacts.
  const cleanRepo = repo.replace(/\.svg$/, '');

  try {
    const data = await fetchRepoData(owner, cleanRepo);
    const scores = computeScores(data);
    const svg = buildHexagonSVG(scores, {
      name: data.name,
      stars: data.stars,
    });

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(svg);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'something went wrong';
    // Return an error SVG so the <img> still renders something useful.
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(status).send(buildErrorSVG(message, `${owner}/${cleanRepo}`));
  }
});

// GET /api/scores/:owner/:repo — JSON scores for the frontend preview.
app.get('/api/scores/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
    const data = await fetchRepoData(owner, repo);
    const scores = computeScores(data);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ data, scores });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'failed' });
  }
});

// POST /api/parse — parse a URL/input server-side (optional, frontend does its own).
app.get('/api/parse/:input', (req, res) => {
  const parsed = parseRepoInput(req.params.input);
  if (!parsed) return res.status(400).json({ error: 'invalid repo' });
  res.json(parsed);
});

function buildErrorSVG(message, repo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
    <rect width="400" height="120" fill="#0d1117" rx="8"/>
    <text x="200" y="45" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#f85149" font-weight="600">RepoVibes</text>
    <text x="200" y="70" text-anchor="middle" font-family="monospace" font-size="11" fill="#8b949e">${escapeXml(repo)}</text>
    <text x="200" y="92" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#f85149">${escapeXml(message)}</text>
  </svg>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

// Serve the built frontend in production (only if dist/ exists).
if (distExists) {
  app.use(express.static(distDir));
}

// SPA catch-all: serve index.html for non-API routes.
// Returns 404 JSON for unmatched /api/ paths, and a helpful message
// if the frontend hasn't been built yet.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'not found' });
  }
  const indexFile = path.join(distDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  return res.status(503).type('text').send(
    'RepoVibes server is running but the frontend has not been built. Run `npm run build` first.'
  );
});

app.listen(PORT, () => {
  console.log(`RepoVibes server running on http://localhost:${PORT}`);
});
