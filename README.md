# Toppy

A responsive progressive web app for campaign naming, user-provided top-ad CSV
randomization, and New Video Data preparation.

Toppy is not affiliated with the FSC. Toppy does not provide ad data, campaign
data, top-performer inventory files, or New Video Data files. Users must upload
their own CSV data in the browser.

It also builds campaign names using the `CD`, `CSD`, `CO`, `CR`, and `TID`
naming convention.

Version 2.1 removes bundled New Video Data and the Ad Text generator. The
**New Ads** tab requires users to upload their own New Video Data CSV files
before filtering, drawing, copying links, downloading Drive files, or generating
editable Campaign, Adset, and Ad names.

Uploaded CSV data is processed locally in the browser tab. No uploaded data is
stored by Toppy, bundled into the app, or sent to a server by this app.
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
precaches the application shell. Uploaded CSV data is not bundled or persisted.

## GitHub Pages

The app is configured for:

`https://teancum1820.github.io/TOPPY/`

The workflow in `.github/workflows/deploy-pages.yml` validates pull requests
and deploys `dist/` whenever changes reach `main`.

The repository's Pages source must remain set to **GitHub Actions**.

## Updating data

Top Ads and New Video Data are no longer committed to the repo. Users upload
those CSVs in the browser when they need either workflow.
