// scoring.js — heuristics mapping GitHub API data to 0-100 scores per axis.
// All functions are pure and deterministic so the backend SVG and frontend
// preview render identical results.

// Helper: clamp a value to [0, 100] and round.
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

// Helper: linear interpolation between 0..100 over an input range.
// If input <= low → 0, if input >= high → 100, linear in between.
const lerp = (value, low, high) => {
  if (value <= low) return 0;
  if (value >= high) return 100;
  return ((value - low) / (high - low)) * 100;
};

// Activity: how actively the repo is being worked on.
// Considers days since last commit (fresher = better) and commit frequency
// in the last 90 days (more frequent = better).
export function scoreActivity(data) {
  // Days since the last commit on the default branch.
  const lastCommitDays = data.lastCommitDaysAgo ?? Infinity;
  // Freshness contributes 50%: <7 days = full marks, >365 days = 0.
  const freshness = lerp(365 - lastCommitDays, 0, 358); // 365-7=358 range

  // Commit frequency in the last 90 days.
  // <1/week = low, ~1/day (90 commits) = high.
  const recentCommits = data.recentCommitCount ?? 0;
  const frequency = lerp(recentCommits, 4, 90); // 4 commits/90d → 90 commits

  return clamp(freshness * 0.5 + frequency * 0.5);
}

// Community: how many people are contributing.
// Contributors count via /contributors endpoint (capped since the list is
// paginated and we only fetch the first page).
export function scoreCommunity(data) {
  const contributors = data.contributorCount ?? 0;
  // 1 contributor = low, 50+ = full marks.
  return clamp(lerp(contributors, 1, 50));
}

// Responsiveness: how well maintainers handle issues.
// Considers closed/open ratio and average time to close recently closed issues.
export function scoreResponsiveness(data) {
  const open = data.openIssues ?? 0;
  const closed = data.closedIssues ?? 0;
  const total = open + closed;

  // No issues at all → neutral (avoid penalizing repos that just don't use them).
  if (total === 0) return 50;

  // Closed ratio: 0% closed = 0, 90%+ closed = 100.
  const closedRatio = closed / total;
  const ratioScore = lerp(closedRatio, 0, 0.9);

  // Time-to-close: <1 day = great, >60 days = poor. In days.
  const avgCloseDays = data.avgIssueCloseDays ?? null;
  let timeScore = 50; // neutral if unknown
  if (avgCloseDays !== null) {
    timeScore = lerp(60 - avgCloseDays, 0, 59); // 60d → 1d range
  }

  return clamp(ratioScore * 0.6 + timeScore * 0.4);
}

// Documentation: README presence + length, LICENSE, description & topics.
export function scoreDocumentation(data) {
  let score = 0;

  // README present and length as rough proxy for depth.
  const readmeLen = data.readmeLength ?? 0;
  if (readmeLen > 0) score += 20;
  score += lerp(readmeLen, 100, 5000) * 0.3; // up to 30 points

  // LICENSE file present.
  if (data.hasLicense) score += 20;

  // Description filled in.
  if (data.description && data.description.trim().length > 10) score += 15;

  // Topics set (at least 3 topics = full marks for this sub-score).
  const topics = data.topics ?? [];
  score += lerp(topics.length, 0, 3) * 0.15; // up to 15 points

  return clamp(score);
}

// Stability: tagged releases and release frequency.
export function scoreStability(data) {
  const releases = data.releaseCount ?? 0;
  // No releases = 0, 1 release = some, 10+ = full marks for volume.
  const releaseVolume = lerp(releases, 0, 10);

  // Release recency: how fresh is the latest release (days ago).
  let recencyScore = 0;
  if (data.latestReleaseDaysAgo != null) {
    // <30 days = full, >365 days = 0.
    recencyScore = lerp(365 - data.latestReleaseDaysAgo, 0, 335);
  } else if (releases > 0) {
    recencyScore = 30; // has releases but age unknown → modest score
  }

  return clamp(releaseVolume * 0.5 + recencyScore * 0.5);
}

// Popularity: stars + forks, weighted by repo age (growth rate, not raw totals).
export function scorePopularity(data) {
  const stars = data.stars ?? 0;
  const forks = data.forks ?? 0;

  // Raw popularity (log-ish curve so huge repos don't dominate).
  // 10 stars = low, 10k+ = full.
  const rawScore = lerp(Math.log10(stars + 1), 1, 4); // log10(10)=1 → log10(10000)=4

  // Repo age in days; weight so newer repos with same stars score higher
  // (faster growth). If <90 days old, treat as 90 to avoid division noise.
  const ageDays = Math.max(90, data.ageDays ?? 365);
  const starsPerDay = stars / ageDays;
  // 0.05 stars/day ≈ slow, 0.5 stars/day ≈ very fast.
  const growthScore = lerp(starsPerDay, 0.05, 0.5);

  // Forks as a secondary signal: 0 forks = low, 100+ = full.
  const forkScore = lerp(forks, 0, 100);

  return clamp(rawScore * 0.4 + growthScore * 0.4 + forkScore * 0.2);
}

export const AXES = [
  { key: 'activity', label: 'Activity', score: scoreActivity },
  { key: 'community', label: 'Community', score: scoreCommunity },
  { key: 'responsiveness', label: 'Responsiveness', score: scoreResponsiveness },
  { key: 'documentation', label: 'Documentation', score: scoreDocumentation },
  { key: 'stability', label: 'Stability', score: scoreStability },
  { key: 'popularity', label: 'Popularity', score: scorePopularity },
];

// Compute all 6 scores from a normalized repo data object.
// Returns { activity, community, responsiveness, documentation, stability, popularity }
export function computeScores(data) {
  const result = {};
  for (const axis of AXES) {
    result[axis.key] = axis.score(data);
  }
  return result;
}
