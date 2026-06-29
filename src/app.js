import { registerSW } from "virtual:pwa-register";
import toppyUrl from "../images/Toppy Transparent.png?url";
import {
  buildCampaignName,
  CAMPAIGN_OBJECTIVES,
  getLocalDateInputValue
} from "./campaign-name.js";
import { consolidateAds, parseCsv, selectRandomAds } from "./data.js";
import { createNewAdsController } from "./new-ads-ui.js";
import "./styles.css";

const state = {
  ads: [],
  selectedAds: [],
  metadataColumns: [],
  metricNames: [],
  installPrompt: null
};

const app = document.querySelector("#app");
const objectiveOptions = CAMPAIGN_OBJECTIVES.map(
  (objective) => `<option value="${objective}">${objective}</option>`
).join("");

app.innerHTML = `
  <div class="app-shell">
    <div class="affiliation-banner" role="note">
      Not affiliated with the FSC
    </div>
    <header class="site-header">
      <a class="brand" href="./" aria-label="Toppy home">
        <span class="brand-mark" aria-hidden="true">
          <span></span><span></span><span></span>
        </span>
        <span>Toppy</span>
      </a>
      <div class="header-actions">
        <span class="connection-status" id="connection-status">
          <span class="status-dot"></span>
          <span class="status-text">Online</span>
        </span>
        <button class="button button-quiet" id="install-button" type="button" hidden>
          Install app
        </button>
      </div>
    </header>

    <nav class="app-tabs" role="tablist" aria-label="Toppy tools">
      <button
        class="app-tab active"
        type="button"
        role="tab"
        aria-selected="true"
        aria-controls="top-ads-panel"
        data-tab="top-ads"
      >
        Top Ads
      </button>
      <button
        class="app-tab"
        type="button"
        role="tab"
        aria-selected="false"
        aria-controls="new-ads-panel"
        data-tab="new-ads"
      >
        New Ads
      </button>
    </nav>

    <main>
      <div id="top-ads-panel" role="tabpanel" data-tab-panel="top-ads">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-content">
          <div class="eyebrow">Campaign utility / randomizer</div>
          <h1 id="page-title">Build your next<br><em>ad campaign.</em></h1>
          <p class="hero-copy">
            Upload your own CSV data, choose a campaign size, and get a unique
            randomized set of top performer ads from your file.
          </p>
          <p class="data-disclaimer">
            Toppy does not provide ad data or campaign data. You must provide
            your own CSV file before the randomizer can select ads.
          </p>
        </div>
        <div class="hero-mascot" aria-label="Toppy, the Top Performer mascot">
          <span class="mascot-intro">Meet Toppy</span>
          <img src="${toppyUrl}" alt="Toppy the top-hat mascot giving a thumbs up" />
        </div>
      </section>

      <section class="name-generator-section" aria-labelledby="name-generator-title">
        <div class="name-generator-card">
          <div class="name-generator-heading">
            <div>
              <span class="step-label">01 / Campaign name</span>
              <h2 id="name-generator-title">Name it with Toppy.</h2>
              <p>Complete the campaign fields to build the formatted name automatically.</p>
            </div>
            <img class="name-toppy" src="${toppyUrl}" alt="" aria-hidden="true" />
          </div>

          <form class="campaign-name-form" id="campaign-name-form">
            <label class="name-field">
              <span>Campaign Description <strong>(CD)</strong></span>
              <input
                id="campaign-description"
                name="campaign-description"
                type="text"
                placeholder="Type here"
                autocomplete="off"
              />
            </label>
            <label class="name-field">
              <span>Start Date <strong>(CSD)</strong></span>
              <input id="campaign-start-date" name="campaign-start-date" type="date" />
            </label>
            <label class="name-field">
              <span>Objective <strong>(CO)</strong></span>
              <select id="campaign-objective" name="campaign-objective">
                ${objectiveOptions}
              </select>
            </label>
            <label class="name-field">
              <span>Regional Campaign? <strong>(CR)</strong></span>
              <select id="campaign-regional" name="campaign-regional">
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </label>
          </form>

          <div class="campaign-name-result">
            <div class="campaign-name-copy">
              <span class="field-label">Generated campaign name</span>
              <output id="campaign-name-output" for="campaign-description campaign-start-date campaign-objective campaign-regional"></output>
            </div>
            <button class="button button-blue" id="copy-name-button" type="button">
              <span>Copy name</span>
              <span aria-hidden="true">⧉</span>
            </button>
          </div>
        </div>
      </section>

      <section class="generator-panel" aria-labelledby="generator-title">
        <div class="panel-heading">
          <div>
            <span class="step-label">02 / Upload CSV</span>
            <h2 id="generator-title">Bring your data.</h2>
          </div>
          <div class="inventory-count" id="inventory-count" aria-live="polite">
            No CSV loaded
          </div>
        </div>

        <form class="generator-form" id="generator-form">
          <label class="csv-upload-control">
            <span>CSV data file</span>
            <input id="csv-upload" name="csv-upload" type="file" accept=".csv,text/csv" />
          </label>
          <div class="number-control">
            <button class="number-button" id="decrease-count" type="button" aria-label="Decrease ad count">−</button>
            <label class="sr-only" for="ad-count">Number of ads</label>
            <input id="ad-count" name="ad-count" type="number" min="1" value="10" inputmode="numeric" required />
            <button class="number-button" id="increase-count" type="button" aria-label="Increase ad count">+</button>
          </div>
          <div class="quick-counts" aria-label="Quick campaign sizes">
            <button type="button" data-count="5">5 ads</button>
            <button type="button" data-count="10" class="active">10 ads</button>
            <button type="button" data-count="20">20 ads</button>
          </div>
          <button class="button button-primary generate-button" type="submit" disabled>
            <span>Generate campaign</span>
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p class="upload-note">
          No data is included with Toppy. Upload a CSV containing ad IDs and any
          performance columns you want to review; the file is read in your
          browser for this session.
        </p>
        <p class="form-message" id="form-message" role="alert"></p>
      </section>

      <section class="results-section" id="results-section" aria-labelledby="results-title">
        <div class="results-toolbar">
          <div>
            <span class="step-label">03 / Your selection</span>
            <h2 id="results-title">Campaign results</h2>
          </div>
          <div class="result-actions">
            <button class="button button-secondary" id="redraw-button" type="button" hidden>
              Shuffle again
            </button>
            <button class="button button-dark" id="copy-button" type="button" disabled>
              <span>Copy all IDs</span>
              <span aria-hidden="true">⧉</span>
            </button>
          </div>
        </div>

        <div class="empty-state" id="empty-state">
          <span class="empty-number">00</span>
          <div>
            <h3>Your campaign will appear here.</h3>
            <p>Upload your own top performer CSV, then choose how many ads to select.</p>
          </div>
        </div>
        <div class="result-summary" id="result-summary" hidden></div>
        <div class="campaign-list" id="campaign-list"></div>
      </section>

      <section class="copycat-section" aria-labelledby="copycat-title">
        <div>
          <span class="step-label">Next step / Ad sets</span>
          <h2 id="copycat-title">Ready to place the ads?</h2>
          <p>Open COPYCAT to copy your selected ads into ad sets.</p>
        </div>
        <a
          class="button button-copycat"
          href="https://apps.powerapps.com/play/e/0b12121c-a91c-ebe6-b5f6-f431341a9312/a/a1c74af2-50e4-4cc1-b9a8-ddb679875039?tenantId=61e6eeb3-5fd7-4aaa-ae3c-61e8deb09b79&sourcetime=1732663610681"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>COPYCAT</span>
          <span aria-hidden="true">↗</span>
        </a>
      </section>
      </div>
      <section
        class="new-ads-page"
        id="new-ads-panel"
        role="tabpanel"
        data-tab-panel="new-ads"
        hidden
      ></section>
    </main>

    <footer>
      <span>Toppy · Version 2.2.1 · By Caleb Day</span>
      <span id="data-note">No data is stored</span>
      <span>Not affiliated with the FSC</span>
    </footer>
  </div>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;

const elements = {
  campaignNameForm: document.querySelector("#campaign-name-form"),
  campaignDescription: document.querySelector("#campaign-description"),
  campaignStartDate: document.querySelector("#campaign-start-date"),
  campaignObjective: document.querySelector("#campaign-objective"),
  campaignRegional: document.querySelector("#campaign-regional"),
  campaignNameOutput: document.querySelector("#campaign-name-output"),
  copyName: document.querySelector("#copy-name-button"),
  form: document.querySelector("#generator-form"),
  csvUpload: document.querySelector("#csv-upload"),
  input: document.querySelector("#ad-count"),
  decrease: document.querySelector("#decrease-count"),
  increase: document.querySelector("#increase-count"),
  generate: document.querySelector(".generate-button"),
  inventoryCount: document.querySelector("#inventory-count"),
  formMessage: document.querySelector("#form-message"),
  emptyState: document.querySelector("#empty-state"),
  summary: document.querySelector("#result-summary"),
  list: document.querySelector("#campaign-list"),
  copy: document.querySelector("#copy-button"),
  redraw: document.querySelector("#redraw-button"),
  install: document.querySelector("#install-button"),
  toast: document.querySelector("#toast"),
  connectionStatus: document.querySelector("#connection-status"),
  dataNote: document.querySelector("#data-note"),
  tabButtons: document.querySelectorAll("[data-tab]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]")
};

const newAdsController = createNewAdsController({
  root: document.querySelector("#new-ads-panel"),
  copyText,
  showToast
});

function setActiveTab(tabName) {
  elements.tabButtons.forEach((button) => {
    const active = button.dataset.tab === tabName;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  elements.tabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.tabPanel !== tabName;
  });

  if (tabName === "new-ads") {
    newAdsController.load();
  }
}

function findField(ad, pattern) {
  const fieldName = Object.keys(ad.fields).find((name) => pattern.test(name));
  return fieldName ? ad.fields[fieldName] : "";
}

function formatMetric(name, value) {
  if (value === "") {
    return "—";
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return value;
  }

  if (name.includes("%")) {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1
    }).format(Math.abs(number) <= 1 ? number : number / 100);
  }

  if (/cost/i.test(name)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(number);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  }).format(number);
}

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

function createLink(url, label, className = "text-link") {
  const link = createElement("a", className);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.append(label, " ");
  const arrow = createElement("span", "", "↗");
  arrow.setAttribute("aria-hidden", "true");
  link.append(arrow);
  return link;
}

function renderCampaignCard(ad, index) {
  const article = createElement("article", "campaign-card");
  const top = createElement("div", "campaign-top");
  const position = createElement(
    "span",
    "campaign-position",
    String(index + 1).padStart(2, "0")
  );
  const identity = createElement("div", "campaign-identity");
  identity.append(
    createElement("span", "field-label", "Ad ID"),
    createElement("h3", "", ad.id)
  );

  const adjustValue = findField(ad, /adjust ad/i);
  if (adjustValue && adjustValue !== "-") {
    identity.append(createElement("span", "status-pill", adjustValue));
  }
  top.append(position, identity);

  const actions = createElement("div", "campaign-actions");
  const managerUrl = findField(ad, /ads manager link/i);
  const previewUrl = findField(ad, /campaign preview link/i);
  if (managerUrl) {
    actions.append(createLink(managerUrl, "Open ad"));
  }
  if (previewUrl) {
    actions.append(createLink(previewUrl, "Preview"));
  }
  top.append(actions);
  article.append(top);

  const mission = findField(ad, /campaign mission/i);
  if (mission) {
    const missionRow = createElement("div", "mission-row");
    missionRow.append(
      createElement("span", "field-label", "Campaign mission"),
      createElement("strong", "", mission)
    );
    article.append(missionRow);
  }

  const extraFields = Object.entries(ad.fields).filter(
    ([name, value]) =>
      value &&
      !/campaign mission|ads manager link|campaign preview link|adjust ad/i.test(
        name
      )
  );
  if (extraFields.length > 0) {
    const fieldGrid = createElement("div", "field-grid");
    for (const [name, value] of extraFields) {
      const item = createElement("div", "metric");
      item.append(
        createElement("span", "metric-label", name),
        createElement("strong", "metric-value", value)
      );
      fieldGrid.append(item);
    }
    article.append(fieldGrid);
  }

  const details = createElement("details", "metrics-details");
  const summary = createElement("summary");
  summary.append(
    createElement("span", "", `View ${state.metricNames.length} performance metrics`),
    createElement("span", "details-icon", "+")
  );
  details.append(summary);

  const metricGrid = createElement("div", "metric-grid");
  for (const metricName of state.metricNames) {
    const metric = createElement("div", "metric");
    metric.append(
      createElement("span", "metric-label", metricName),
      createElement(
        "strong",
        "metric-value",
        formatMetric(metricName, ad.metrics[metricName] ?? "")
      )
    );
    metricGrid.append(metric);
  }
  details.append(metricGrid);
  details.addEventListener("toggle", () => {
    details.querySelector(".details-icon").textContent = details.open ? "−" : "+";
  });
  article.append(details);

  return article;
}

function renderResults() {
  elements.list.replaceChildren();

  if (state.selectedAds.length === 0) {
    elements.emptyState.hidden = false;
    elements.summary.hidden = true;
    elements.copy.disabled = true;
    elements.redraw.hidden = true;
    return;
  }

  elements.emptyState.hidden = true;
  elements.summary.hidden = false;
  elements.copy.disabled = false;
  elements.redraw.hidden = false;
  elements.summary.textContent = `${state.selectedAds.length} unique ads selected · No duplicates`;

  const fragment = document.createDocumentFragment();
  state.selectedAds.forEach((ad, index) => {
    fragment.append(renderCampaignCard(ad, index));
  });
  elements.list.append(fragment);
}

function setCount(value) {
  const max = state.ads.length || 1;
  const count = Math.max(1, Math.min(Math.trunc(Number(value) || 1), max));
  elements.input.value = count;

  document.querySelectorAll("[data-count]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.count) === count);
  });
}

function generateCampaign({ scroll = true } = {}) {
  const requestedCount = Number(elements.input.value);
  if (state.ads.length === 0) {
    elements.formMessage.textContent =
      "Upload your own CSV data file before generating a campaign.";
    elements.csvUpload.focus();
    return;
  }

  if (!Number.isInteger(requestedCount) || requestedCount < 1) {
    elements.formMessage.textContent = "Enter a whole number of at least 1.";
    elements.input.focus();
    return;
  }

  if (requestedCount > state.ads.length) {
    elements.formMessage.textContent = `Choose ${state.ads.length} ads or fewer.`;
    elements.input.focus();
    return;
  }

  elements.formMessage.textContent = "";
  state.selectedAds = selectRandomAds(state.ads, requestedCount);
  renderResults();

  if (scroll) {
    document.querySelector("#results-section").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

async function copyText(text) {
  if (!text) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  return true;
}

function updateCampaignName() {
  elements.campaignNameOutput.textContent = buildCampaignName({
    description: elements.campaignDescription.value,
    startDate: elements.campaignStartDate.value,
    objective: elements.campaignObjective.value,
    regional: elements.campaignRegional.value
  });
}

async function copyCampaignName() {
  const copied = await copyText(elements.campaignNameOutput.textContent);
  if (copied) {
    showToast("Campaign name copied");
  }
}

async function copyIds() {
  const text = state.selectedAds.map((ad) => ad.id).join(" ");
  const copied = await copyText(text);
  if (!copied) {
    return;
  }

  showToast(`${state.selectedAds.length} ad IDs copied`);
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2600);
}

function updateConnectionStatus() {
  const online = navigator.onLine;
  elements.connectionStatus.classList.toggle("offline", !online);
  elements.connectionStatus.querySelector(".status-text").textContent = online
    ? "Online"
    : "Offline";
}

function resetUploadedData(message = "Upload your own CSV to begin.") {
  state.ads = [];
  state.selectedAds = [];
  state.metadataColumns = [];
  state.metricNames = [];
  renderResults();
  elements.input.max = "1";
  elements.generate.disabled = true;
  elements.formMessage.textContent = message;
  elements.inventoryCount.textContent = "No CSV loaded";
  elements.dataNote.textContent = "No data is stored";
}

async function handleCsvUpload() {
  const file = elements.csvUpload.files?.[0];
  if (!file) {
    resetUploadedData();
    return;
  }

  resetUploadedData("Reading CSV...");
  elements.inventoryCount.textContent = "Reading CSV";

  try {
    const parsed = parseCsv(await file.text());
    const inventory = consolidateAds(parsed);

    if (inventory.ads.length === 0) {
      throw new Error("No usable ad IDs were found in the CSV.");
    }

    state.ads = inventory.ads;
    state.metadataColumns = inventory.metadataColumns;
    state.metricNames = inventory.metricNames;
    state.selectedAds = [];
    renderResults();
    elements.input.max = String(state.ads.length);
    elements.generate.disabled = false;
    elements.formMessage.textContent = "";
    elements.inventoryCount.textContent = `${state.ads.length} ads loaded`;
    elements.dataNote.textContent = `User-provided CSV: ${file.name} · ${state.ads.length} ads · ${state.metricNames.length} metrics`;
    setCount(Math.min(10, state.ads.length));
    showToast("CSV loaded");
  } catch (error) {
    console.error(error);
    resetUploadedData(
      "Upload a CSV with an ad ID column, such as Ad ID, Level 1, or ID."
    );
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateCampaign();
});
elements.campaignNameForm.addEventListener("input", updateCampaignName);
elements.campaignNameForm.addEventListener("change", updateCampaignName);
elements.copyName.addEventListener("click", copyCampaignName);
elements.decrease.addEventListener("click", () => setCount(Number(elements.input.value) - 1));
elements.increase.addEventListener("click", () => setCount(Number(elements.input.value) + 1));
elements.input.addEventListener("input", () => setCount(elements.input.value));
elements.copy.addEventListener("click", copyIds);
elements.redraw.addEventListener("click", () => generateCampaign({ scroll: false }));
elements.csvUpload.addEventListener("change", handleCsvUpload);
document.querySelectorAll("[data-count]").forEach((button) => {
  button.addEventListener("click", () => setCount(button.dataset.count));
});
elements.tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.installPrompt = event;
  elements.install.hidden = false;
});
elements.install.addEventListener("click", async () => {
  if (!state.installPrompt) {
    return;
  }
  await state.installPrompt.prompt();
  state.installPrompt = null;
  elements.install.hidden = true;
});
window.addEventListener("appinstalled", () => {
  elements.install.hidden = true;
  showToast("App installed");
});
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

registerSW({
  onOfflineReady() {
    showToast("App ready to work offline");
  }
});

updateConnectionStatus();
elements.campaignStartDate.value = getLocalDateInputValue();
updateCampaignName();
resetUploadedData();
