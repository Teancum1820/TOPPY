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

`https://teancum1820.github.io/TOPPY/`

The workflow in `.github/workflows/deploy-pages.yml` validates pull requests
and deploys `dist/` whenever changes reach `main`.

The repository's Pages source must remain set to **GitHub Actions**.

## Updating campaign data

Replace the CSV in `Data/` and rebuild the app. Ad IDs are kept as strings so
long IDs do not lose precision. Rows sharing an ad ID are consolidated, and
`Measure Names` / `Measure Values` rows are shown as performance metrics.
