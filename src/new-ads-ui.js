import {
  buildAdName,
  buildAdsetName,
  buildCampaignName,
  CAMPAIGN_OBJECTIVES,
  getLocalDateInputValue
} from "./campaign-name.js";
import {
  createAdNameFields,
  downloadNewAdFile,
  downloadNewAdFiles,
  filterNewAds,
  getNewAdFilterOptions,
  parseNewAdsCsv,
  selectFilteredNewAds
} from "./new-ads.js";

const MONTHS = [
  ["january", "01", "January"],
  ["february", "02", "February"],
  ["march", "03", "March"],
  ["april", "04", "April"],
  ["may", "05", "May"],
  ["june", "06", "June"],
  ["july", "07", "July"],
  ["august", "08", "August"],
  ["september", "09", "September"],
  ["october", "10", "October"],
  ["november", "11", "November"],
  ["december", "12", "December"]
];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function appendOptions(select, options) {
  for (const [value, label] of options) {
    select.append(createOption(value, label));
  }
}

function createNameField(label, name, value, type = "text") {
  const wrapper = createElement("label", "name-field");
  const labelText = createElement("span", "", label);
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.value = value;
  input.autocomplete = "off";
  wrapper.append(labelText, input);
  return wrapper;
}

function createSelectField(label, name, value, values) {
  const wrapper = createElement("label", "name-field");
  wrapper.append(createElement("span", "", label));
  const select = document.createElement("select");
  select.name = name;
  for (const optionValue of values) {
    select.append(createOption(optionValue, optionValue || "Select"));
  }
  select.value = value;
  wrapper.append(select);
  return wrapper;
}

function getFormValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function formatFileCount(count) {
  return `${count.toLocaleString()} CSV file${count === 1 ? "" : "s"}`;
}

function getUploadSource(fileName, index) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const isoMatch = /(?:^|[^0-9])((?:19|20)\d{2})[-_ ]?(0[1-9]|1[0-2])(?:[^0-9]|$)/.exec(
    baseName
  );

  if (isoMatch) {
    const [, year, month] = isoMatch;
    const match = MONTHS.find(([, value]) => value === month);
    return {
      month: `${year}-${month}`,
      monthLabel: `${match?.[2] ?? month} ${year}`,
      label: fileName
    };
  }

  const monthPattern = MONTHS.map(([name]) => name).join("|");
  const namedMonthMatch = new RegExp(
    `\\b(${monthPattern})\\b\\s*[-_ ]?((?:19|20)\\d{2})`,
    "i"
  ).exec(baseName);

  if (namedMonthMatch) {
    const [, name, year] = namedMonthMatch;
    const match = MONTHS.find(([value]) => value === name.toLowerCase());
    return {
      month: `${year}-${match[1]}`,
      monthLabel: `${match[2]} ${year}`,
      label: fileName
    };
  }

  return {
    month: `upload-${index + 1}`,
    monthLabel: baseName || `Upload ${index + 1}`,
    label: fileName
  };
}

