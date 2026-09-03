# Galaxy Push Relay (Cloudflare Worker)

Zero-cost, 24/7 standalone Web Push Relay for LocalGameGalaxy (e.g. GuessArt closed-browser push notifications).

## 🚀 Quick Deployment

### Option 1: 1-Click Deploy
Click the **"Deploy to Cloudflare Workers"** button in LocalGameGalaxy Settings. Cloudflare will create a repository clone in your GitHub account and deploy the worker automatically.

### Option 2: 1-Command CLI Deployment
From this directory:
```bash
npx wrangler deploy
```
Once deployed, copy your worker URL (e.g. `https://galaxy-push-relay.<your-subdomain>.workers.dev`) into **Settings ➔ Notifications / Relay**.

---

## 🔄 How to Update Your Deployed Worker

When the upstream project (`suitably/LocalGameGalaxy`) receives new updates or bugfixes, your personal GitHub repository clone is not automatically updated by GitHub. Here is how you can update it:

### Method A: Sync Fork in GitHub (if created as a Fork)
1. Open your cloned repository on GitHub (e.g. `https://github.com/<your-username>/<repo-name>`).
2. Click the **"Sync fork"** button near the top of the repository page and select **"Update branch"**.
3. Cloudflare will detect the new commit and automatically redeploy the worker within seconds!

### Method B: Direct Local Deploy (Fastest, no GitHub sync needed)
If you already have LocalGameGalaxy locally:
```bash
cd server/cloudflare-push-relay
npx wrangler deploy
```
This deploys the latest local code directly to your Cloudflare account.

### Method C: Automated Sync via GitHub Action (Fully Automatic)
In your personal GitHub repository, create `.github/workflows/sync-upstream.yml`:
```yaml
name: Sync Upstream

on:
  schedule:
    - cron: '0 4 * * *' # Daily at 04:00 UTC
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4
      - name: Sync from Upstream
        run: |
          git remote add upstream https://github.com/suitably/LocalGameGalaxy.git || true
          git fetch upstream main
          git checkout main
          git merge upstream/main -m "chore: sync with upstream"
          git push origin main
```
Whenever this runs, it pulls the latest code and pushes to `main`, which automatically triggers Cloudflare to redeploy.
