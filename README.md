# Health Check Dashboard

PWA uptime dashboard — reads live data from a GitHub Actions job that polls the
[cron-job.org](https://cron-job.org) API every 5 minutes. Installable on Android & iOS.

## Files

```
index.html                          The dashboard (PWA shell + UI)
manifest.json                       PWA manifest
sw.js                               Service worker (offline support)
icon-192.png  icon-512.png          App icons
make-icons.py                       Regenerates the icons (optional, needs Pillow)
data.json                           Live status feed (written by the Action)
fetch-status.js                     Pulls status from cron-job.org → data.json
.github/workflows/fetch-status.yml  Runs fetch-status.js every 5 min
```

## Setup (one-time, ~10 min)

### 1. Create the GitHub repo
1. Go to <https://github.com/new>
2. Name it `health-dash` (or anything you like)
3. Make it **Public**
4. Click **Create repository**

### 2. Upload the files
Drag-and-drop everything above into the repo, or `git push`.

### 3. Add API keys as secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**.
Add one secret per cron-job.org account (the workflow reads every
`CRONJOB_API_KEY_*` it finds and merges all jobs):

| Name | Value |
|------|-------|
| `CRONJOB_API_KEY_1` | _your cron-job.org API key_ |
| `CRONJOB_API_KEY_2` | _a second account's key (optional)_ |

Get a key at cron-job.org → **Settings → API**.

### 4. Enable GitHub Pages
**Settings → Pages → Source → Deploy from branch → main → / (root) → Save**.
Live at: `https://YOUR_GITHUB_USERNAME.github.io/health-dash/`

### 5. Run the action once manually
**Actions → Fetch monitor status → Run workflow**. This populates `data.json`
immediately; after that it runs automatically every 5 minutes.

> The workflow needs write access to commit `data.json`. If the push step fails,
> check **Settings → Actions → General → Workflow permissions → Read and write**.

---

## How status is determined

`fetch-status.js` calls `GET https://api.cron-job.org/jobs` for each API key.
Per job, `lastStatus == 1` → **up**, `0`/unset → **unknown**, anything else →
**down**. Disabled jobs show as **paused**. No manual monitor list is needed —
every job in the connected account(s) appears automatically.

## Install on phone

**Android (Chrome)** — open the URL, tap the **Install** banner (or menu ⋮ → Add to Home Screen).

**iOS (Safari only)** — open the URL, tap **Share** → **Add to Home Screen** → Add.

## Add a monitor locally

Tap **+ Add monitor** in the app to pin a monitor saved only on your device
(double-tap its card to remove). To include it in the live feed, just add the job
to the cron-job.org account whose API key is configured — it shows up on the next run.