export function createNewAdsController({ root, copyText, showToast }) {
  const objectiveOptions = CAMPAIGN_OBJECTIVES.map(
    (objective) => `<option value="${objective}">${objective}</option>`
  ).join("");

  root.innerHTML = `
    <div class="new-ads-hero">
      <div>
        <span class="eyebrow">Version 2.5.1 / New Video Data upload</span>
        <h1>Upload and name<br><em>new ads.</em></h1>
        <p>
          Choose your own New Video Data CSV files, filter linked rows locally,
          and finish editable Campaign, Adset, and Ad names in one place.
        </p>
      </div>
      <div class="new-ads-stat" id="new-ads-load-status" aria-live="polite">
        No built-in New Video Data is loaded.
      </div>
    </div>

    <section class="new-ads-upload-panel" aria-labelledby="new-ads-upload-title">
      <div class="panel-heading">
        <div>
          <span class="step-label">01 / Upload</span>
          <h2 id="new-ads-upload-title">Upload New Video Data.</h2>
        </div>
        <div class="inventory-count" id="new-ads-upload-count">
          No files selected
        </div>
      </div>
      <label class="file-drop-zone" for="new-ads-file-input">
        <span class="file-drop-title">Choose CSV files</span>
        <span>Use one or more New Video Data exports from your computer.</span>
        <input
          id="new-ads-file-input"
          type="file"
          accept=".csv,text/csv"
          multiple
        />
      </label>
      <p class="privacy-note">
        No data is stored. Uploaded CSVs are processed in this browser tab only
        and are cleared when you refresh or close the page.
      </p>
    </section>

    <div class="naming-stack">
      <section class="compact-name-card" aria-labelledby="new-campaign-title">
        <div class="compact-name-heading">
          <div>
            <span class="step-label">02 / Campaign Name</span>
            <h2 id="new-campaign-title">Campaign Name</h2>
          </div>
          <button class="icon-copy-button" type="button" data-copy-output="new-campaign-output" aria-label="Copy campaign name">Copy</button>
        </div>
        <form class="campaign-name-form five-column-form" id="new-campaign-form">
          <label class="name-field">
            <span>Campaign Description <strong>(CD)</strong></span>
            <input name="description" type="text" placeholder="Type here" autocomplete="off" />
          </label>
          <label class="name-field">
            <span>Start Date <strong>(CSD)</strong></span>
            <input name="startDate" type="date" />
          </label>
          <label class="name-field">
            <span>Objective <strong>(CO)</strong></span>
            <select name="objective">${objectiveOptions}</select>
          </label>
          <label class="name-field">
            <span>Regional Campaign? <strong>(CR)</strong></span>
            <select name="regional">
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          </label>
          <label class="name-field">
            <span>Tracking ID <strong>(TID)</strong></span>
            <input name="trackingId" type="text" placeholder="Optional" autocomplete="off" />
          </label>
        </form>
        <output class="inline-name-output" id="new-campaign-output"></output>
      </section>

      <section class="compact-name-card" aria-labelledby="new-adset-title">
        <div class="compact-name-heading">
          <div>
            <span class="step-label">03 / Adset Name</span>
            <h2 id="new-adset-title">Adset Name</h2>
          </div>
          <button class="icon-copy-button" type="button" data-copy-output="new-adset-output" aria-label="Copy adset name">Copy</button>
        </div>
        <form class="campaign-name-form five-column-form" id="new-adset-form">
          <label class="name-field">
            <span>Adset Description <strong>(ASD)</strong></span>
            <input name="description" type="text" placeholder="Type here" autocomplete="off" />
          </label>
          <label class="name-field">
            <span>Start Date <strong>(ASSD)</strong></span>
            <input name="startDate" type="date" />
          </label>
          <label class="name-field">
            <span>Language <strong>(ASL)</strong></span>
            <input name="language" type="text" placeholder="Type here" autocomplete="off" />
          </label>
          <label class="name-field">
            <span>Audience ID <strong>(AID)</strong></span>
            <input name="audienceId" type="text" placeholder="Type here" autocomplete="off" />
          </label>
          <label class="name-field">
            <span>Tracking ID <strong>(TID)</strong></span>
            <input name="trackingId" type="text" placeholder="Optional" autocomplete="off" />
          </label>
        </form>
        <output class="inline-name-output" id="new-adset-output"></output>
      </section>
    </div>

    <section class="new-ads-filter-panel" aria-labelledby="new-ads-filter-title">
      <div class="panel-heading">
        <div>
          <span class="step-label">04 / Filter and draw</span>
          <h2 id="new-ads-filter-title">Choose the new ads.</h2>
        </div>
        <div class="inventory-count" id="new-ads-match-count">
          Upload CSVs first
        </div>
      </div>
      <form class="new-ads-filter-form" id="new-ads-filter-form">
        <label>
          <span>Number of ads</span>
          <input name="count" type="number" min="1" max="1" value="5" inputmode="numeric" required />
        </label>
        <label>
          <span>Timestamp month</span>
          <select name="timestampMonth">
            <option value="">All timestamp months</option>
          </select>
        </label>
        <label>
          <span>Quality pick</span>
          <select name="qualityPick">
            <option value="">All quality picks</option>
          </select>
        </label>
        <label>
          <span>Star</span>
          <select name="star">
            <option value="">All star values</option>
          </select>
        </label>
        <label>
          <span>Mission</span>
          <select name="mission">
            <option value="">All missions</option>
          </select>
        </label>
        <label>
          <span>Rating</span>
          <select name="rating">
            <option value="">All ratings</option>
          </select>
        </label>
        <button class="button button-primary" type="submit" disabled>
          <span>Generate new ads</span>
        </button>
      </form>
      <p class="form-message" id="new-ads-message" role="alert"></p>
    </section>

    <section class="new-ads-results" id="new-ads-results" aria-labelledby="new-ads-results-title">
      <div class="results-toolbar">
        <div>
          <span class="step-label">05 / Links and Ad Names</span>
          <h2 id="new-ads-results-title">New Ads results</h2>
        </div>
        <div class="result-actions">
          <button class="button button-secondary" id="copy-new-ad-links" type="button" disabled>Copy links</button>
          <button class="button button-dark" id="copy-new-ad-names" type="button" disabled>Copy Ad Names</button>
          <button class="button button-primary" id="download-new-ads" type="button" disabled>Download all</button>
        </div>
      </div>
      <div class="generated-id-alert" id="generated-id-alert" hidden></div>
      <div class="empty-state" id="new-ads-empty-state">
        <span class="empty-number">00</span>
        <div>
          <h3>Your new ads will appear here.</h3>
          <p>Upload New Video Data CSVs, then choose filters and a count.</p>
        </div>
      </div>
      <div class="new-ad-list" id="new-ad-list"></div>
    </section>
  `;

  const state = {
    ads: [],
    selectedAds: [],
    requestedCount: 0,
    activeFilters: {},
    rejectedAdIds: new Set(),
    reviewById: new Map()
  };

  const elements = {
    loadStatus: root.querySelector("#new-ads-load-status"),
    uploadInput: root.querySelector("#new-ads-file-input"),
    uploadCount: root.querySelector("#new-ads-upload-count"),
    campaignForm: root.querySelector("#new-campaign-form"),
    campaignOutput: root.querySelector("#new-campaign-output"),
    adsetForm: root.querySelector("#new-adset-form"),
    adsetOutput: root.querySelector("#new-adset-output"),
    filterForm: root.querySelector("#new-ads-filter-form"),
    matchCount: root.querySelector("#new-ads-match-count"),
    message: root.querySelector("#new-ads-message"),
    generate: root.querySelector("#new-ads-filter-form button[type='submit']"),
    empty: root.querySelector("#new-ads-empty-state"),
    list: root.querySelector("#new-ad-list"),
    generatedAlert: root.querySelector("#generated-id-alert"),
    copyLinks: root.querySelector("#copy-new-ad-links"),
    copyNames: root.querySelector("#copy-new-ad-names"),
    downloadSelected: root.querySelector("#download-new-ads")
  };

  const today = getLocalDateInputValue();
  elements.campaignForm.elements.startDate.value = today;
  elements.adsetForm.elements.startDate.value = today;

  function updateCampaignOutput() {
    elements.campaignOutput.textContent = buildCampaignName(
      getFormValues(elements.campaignForm)
    );
  }

  function updateAdsetOutput() {
    elements.adsetOutput.textContent = buildAdsetName(
      getFormValues(elements.adsetForm)
    );
  }

  function getFilters() {
    const values = getFormValues(elements.filterForm);
    return {
      timestampMonth: values.timestampMonth,
      qualityPick: values.qualityPick,
      star: values.star,
      mission: values.mission,
      rating: values.rating
    };
  }

  function createEmptyReview() {
    return {
      opened: false,
      decision: ""
    };
  }

  function getReview(ad) {
    if (!state.reviewById.has(ad.id)) {
      state.reviewById.set(ad.id, createEmptyReview());
    }

    return state.reviewById.get(ad.id);
  }

  function isReviewApproved(review) {
    return review.opened && review.decision === "pass";
  }

  function getSelectedAdIds() {
    return state.selectedAds.map((ad) => ad.id);
  }

  function getAvailableAds(filters = getFilters()) {
    return filterNewAds(state.ads, filters).filter(
      (ad) => !state.rejectedAdIds.has(ad.id)
    );
  }

  function getReplacementAd() {
    const excludedIds = new Set([
      ...state.rejectedAdIds,
      ...getSelectedAdIds()
    ]);
    return selectFilteredNewAds(state.ads, 1, state.activeFilters, {
      excludeIds: excludedIds
    })[0] ?? null;
  }

  function canDownloadSelectedAds() {
    return (
      state.selectedAds.length > 0 &&
      state.selectedAds.length === state.requestedCount &&
      state.selectedAds.every((ad) => isReviewApproved(getReview(ad)))
    );
  }

  function updateDownloadState() {
    elements.downloadSelected.disabled = !canDownloadSelectedAds();
  }

  function markReviewLinkOpened(ad) {
    getReview(ad).opened = true;
    setTimeout(renderResultsPreservingScroll, 0);
  }

  function rejectAd(ad) {
    const index = state.selectedAds.findIndex((selectedAd) => selectedAd.id === ad.id);
    if (index === -1) {
      return;
    }

    state.rejectedAdIds.add(ad.id);
    state.reviewById.delete(ad.id);
    const replacement = getReplacementAd();

    if (replacement) {
      state.selectedAds.splice(index, 1, replacement);
      showToast(`${ad.id} removed; replacement added`);
    } else {
      state.selectedAds.splice(index, 1);
      showToast(`${ad.id} removed; no replacement ads remain`);
    }

    updateMatchCount();
    renderResultsPreservingScroll();
  }

  function updateReviewPanel(panel, review) {
    const approved = isReviewApproved(review);
    panel.classList.toggle("approved", approved);
    const status = panel.querySelector(".ad-review-status");
    if (status) {
      status.textContent = approved
        ? "Approved"
        : review.opened
          ? "Mark pass or fail"
          : "Open Drive first";
    }
    updateDownloadState();
  }

  function handleReviewDecision(ad, value, checked, panel) {
    const review = getReview(ad);
    if (!review.opened) {
      showToast("Open the Drive link first");
      updateReviewPanel(panel, review);
      return;
    }

    if (!checked) {
      if (review.decision === value) {
        review.decision = "";
      }
      updateReviewPanel(panel, review);
      return;
    }

    if (value === "fail") {
      rejectAd(ad);
      return;
    }

    review.decision = value;
    updateReviewPanel(panel, review);
  }

  function createReviewChoice(ad, value, disabled, panel) {
    const review = getReview(ad);
    const labelText = value === "pass" ? "Pass" : "Fail";
    const label = createElement("label", "review-choice");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = review.decision === value;
    input.disabled = disabled;
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", (event) => {
      event.preventDefault();
      handleReviewDecision(ad, value, input.checked, panel);
    });
    label.append(input, createElement("span", "", labelText));
    return label;
  }

  function createAdReviewPanel(ad) {
    const review = getReview(ad);
    const approved = isReviewApproved(review);
    const panel = createElement("div", "ad-review-panel");
    panel.classList.toggle("approved", approved);

    const heading = createElement("div", "ad-review-heading");
    heading.append(
      createElement("span", "field-label", "Review before download"),
      createElement(
        "span",
        "ad-review-status",
        approved
          ? "Approved"
          : review.opened
            ? "Mark pass or fail"
            : "Open Drive first"
      )
    );

    const grid = createElement("div", "ad-review-decision-grid");
    const disabled = !review.opened;
    grid.append(
      createElement("span", "review-check-name", "All ad standards"),
      createReviewChoice(ad, "pass", disabled, panel),
      createReviewChoice(ad, "fail", disabled, panel)
    );

    panel.append(heading, grid);
    return panel;
  }

  function resetDynamicFilters() {
    elements.filterForm.reset();
    for (const name of [
      "timestampMonth",
      "qualityPick",
      "star",
      "mission",
      "rating"
    ]) {
      const select = elements.filterForm.elements[name];
      select.options.length = 1;
    }
    elements.filterForm.elements.count.value = "5";
    elements.filterForm.elements.count.max = "1";
  }

  function updateMatchCount() {
    const countInput = elements.filterForm.elements.count;
    if (state.ads.length === 0) {
      countInput.max = "1";
      elements.matchCount.textContent = "Upload CSVs first";
      elements.generate.disabled = true;
      return;
    }

    const matches = getAvailableAds(getFilters());
    countInput.max = String(Math.max(1, matches.length));
    elements.matchCount.textContent = `${matches.length.toLocaleString()} matching ads`;
    elements.generate.disabled = matches.length === 0;
  }

  function updateAdNameOutput(form, output) {
    output.textContent = buildAdName(getFormValues(form));
  }

  function createAdCard(ad, index) {
    const card = createElement("article", "new-ad-card");
    const heading = createElement("div", "new-ad-card-heading");
    const identity = createElement("div");
    identity.append(
      createElement(
        "span",
        "campaign-position",
        String(index + 1).padStart(2, "0")
      ),
      createElement("span", "field-label", "Creative ID"),
      createElement("h3", "", ad.id)
    );
    if (ad.generatedId) {
      identity.append(createElement("span", "generated-id-pill", "Toppy generated ID"));
    }

    const actions = createElement("div", "campaign-actions");
    const openLink = createElement("a", "text-link", "Open Drive");
    openLink.href = ad.videoUrl;
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.addEventListener("click", () => markReviewLinkOpened(ad));
    const copyIdButton = createElement(
      "button",
      "text-link",
      "Copy Creative ID"
    );
    copyIdButton.type = "button";
    copyIdButton.addEventListener("click", async () => {
      const copied = await copyText(ad.id);
      if (copied) {
        showToast(`${ad.id} copied`);
      }
    });
    const downloadButton = createElement(
      "button",
      "text-link download-link-button",
      "Download"
    );
    downloadButton.type = "button";
    downloadButton.disabled = !isReviewApproved(getReview(ad));
    downloadButton.addEventListener("click", async () => {
      if (!isReviewApproved(getReview(ad))) {
        showToast("Open the Drive link and approve every check first");
        renderResults();
        return;
      }

      const originalLabel = downloadButton.textContent;
      downloadButton.disabled = true;
      downloadButton.textContent = "Opening...";

      try {
        const copied = copyText(ad.id);
        const download = downloadNewAdFile({
          url: ad.videoUrl,
          adId: ad.id,
          format: ad.format,
          openInNewTab: true
        });
        const copiedToClipboard = await copied;
        await download;
        showToast(
          copiedToClipboard
            ? `Creative ID ${ad.id} copied; download opened in a new tab`
            : "Download opened in a new tab"
        );
      } catch (error) {
        console.error(error);
        showToast(
          error instanceof Error
            ? error.message
            : "The Drive file could not be downloaded."
        );
      } finally {
        downloadButton.disabled = !isReviewApproved(getReview(ad));
        downloadButton.textContent = originalLabel;
      }
    });
    actions.append(openLink, copyIdButton, downloadButton);
    heading.append(identity, actions);
    card.append(heading);

    const meta = createElement("div", "new-ad-meta");
    const rating = ad.rating === null ? "Unrated" : `${ad.rating} / 5`;
    for (const value of [
      ad.monthLabel,
      ad.language || "Language not listed",
      rating,
      ad.status || "Status not listed",
      ad.format
    ]) {
      meta.append(createElement("span", "", value));
    }
    card.append(meta);
    card.append(createAdReviewPanel(ad));

    const fields = createAdNameFields(ad, today);
    const form = createElement("form", "ad-name-form");
    form.append(
      createNameField("Creative Description (AD)", "description", fields.description),
      createNameField("Start Date (ASD)", "startDate", fields.startDate, "date"),
      createNameField("Ad Topic (AT)", "topic", fields.topic),
      createNameField("Ad Blessing (AB)", "blessing", fields.blessing),
      createNameField("Ad Subject (AS)", "subject", fields.subject),
      createSelectField("Creative Format (AF)", "format", fields.format, [
        "",
        "Video",
        "Image",
        "Carousel"
      ]),
      createSelectField("Ad Localized? (AL)", "localized", fields.localized, [
        "",
        "True",
        "False"
      ]),
      createNameField("Creative ID (TID)", "creativeId", fields.creativeId),
      createNameField("Testing ID (TEST)", "testingId", fields.testingId)
    );

    const result = createElement("div", "ad-name-result");
    const output = createElement("output", "inline-name-output");
    const copyButton = createElement("button", "button button-blue", "Copy Ad Name");
    copyButton.type = "button";
    result.append(output, copyButton);

    form.addEventListener("input", () => updateAdNameOutput(form, output));
    form.addEventListener("change", () => updateAdNameOutput(form, output));
    copyButton.addEventListener("click", async () => {
      await copyText(output.textContent);
      showToast(`${ad.id} Ad Name copied`);
    });
    updateAdNameOutput(form, output);

    card.append(form, result);
    return card;
  }

  function renderResults() {
    elements.list.replaceChildren();
    const hasResults = state.selectedAds.length > 0;
    elements.empty.hidden = hasResults;
    elements.copyLinks.disabled = !hasResults;
    elements.copyNames.disabled = !hasResults;
    updateDownloadState();

    if (!hasResults) {
      elements.generatedAlert.hidden = true;
      return;
    }

    const generatedCount = state.selectedAds.filter(
      (ad) => ad.generatedId
    ).length;
    const alertMessages = [];
    if (state.selectedAds.length < state.requestedCount) {
      alertMessages.push(
        `${state.selectedAds.length} of ${state.requestedCount} ads selected; no unchecked replacements remain.`
      );
    }
    if (generatedCount > 0) {
      alertMessages.push(
        generatedCount === 1
          ? "1 selected ad had no Creative ID. Toppy generated an Ad ID and marked it below."
          : `${generatedCount} selected ads had no Creative ID. Toppy generated Ad IDs and marked them below.`
      );
    }
    elements.generatedAlert.hidden = alertMessages.length === 0;
    elements.generatedAlert.textContent = alertMessages.join(" ");

    const fragment = document.createDocumentFragment();
    state.selectedAds.forEach((ad, index) => {
      fragment.append(createAdCard(ad, index));
    });
    elements.list.append(fragment);
  }

  function renderResultsPreservingScroll() {
    const x = window.scrollX;
    const y = window.scrollY;
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    renderResults();
    window.scrollTo({ left: x, top: y, behavior: "auto" });
    requestAnimationFrame(() =>
      window.scrollTo({ left: x, top: y, behavior: "auto" })
    );
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  }

  function populateFilters() {
    resetDynamicFilters();
    const options = getNewAdFilterOptions(state.ads);
    appendOptions(
      elements.filterForm.elements.timestampMonth,
      options.timestampMonths
    );
    appendOptions(
      elements.filterForm.elements.qualityPick,
      options.qualityPicks.map((value) => [value, value])
    );
    appendOptions(
      elements.filterForm.elements.star,
      options.stars.map((value) => [value, value])
    );
    appendOptions(
      elements.filterForm.elements.mission,
      options.missions.map((mission) => [mission, mission])
    );
    appendOptions(
      elements.filterForm.elements.rating,
      options.ratings.map((rating) => [rating, rating])
    );
  }

  function clearUploadedData() {
    state.ads = [];
    state.selectedAds = [];
    state.requestedCount = 0;
    state.activeFilters = {};
    state.rejectedAdIds = new Set();
    state.reviewById = new Map();
    resetDynamicFilters();
    renderResults();
    elements.loadStatus.textContent = "No built-in New Video Data is loaded.";
    elements.uploadCount.textContent = "No files selected";
    elements.matchCount.textContent = "Upload CSVs first";
    elements.message.textContent = "";
    elements.generate.disabled = true;
  }

  async function loadUploadedFiles(files) {
    if (files.length === 0) {
      clearUploadedData();
      return;
    }

    state.ads = [];
    state.selectedAds = [];
    state.requestedCount = 0;
    state.activeFilters = {};
    state.rejectedAdIds = new Set();
    state.reviewById = new Map();
    resetDynamicFilters();
    renderResults();
    elements.message.textContent = "";
    elements.generate.disabled = true;
    elements.uploadCount.textContent = `${formatFileCount(files.length)} selected`;
    elements.loadStatus.textContent = `Reading ${formatFileCount(files.length)} locally...`;
    elements.matchCount.textContent = "Reading uploads";

    try {
      const uploadedAds = await Promise.all(
        files.map(async (file, index) =>
          parseNewAdsCsv(await file.text(), getUploadSource(file.name, index))
        )
      );
      state.ads = uploadedAds.flat();

      if (state.ads.length === 0) {
        throw new Error(
          "No downloadable Drive file links were found in the uploaded CSVs."
        );
      }

      populateFilters();
      updateMatchCount();
      elements.uploadCount.textContent = `${formatFileCount(files.length)} loaded`;
      elements.loadStatus.textContent = `${state.ads.length.toLocaleString()} linked ads loaded from your CSVs`;
      showToast(`${state.ads.length.toLocaleString()} New Video Data rows loaded`);
    } catch (error) {
      console.error(error);
      state.ads = [];
      state.selectedAds = [];
      state.requestedCount = 0;
      state.activeFilters = {};
      state.rejectedAdIds = new Set();
      state.reviewById = new Map();
      resetDynamicFilters();
      renderResults();
      elements.loadStatus.textContent = "Upload failed";
      elements.matchCount.textContent = "Upload CSVs first";
      elements.generate.disabled = true;
      elements.message.textContent =
        error instanceof Error
          ? error.message
          : "The selected CSV files could not be read.";
    }
  }

  elements.uploadInput.addEventListener("change", () => {
    loadUploadedFiles([...elements.uploadInput.files]);
  });
  elements.campaignForm.addEventListener("input", updateCampaignOutput);
  elements.campaignForm.addEventListener("change", updateCampaignOutput);
  elements.adsetForm.addEventListener("input", updateAdsetOutput);
  elements.adsetForm.addEventListener("change", updateAdsetOutput);
  elements.filterForm.addEventListener("input", updateMatchCount);
  elements.filterForm.addEventListener("change", updateMatchCount);
  elements.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const count = Number(elements.filterForm.elements.count.value);
    const filters = getFilters();
    const matchingAds = getAvailableAds(filters);

    if (state.ads.length === 0) {
      elements.message.textContent = "Upload New Video Data CSVs first.";
      return;
    }
    if (!Number.isInteger(count) || count < 1) {
      elements.message.textContent = "Enter a whole number of at least 1.";
      return;
    }
    if (count > matchingAds.length) {
      elements.message.textContent = `Only ${matchingAds.length} ads match these filters.`;
      return;
    }

    elements.message.textContent = "";
    state.requestedCount = count;
    state.activeFilters = filters;
    state.reviewById = new Map();
    state.selectedAds = selectFilteredNewAds(state.ads, count, filters, {
      excludeIds: state.rejectedAdIds
    });

    const languages = [...new Set(state.selectedAds.map((ad) => ad.language).filter(Boolean))];
    if (!elements.adsetForm.elements.language.value && languages.length === 1) {
      elements.adsetForm.elements.language.value = languages[0];
      updateAdsetOutput();
    }

    renderResults();
    root.querySelector("#new-ads-results").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  root.querySelectorAll("[data-copy-output]").forEach((button) => {
    button.addEventListener("click", async () => {
      const output = root.querySelector(`#${button.dataset.copyOutput}`);
      await copyText(output.textContent);
      showToast("Name copied");
    });
  });

  elements.copyLinks.addEventListener("click", async () => {
    await copyText(state.selectedAds.map((ad) => ad.videoUrl).join("\n"));
    showToast(`${state.selectedAds.length} Drive links copied`);
  });

  elements.copyNames.addEventListener("click", async () => {
    const names = [...elements.list.querySelectorAll("output")].map(
      (output) => output.textContent
    );
    await copyText(names.join("\n"));
    showToast(`${names.length} Ad Names copied`);
  });

  elements.downloadSelected.addEventListener("click", async () => {
    if (!canDownloadSelectedAds()) {
      showToast("Open each Drive link and approve every check first");
      updateDownloadState();
      return;
    }

    const originalLabel = elements.downloadSelected.textContent;
    elements.downloadSelected.disabled = true;
    elements.downloadSelected.textContent = "Downloading...";

    try {
      const results = await downloadNewAdFiles({
        ads: state.selectedAds
      });
      showToast(`${results.length} ads downloaded`);
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error
          ? error.message
          : "The ads could not be downloaded."
      );
    } finally {
      updateDownloadState();
      elements.downloadSelected.textContent = originalLabel;
    }
  });

  updateCampaignOutput();
  updateAdsetOutput();
  clearUploadedData();

  return {
    load() {
      return Promise.resolve();
    }
  };
}
