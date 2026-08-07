// scoring.js — heuristics mapping GitHub API data to 0-100 scores per axis.
// Each axis combines multiple weighted signals so repos with similar surface
// stats still differentiate. All functions are pure and deterministic so the
// backend SVG and frontend preview render identical results.

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

// Linear interpolation over [low, high]. Below low → 0, above high → 100.
const lerp = (value, low, high) => {
  if (value <= low) return 0;
  if (value >= high) return 100;
  return ((value - low) / (high - low)) * 100;
};

// Logarithmic interpolation — handles huge ranges without saturation.
// Maps log10(value) over [logLow, logHigh] to 0-100.
const logLerp = (value, low, high) => lerp(Math.log10(value + 1), Math.log10(low + 1), Math.log10(high + 1));

// Weighted average of [value, weight] pairs. Missing values fall back to 50
// (neutral) so absent data doesn't skew the result.
function weightedMean(pairs) {
  let total = 0;
  let weight = 0;
  for (const [value, w] of pairs) {
    if (value == null || Number.isNaN(value)) continue;
    total += value * w;
    weight += w;
  }
  return weight > 0 ? total / weight : 50;
}

// Standard deviation of an array (for cadence regularity).
function stdev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ── Activity ───────────────────────────────────────────────────────────
// How actively the repo is being worked on, right now. Combines freshness,
// commit volume, cadence regularity, author diversity, and event buzz.
export function scoreActivity(data) {
  const lastCommitDays = data.lastCommitDaysAgo ?? Infinity;
  const freshness = lerp(365 - lastCommitDays, 0, 358); // 7d → full, 365d → 0

  const recentCommits = data.recentCommitCount ?? 0;
  const frequency = logLerp(recentCommits, 4, 300); // 4 → 300 commits/90d

  // Cadence regularity: compute gaps between recent commits; tighter = better.
  let cadence = 50;
  const dates = data.commitDates ?? [];
  if (dates.length >= 3) {
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i - 1]) / 86400000);
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length || 1;
    const cv = stdev(gaps) / meanGap; // coefficient of variation
    cadence = clamp(100 - cv * 60); // CV 0 → 100, CV ~1.67 → 0
  }

  // Active author diversity in recent commits.
  const authors = data.recentAuthorCount ?? 0;
  const authorDiversity = logLerp(authors, 1, 20);

  // Event buzz (watch/fork/push events in last 90 days).
  const events = data.recentEventCount ?? 0;
  const eventBuzz = logLerp(events, 5, 500);

  return clamp(weightedMean([
    [freshness, 3],
    [frequency, 3],
    [cadence, 1.5],
    [authorDiversity, 1.5],
    [eventBuzz, 1],
  ]));
}

// ── Community ──────────────────────────────────────────────────────────
// How healthy and welcoming the contributor base is. Combines contributor
// volume, governance docs, issue/PR templates, discussions, and PR throughput.
export function scoreCommunity(data) {
  const contributors = data.contributorCount ?? 0;
  const contributorVolume = logLerp(contributors, 1, 100);

  // Governance & welcoming docs.
  const govScore = [
    data.hasCodeOfConduct,
    data.hasContributing,
    data.hasIssueTemplate,
    data.hasPRTemplate,
    data.hasDiscussions,
  ].filter(Boolean).length * 20;

  // PR throughput as a proxy for external participation.
  const mergedPRs = data.mergedPRCount ?? 0;
  const prThroughput = logLerp(mergedPRs, 0, 500);

  return clamp(weightedMean([
    [contributorVolume, 3],
    [govScore, 3],
    [prThroughput, 2],
  ]));
}

// ── Responsiveness ─────────────────────────────────────────────────────
// How well maintainers handle issues and PRs. Combines close ratio, median
// time-to-close (robust to outliers), stale-issue ratio, and PR backlog.
export function scoreResponsiveness(data) {
  const open = data.openIssues ?? 0;
  const closed = data.closedIssues ?? 0;
  const total = open + closed;

  if (total === 0 && (data.openPRCount ?? 0) === 0) return 50;

  // Closed ratio.
  const closedRatio = total > 0 ? closed / total : 0.5;
  const ratioScore = lerp(closedRatio, 0, 0.95);

  // Median time-to-close (days). More robust than average.
  const medianDays = data.medianIssueCloseDays ?? data.avgIssueCloseDays;
  let timeScore = 50;
  if (medianDays != null) timeScore = lerp(60 - medianDays, 0, 59);

  // Stale issue ratio: fraction of open issues older than 180 days.
  let staleScore = 50;
  if (open > 0) {
    const staleRatio = (data.staleIssueCount ?? 0) / open;
    staleScore = lerp(1 - staleRatio, 0, 1);
  }

  // PR backlog: open PRs vs merged PRs. High open/merged ratio = bottleneck.
  let prScore = 50;
  const merged = data.mergedPRCount ?? 0;
  const openPRs = data.openPRCount ?? 0;
  if (merged + openPRs > 0) {
    const prRatio = merged / (merged + openPRs);
    prScore = lerp(prRatio, 0, 0.9);
  }

  return clamp(weightedMean([
    [ratioScore, 3],
    [timeScore, 2.5],
    [staleScore, 2],
    [prScore, 2.5],
  ]));
}

