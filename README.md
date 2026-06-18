# Toppy

A responsive progressive web app for campaign naming, user-provided top-ad CSV
randomization, new-ad preparation, and AI-assisted ad text generation.

Toppy is not affiliated with the FSC. Toppy does not provide ad data, campaign
data, or top-performer inventory files. Users must upload their own CSV data
file before the Top Ads randomizer can select ads.

It also builds campaign names using the `CD`, `CSD`, `CO`, `CR`, and `TID`
naming convention.

Version 2.1 removes bundled New Video Data and the Ad Text generator. The
**New Ads** tab now requires users to upload their own New Video Data CSV files
before filtering, drawing, copying links, downloading Drive files, or generating
editable Campaign, Adset, and Ad names.

Version 1.3 adds an **Ad Text** tab that uses Google Gemini 3.5 Flash to create
five editable Meta lead-generation campaign concepts. Users provide their own
Google AI Studio API key for the current browser tab; Toppy does not store or
bundle the key.

Version 1.3.1 fixes Gemini structured-output requests and ensures downloaded
New Ads use their Ad ID as the filename.

Version 2.0 removes bundled top-performer data and adds user-provided CSV upload
for random top performer selection.

## Ad Text setup

1. Create a free Gemini API key in
   [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open the Ad Text tab and paste the key.
3. Select an Ad Topic and Ad Blessing, then add optional notes or a public
   source URL.

The Gemini free tier may use submitted content to improve Google's products.
Do not submit confidential or personal information. Use a separate key
restricted to the Gemini API and rotate it if it is exposed; a static browser
app cannot protect a key as securely as a backend proxy.

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
precaches the application and bundled New Ads CSV files so an installed app can
continue working offline. Top Ads CSV data is not bundled; users upload their
own CSV file in the browser.

## GitHub Pages

The app is configured for:

`https://teancum1820.github.io/TOPPY/`

The workflow in `.github/workflows/deploy-pages.yml` validates pull requests
and deploys `dist/` whenever changes reach `main`.

The repository's Pages source must remain set to **GitHub Actions**.

## Updating creative data

Replace the monthly creative CSVs in `New Ads/`, then rebuild the app. Ad IDs
are kept as strings so long IDs do not lose precision.
