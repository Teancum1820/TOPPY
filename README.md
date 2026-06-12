# Top Performer Campaign Maker

A responsive progressive web app that creates unique randomized campaign lists
from the ad inventory in
`Data/Advertising Table (Just KIs)_data.csv`.

It also builds campaign names using the `CD`, `CSD`, `CO`, `CR`, and `TID`
naming convention.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run check
npm run preview
```

The production build is written to `dist/`. The generated service worker
precaches the application and CSV so an installed app can continue working
offline.

## GitHub Pages

The app is configured for:

`https://teancum1820.github.io/Top-Performer-Campaign-Maker/`

The workflow in `.github/workflows/deploy-pages.yml` validates pull requests
and deploys `dist/` whenever changes reach `main`.

Before the first deployment, open the repository's **Settings > Pages** and set
**Source** to **GitHub Actions**. GitHub requires this repository setting before
a custom Pages workflow can publish the site.

## Updating campaign data

Replace the CSV in `Data/` and rebuild the app. Ad IDs are kept as strings so
long IDs do not lose precision. Rows sharing an ad ID are consolidated, and
`Measure Names` / `Measure Values` rows are shown as performance metrics.
