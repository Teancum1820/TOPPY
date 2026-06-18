# Toppy

A responsive progressive web app that creates unique randomized campaign lists
from the English and Spanish top-performer inventories in `Data/`.

It also builds campaign names using the `CD`, `CSD`, `CO`, `CR`, and `TID`
naming convention.

Version 2.1 removes bundled New Video Data and the Ad Text generator. The
**New Ads** tab now requires users to upload their own New Video Data CSV files
before filtering, drawing, copying links, downloading Drive files, or generating
editable Campaign, Adset, and Ad names.

Uploaded New Video Data is processed locally in the browser tab. No uploaded
data is stored by Toppy, bundled into the app, or sent to a server by this app.
Refreshing or closing the tab clears the uploaded rows.

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
precaches the application and top-performer CSVs so an installed app can
continue working offline.

## GitHub Pages

The app is configured for:

`https://teancum1820.github.io/TOPPY/`

The workflow in `.github/workflows/deploy-pages.yml` validates pull requests
and deploys `dist/` whenever changes reach `main`.

The repository's Pages source must remain set to **GitHub Actions**.

## Updating campaign data

Replace the language CSVs in `Data/`, then rebuild the app. Ad IDs are kept as
strings so long IDs do not lose precision. Top-performer rows sharing an ad ID
are consolidated, and `Measure Names` / `Measure Values` rows are shown as
performance metrics.

New Video Data is no longer committed to the repo. Users upload those CSVs from
the New Ads tab when they need that workflow.
