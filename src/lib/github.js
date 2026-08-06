// github.js — fetches repo data from the GitHub REST API (unauthenticated)
// and normalizes it into the shape expected by scoring.js.

const API = 'https://api.github.com';

// In-memory cache: key = "owner/repo", value = { data, ts }.
// TTL = 1 hour to match the Cache-Control header.
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();

export function getCached(owner, repo) {
  const key = `${owner}/${repo}`.toLowerCase();
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

export function setCached(owner, repo, data) {
  cache.set(`${owner}/${repo}`.toLowerCase(), { data, ts: Date.now() });
}

async function ghFetch(path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Project',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  return res;
}

// Fetch all the data needed for scoring in parallel.
// Throws { status, message } on error so the caller can map to HTTP status.
export async function fetchRepoData(owner, repo) {
  const cached = getCached(owner, repo);
  if (cached) return cached;

  // 1. Basic repo info.
  const repoRes = await ghFetch(`/repos/${owner}/${repo}`);
  if (repoRes.status === 404) throw { status: 404, message: 'repo not found' };
  if (repoRes.status === 403) {
    const remaining = repoRes.headers.get('x-ratelimit-remaining');
    if (remaining === '0') throw { status: 429, message: 'github api rate limit hit — try again later' };
  }
  if (!repoRes.ok) throw { status: 502, message: `github api error (${repoRes.status})` };
  const repoInfo = await repoRes.json();

  // 2. Parallel fetches for supporting data.
  // All use per_page limits to be gentle on rate limits.
  const [
    contributorsRes, commitsRes, closedIssuesRes, closedCountRes,
    readmeRes, releasesRes,
  ] = await Promise.all([
    ghFetch(`/repos/${owner}/${repo}/contributors?per_page=100&anon=true`),
    ghFetch(`/repos/${owner}/${repo}/commits?per_page=100`),
    ghFetch(`/repos/${owner}/${repo}/issues?state=closed&per_page=30&sort=created&direction=desc`),
    ghFetch(`/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo} is:issue is:closed`)}&per_page=1`),
    ghFetch(`/repos/${owner}/${repo}/readme`),
    ghFetch(`/repos/${owner}/${repo}/releases?per_page=100`),
  ]);

  const contributors = contributorsRes.ok ? await contributorsRes.json() : [];
  const commits = commitsRes.ok ? await commitsRes.json() : [];
  const closedIssues = closedIssuesRes.ok ? await closedIssuesRes.json() : [];
  const releases = releasesRes.ok ? await releasesRes.json() : [];

  // True closed issue count via search API (total_count reflects all matches).
  let closedIssueCount = closedIssues.length;
  if (closedCountRes.ok) {
    const search = await closedCountRes.json();
    if (search.total_count != null) closedIssueCount = search.total_count;
  }

  // README length (bytes).
  let readmeLength = 0;
  if (readmeRes.ok) {
    const readme = await readmeRes.json();
    if (readme.content) {
      try { readmeLength = Buffer.from(readme.content, 'base64').length; }
      catch { readmeLength = readme.size || 0; }
    }
  }

  // LICENSE presence.
  const hasLicense = Boolean(repoInfo.license && repoInfo.license.key);

  // Last commit date → days ago.
  const lastCommitDate = commits.length > 0
    ? new Date(commits[0].commit.committer.date)
    : new Date(repoInfo.pushed_at || repoInfo.updated_at);
  const lastCommitDaysAgo = Math.max(0, Math.floor((Date.now() - lastCommitDate) / 86400000));

  // Commit frequency in last 90 days.
  const ninetyDaysAgo = Date.now() - 90 * 86400000;
  const recentCommitCount = commits.filter((c) =>
    new Date(c.commit.committer.date).getTime() >= ninetyDaysAgo
  ).length;

  // Open issue count from repo info.
  const openIssues = repoInfo.open_issues_count ?? 0;

  // Average time-to-close for recently closed issues.
  let avgIssueCloseDays = null;
  if (closedIssues.length > 0) {
    const closeTimes = closedIssues
      .filter((i) => i.closed_at && i.created_at)
      .map((i) => (new Date(i.closed_at) - new Date(i.created_at)) / 86400000);
    if (closeTimes.length > 0) {
      avgIssueCloseDays = closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length;
    }
  }

  // Releases.
  const releaseCount = releases.length;
  let latestReleaseDaysAgo = null;
  if (releases.length > 0) {
    const latest = new Date(releases[0].published_at || releases[0].created_at);
    latestReleaseDaysAgo = Math.max(0, Math.floor((Date.now() - latest) / 86400000));
  }

  // Repo age.
  const createdAt = new Date(repoInfo.created_at);
  const ageDays = Math.max(1, Math.floor((Date.now() - createdAt) / 86400000));

  const data = {
    // Basic
    name: repoInfo.full_name,
    owner: repoInfo.owner.login,
    repo: repoInfo.name,
    avatar: repoInfo.owner.avatar_url,
    description: repoInfo.description,
    topics: repoInfo.topics ?? [],
    stars: repoInfo.stargazers_count ?? 0,
    forks: repoInfo.forks_count ?? 0,
    // Activity
    lastCommitDaysAgo,
    recentCommitCount,
    // Community
    contributorCount: Array.isArray(contributors) ? contributors.length : 0,
    // Responsiveness
    openIssues,
    closedIssues: closedIssueCount,
    avgIssueCloseDays,
    // Documentation
    readmeLength,
    hasLicense,
    // Stability
    releaseCount,
    latestReleaseDaysAgo,
    // Popularity
    ageDays,
  };

  setCached(owner, repo, data);
  return data;
}
