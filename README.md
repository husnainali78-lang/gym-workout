# Training Log

A static weekly training tracker for gym and BJJ, hosted on GitHub Pages.

**Schedule:** Mon Gym A · Tue/Wed/Fri BJJ · Thu Rest · Sat Gym B · Sun Gym C

- Log kg per set; last session's weights show as placeholders and a "Last:" line, with a ▲ when you beat it
- Add or remove exercises per gym day (changes carry forward to future weeks)
- BJJ focus and rounds, daily notes, mark days done
- Browse previous and future weeks
- Export / import a JSON backup (data lives in browser localStorage only)

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, which publishes the site to GitHub Pages.
Repo setting needed once: **Settings → Pages → Source: GitHub Actions**.

## Edit the default program

Change `DEFAULT_PROGRAM` and `SCHEDULE` in `app.js`. Defaults only apply on first load in a browser; after that, edit exercises in the app.