// ── Documentation ──────────────────────────────────────────────────────
// How thoroughly the repo is documented. Combines README depth, LICENSE,
// description, topics, homepage, wiki, and language ecosystem clarity.
export function scoreDocumentation(data) {
  let score = 0;

  const readmeLen = data.readmeLength ?? 0;
  if (readmeLen > 0) score += 15;
  score += logLerp(readmeLen, 100, 20000) * 0.25; // up to 25

  if (data.hasLicense) score += 15;
  if (data.description && data.description.trim().length > 10) score += 10;

  const topics = data.topics ?? [];
  score += lerp(topics.length, 0, 5) * 0.08; // up to 8

  if (data.homepage && data.homepage.trim()) score += 7;
  if (data.hasWiki) score += 5;

  // Language ecosystem clarity: a focused codebase is easier to document.
  const langCount = data.languageCount ?? 0;
  if (langCount >= 1) score += Math.min(10, 4 + langCount * 2); // 6 → 10

  // Governance docs (overlap with community, but they're docs too).
  let docExtras = 0;
  if (data.hasContributing) docExtras += 5;
  if (data.hasCodeOfConduct) docExtras += 3;
  if (data.hasIssueTemplate) docExtras += 4;
  if (data.hasPRTemplate) docExtras += 3;
  score += docExtras;

  return clamp(score);
}

// ── Stability ──────────────────────────────────────────────────────────
// How production-ready and reliable the repo appears. Combines release
// volume, recency, cadence consistency, non-archived status, and license.
export function scoreStability(data) {
  if (data.isArchived) return 15; // archived = frozen, low stability going forward

  const releases = data.releaseCount ?? 0;
  const releaseVolume = logLerp(releases, 0, 50);

  let recencyScore = 0;
  if (data.latestReleaseDaysAgo != null) {
    recencyScore = lerp(365 - data.latestReleaseDaysAgo, 0, 335);
  } else if (releases > 0) {
    recencyScore = 30;
  }

  // Cadence consistency: regular releases beat sporadic bursts.
  let cadenceScore = 50;
  if (data.releaseCadenceDays != null && releases > 2) {
    // Ideal: 7-90 day cycles. Too fast or too slow both lose points.
    const d = data.releaseCadenceDays;
    if (d <= 7) cadenceScore = lerp(d, 1, 7);
    else if (d <= 90) cadenceScore = 100;
    else cadenceScore = lerp(365 - d, 0, 275);
  }

  const licenseScore = data.hasLicense ? 100 : 20;

  // Stars as a trust proxy (log-scaled).
  const trustScore = logLerp(data.stars ?? 0, 10, 10000);

  return clamp(weightedMean([
    [releaseVolume, 2.5],
    [recencyScore, 2.5],
    [cadenceScore, 2],
    [licenseScore, 1.5],
    [trustScore, 1.5],
  ]));
}

// ── Popularity ─────────────────────────────────────────────────────────
// How much attention the repo attracts, adjusted for age. Combines stars,
// forks, watchers, and recent growth signals (watch/fork events).
export function scorePopularity(data) {
  const stars = data.stars ?? 0;
  const forks = data.forks ?? 0;

  // Raw popularity (log curve so huge repos don't dominate).
  const rawScore = logLerp(stars, 10, 50000);

  // Growth rate: stars per day, age-adjusted.
  const ageDays = Math.max(90, data.ageDays ?? 365);
  const starsPerDay = stars / ageDays;
  const growthScore = logLerp(starsPerDay, 0.01, 1);

  // Forks (secondary adoption signal).
  const forkScore = logLerp(forks, 0, 5000);

  // Watchers (subscribers — deeper engagement than stars).
  const watchers = data.watchers ?? 0;
  const watcherScore = logLerp(watchers, 5, 2000);

  // Recent momentum: watch + fork events in last 90 days.
  const recentMomentum = (data.recentWatchEvents ?? 0) + (data.recentForkEvents ?? 0);
  const momentumScore = logLerp(recentMomentum, 0, 200);

  return clamp(weightedMean([
    [rawScore, 3],
    [growthScore, 2],
    [forkScore, 1.5],
    [watcherScore, 1.5],
    [momentumScore, 2],
  ]));
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
export function computeScores(data) {
  const result = {};
  for (const axis of AXES) {
    result[axis.key] = axis.score(data);
  }
  return result;
}
