import {
  lookupAddress,
  lookupPoint,
  lookupZip,
  parseLatLong,
  resultsToCsv,
  resultsToTxt,
  splitAudienceInput
} from "./audience-creator.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderResultRow(result) {
  return `
    <tr>
      <td>${escapeHtml(result.input)}</td>
      <td>${escapeHtml(result.address || "-")}</td>
      <td>${escapeHtml(result.latitude || "-")}</td>
      <td>${escapeHtml(result.longitude || "-")}</td>
      <td>${escapeHtml(result.zip || "-")}</td>
      <td><span class="audience-status">${escapeHtml(result.status)}</span></td>
    </tr>
  `;
}

export function createAudienceCreatorController({ root, copyText, showToast }) {
  let results = [];
  let loaded = false;

  function render() {
    if (loaded) {
      return;
    }

    root.innerHTML = `
      <section class="audience-hero">
        <span class="eyebrow">Version 4.1 / Audience workspace</span>
        <h1>Audience <em>Creator.</em></h1>
        <p>Convert pasted audience location lists between street addresses, latitude and longitude points, and zip codes.</p>
      </section>

      <section class="audience-tool">
        <div class="audience-tool-main">
          <div class="builder-card-heading">
            <span class="step-label">01 / Paste locations</span>
            <h2>Build the location list.</h2>
            <p>Paste one address or lat/long point per line, choose the conversion, then run the lookup.</p>
          </div>

          <label class="name-field">
            <span>Conversion type</span>
            <select id="audience-mode">
              <option value="addresses-to-points">Street addresses to lat/long points</option>
              <option value="points-to-addresses">Lat/long points to street addresses</option>
              <option value="locations-to-zips">Addresses or lat/long points to zip codes</option>
            </select>
          </label>

          <label class="name-field">
            <span>Paste locations</span>
            <textarea id="audience-input" spellcheck="false" placeholder="1600 Pennsylvania Ave NW, Washington, DC&#10;40.689247, -74.044502&#10;350 5th Ave, New York, NY"></textarea>
          </label>

          <div class="audience-actions">
            <button class="button button-primary" id="audience-run" type="button">Run lookup</button>
            <button class="button button-secondary" id="audience-clear" type="button">Clear</button>
            <button class="button button-blue" id="audience-copy" type="button" disabled>Copy results</button>
            <button class="button button-secondary" id="audience-export-csv" type="button" disabled>Export CSV</button>
            <button class="button button-secondary" id="audience-export-txt" type="button" disabled>Export TXT</button>
          </div>
          <p class="form-message" id="audience-message" role="status" aria-live="polite"></p>
        </div>

        <aside class="audience-guide" aria-labelledby="audience-guide-title">
          <span class="step-label">Guide</span>
          <h2 id="audience-guide-title">How to use it.</h2>
          <ol>
            <li>Paste one location per line.</li>
            <li>Use normal street addresses, or lat/long points like 40.689247, -74.044502.</li>
            <li>Choose the conversion type.</li>
            <li>Run the lookup, then copy the results or export them as CSV or TXT.</li>
          </ol>
          <p>Large batches run slowly so the public lookup service is not overloaded. Exact results depend on the address detail you paste.</p>
        </aside>
      </section>

      <section class="audience-results" aria-labelledby="audience-results-title">
        <div class="results-toolbar">
          <div>
            <span class="step-label">02 / Output</span>
            <h2 id="audience-results-title">Location results</h2>
          </div>
          <div class="inventory-count" id="audience-count">No results yet</div>
        </div>
        <div class="audience-empty" id="audience-empty">
          <span class="empty-number">00</span>
          <div>
            <h3>Results will appear here.</h3>
            <p>Run a lookup to see addresses, lat/long points, and zip codes.</p>
          </div>
        </div>
        <div class="audience-table-wrap" id="audience-table-wrap" hidden>
          <table class="audience-table">
            <thead>
              <tr>
                <th>Input</th>
                <th>Address</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Zip Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="audience-table-body"></tbody>
          </table>
        </div>
      </section>
    `;

    const mode = root.querySelector("#audience-mode");
    const input = root.querySelector("#audience-input");
    const run = root.querySelector("#audience-run");
    const clear = root.querySelector("#audience-clear");
    const copy = root.querySelector("#audience-copy");
    const exportCsv = root.querySelector("#audience-export-csv");
    const exportTxt = root.querySelector("#audience-export-txt");
    const message = root.querySelector("#audience-message");
    const tableWrap = root.querySelector("#audience-table-wrap");
    const tableBody = root.querySelector("#audience-table-body");
    const empty = root.querySelector("#audience-empty");
    const count = root.querySelector("#audience-count");

    function updateResults() {
      tableBody.innerHTML = results.map(renderResultRow).join("");
      tableWrap.hidden = results.length === 0;
      empty.hidden = results.length > 0;
      [copy, exportCsv, exportTxt].forEach((button) => {
        button.disabled = results.length === 0;
      });
      count.textContent =
        results.length === 0 ? "No results yet" : `${results.length} results`;
    }

    async function lookupLine(line) {
      if (mode.value === "addresses-to-points") {
        return lookupAddress(line);
      }
      if (mode.value === "points-to-addresses") {
        if (!parseLatLong(line)) {
          return {
            input: line,
            address: "",
            latitude: "",
            longitude: "",
            zip: "",
            status: "Invalid lat/long"
          };
        }
        return lookupPoint(line);
      }
      return lookupZip(line);
    }

    run.addEventListener("click", async () => {
      const lines = splitAudienceInput(input.value);
      if (lines.length === 0) {
        message.textContent = "Paste at least one address or lat/long point.";
        input.focus();
        return;
      }

      results = [];
      updateResults();
      run.disabled = true;
      [copy, exportCsv, exportTxt].forEach((button) => {
        button.disabled = true;
      });

      for (const [index, line] of lines.entries()) {
        message.textContent = `Looking up ${index + 1} of ${lines.length}...`;
        try {
          results.push(await lookupLine(line));
        } catch (error) {
          results.push({
            input: line,
            address: "",
            latitude: "",
            longitude: "",
            zip: "",
            status: error.message || "Lookup failed"
          });
        }
        updateResults();
        if (index < lines.length - 1) {
          await wait(1100);
        }
      }

      run.disabled = false;
      message.textContent = `Lookup complete: ${results.length} locations processed.`;
      showToast("Audience lookup complete");
    });

    clear.addEventListener("click", () => {
      input.value = "";
      results = [];
      message.textContent = "";
      updateResults();
      input.focus();
    });

    copy.addEventListener("click", async () => {
      if (await copyText(resultsToCsv(results))) {
        showToast("Audience results copied");
      }
    });

    exportCsv.addEventListener("click", () => {
      downloadTextFile(
        "audience-location-results.csv",
        resultsToCsv(results),
        "text/csv;charset=utf-8"
      );
      showToast("Audience CSV exported");
    });

    exportTxt.addEventListener("click", () => {
      downloadTextFile(
        "audience-location-results.txt",
        resultsToTxt(results),
        "text/plain;charset=utf-8"
      );
      showToast("Audience TXT exported");
    });

    updateResults();
    loaded = true;
  }

  return { load: render };
}
