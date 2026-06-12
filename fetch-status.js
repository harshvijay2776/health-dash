// Fetches monitor status from the cron-job.org REST API for every configured
// API key, merges the results, and writes data.json.
//
// Run by .github/workflows/fetch-status.yml on a schedule. Requires Node 18+
// (uses the built-in global fetch). API keys come from the environment:
//   CRONJOB_API_KEY_1, CRONJOB_API_KEY_2, ... (any number, sequentially named)

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.cron-job.org';

// Collect every CRONJOB_API_KEY_* env var that has a value.
function collectApiKeys() {
  return Object.keys(process.env)
    .filter((k) => /^CRONJOB_API_KEY_\d+$/.test(k))
    .sort()
    .map((k) => process.env[k])
    .filter((v) => v && v.trim().length > 0);
}

// cron-job.org lastStatus: 1 = OK. 0 = not executed yet / unknown.
// Anything else is a failure (DNS, connect, HTTP error, timeout, etc.).
function mapStatus(lastStatus) {
  if (lastStatus === 1) return 'up';
  if (lastStatus === 0 || lastStatus === undefined || lastStatus === null) return 'unknown';
  return 'down';
}

function toIso(unixSeconds) {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

async function fetchJobs(apiKey) {
  const res = await fetch(`${API_BASE}/jobs`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`cron-job.org API returned ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  return Array.isArray(body.jobs) ? body.jobs : [];
}

async function main() {
  const keys = collectApiKeys();
  if (keys.length === 0) {
    console.error('No CRONJOB_API_KEY_* secrets found in the environment.');
    process.exit(1);
  }

  const monitors = [];
  const seen = new Set();

  for (let i = 0; i < keys.length; i++) {
    let jobs;
    try {
      jobs = await fetchJobs(keys[i]);
    } catch (err) {
      console.error(`Key #${i + 1}: ${err.message}`);
      continue;
    }
    for (const job of jobs) {
      const id = String(job.jobId);
      if (seen.has(id)) continue; // de-dupe across accounts
      seen.add(id);
      monitors.push({
        id,
        name: job.title || job.url || `Job ${id}`,
        url: job.url || null,
        enabled: job.enabled !== false,
        status: job.enabled === false ? 'paused' : mapStatus(job.lastStatus),
        code: typeof job.lastStatus === 'number' ? job.lastStatus : null,
        responseMs: typeof job.lastDuration === 'number' ? job.lastDuration : null,
        lastCheck: toIso(job.lastExecution),
        nextCheck: toIso(job.nextExecution)
      });
    }
  }

  monitors.sort((a, b) => a.name.localeCompare(b.name));

  const summary = monitors.reduce(
    (acc, m) => {
      acc.total += 1;
      if (m.status === 'up') acc.up += 1;
      else if (m.status === 'down') acc.down += 1;
      else acc.unknown += 1;
      return acc;
    },
    { total: 0, up: 0, down: 0, unknown: 0 }
  );

  const data = {
    updatedAt: new Date().toISOString(),
    summary,
    monitors
  };

  const outPath = path.join(__dirname, 'data.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote ${monitors.length} monitor(s) to data.json (${summary.up} up, ${summary.down} down, ${summary.unknown} unknown).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
