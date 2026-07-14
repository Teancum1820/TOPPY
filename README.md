# Toppy

A responsive progressive web app for campaign naming, user-provided top-ad CSV
randomization, and New Video Data preparation.

Toppy is not affiliated with the FSC. Toppy does not provide ad data, campaign
data, top-performer inventory files, or New Video Data files. Users must upload
their own CSV data in the browser.

It also builds campaign names using the `CD`, `CSD`, `CO`, `CR`, and `TID`
naming convention.

Version 2.3 adds a Top Ads still-image approval warning. Every time the
**Top Ads** tab opens, users must acknowledge that all Still Images need Eden
or Jacob approval before continuing; refusing closes the Toppy tab. The
**New Ads** tab requires users to upload their own New Video Data CSV files
before filtering, drawing, copying links, downloading Drive files, or generating
editable Campaign, Adset, and Ad names.

Uploaded CSV data is processed locally in the browser tab. No uploaded data is
stored by Toppy, bundled into the app, or sent to a server by this app.
Refreshing or closing the tab clears the uploaded rows.

Version 2.3.1 defaults blank New Ads Script / Topic fields to the Mission name
and adds a bulk download action for saving New Ads with Creative ID filenames.

Version 2.3.2 adds a Windows-only rename script download for selected New Ads.
Users can download the ads into one folder, save the generated PowerShell
script there, and run it to rename the newest media files by Creative ID.

Version 2.3.3 adds a Top Ads CSV example based on the test data export shape,
prefers `Level 1` as the ad ID for current Top Ads exports
data, removes the New Ads rename script button, and renames the bulk New Ads
action to Download all.

Version 2.4 adds required per-ad review checks before Top Ads IDs can be copied
or New Ads videos can be downloaded. Users must open each ad link, approve the
language, Video, and Relevant checks, and any No answer removes that ad and
draws a replacement from the remaining eligible pool when one is available.

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
