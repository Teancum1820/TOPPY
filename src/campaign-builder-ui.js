import { buildCampaignName, CAMPAIGN_OBJECTIVES, getLocalDateInputValue } from "./campaign-name.js";
import { generateAdCopy, generateDescriptionIdeas, parseAdIds, selectCampaignAds } from "./campaign-builder.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function renderCopyGroup(title, items) {
  return `<section class="copy-idea-group"><div class="builder-result-heading"><h4>${title}</h4><button type="button" data-copy-group="${escapeHtml(items.join("\n"))}">Copy all</button></div><ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>`;
}

export function createCampaignBuilderController({ root, copyText, showToast }) {
  const objectives = CAMPAIGN_OBJECTIVES.map((item) => `<option>${item}</option>`).join("");
  root.innerHTML = `
    <section class="builder-hero"><span class="eyebrow">Version 3.0 / Campaign workspace</span><h1>Campaign <em>Builder.</em></h1><p>Turn a list of ad IDs into a ready-to-name campaign, then create description and copy ideas in one workspace.</p></section>
    <div class="builder-grid">
      <section class="builder-card builder-name-card"><div class="builder-card-heading"><span class="step-label">01 / Campaign name</span><h2>Name the campaign.</h2></div>
        <form class="campaign-name-form builder-name-form" id="builder-name-form">
          <label class="name-field"><span>Campaign Description <strong>(CD)</strong></span><input name="description" id="builder-description" placeholder="Choose an idea or type here" autocomplete="off"></label>
          <label class="name-field"><span>Start Date <strong>(CSD)</strong></span><input name="startDate" type="date"></label>
          <label class="name-field"><span>Objective <strong>(CO)</strong></span><select name="objective">${objectives}</select></label>
          <label class="name-field"><span>Regional Campaign? <strong>(CR)</strong></span><select name="regional"><option>True</option><option>False</option></select></label>
          <label class="name-field"><span>Tracking ID <strong>(TID)</strong></span><input name="trackingId" placeholder="Optional" autocomplete="off"></label>
        </form>
        <div class="campaign-name-result"><div class="campaign-name-copy"><span class="field-label">Generated campaign name</span><output class="builder-name-output" id="builder-name-output"></output></div><button class="button button-blue" id="builder-copy-name" type="button">Copy name</button></div>
      </section>
      <section class="builder-card"><div class="builder-card-heading"><span class="step-label">02 / Ad combination</span><h2>Build the ad set.</h2><p>Paste ad IDs separated by spaces, commas, or new lines.</p></div>
        <label class="name-field"><span>Ad IDs</span><textarea id="builder-ad-ids" placeholder="123456789&#10;987654321&#10;..." spellcheck="false"></textarea></label>
        <div class="builder-action-row"><label class="name-field compact-field"><span>Ads to select</span><select id="builder-ad-count"><option>3</option><option>4</option><option>5</option></select></label><button class="button button-primary" id="builder-generate-ads" type="button">Generate combo</button></div>
        <p class="form-message" id="builder-ad-message" role="alert"></p><div class="builder-output" id="builder-ad-output" hidden><div class="builder-result-heading"><span class="field-label">Selected ad IDs</span><button type="button" id="builder-copy-ads">Copy all</button></div><ol id="builder-ad-list"></ol></div>
      </section>
      <section class="builder-card"><div class="builder-card-heading"><span class="step-label">03 / Description ideas</span><h2>Find the CD.</h2><p>Enter a keyword to create campaign-description titles. Select one to send it to the name generator.</p></div>
        <div class="builder-inline-form"><label class="name-field"><span>Keyword</span><input id="builder-keyword" placeholder="TOP, REMIX, MIX..." autocomplete="off"></label><button class="button button-secondary" id="builder-generate-descriptions" type="button">Generate ideas</button></div><div class="builder-ideas" id="builder-description-ideas" aria-live="polite"></div>
      </section>
      <section class="builder-card"><div class="builder-card-heading"><span class="step-label">04 / Ad copy studio</span><h2>Create campaign copy.</h2><p>Generate starter headlines, primary text, and descriptions from a topic. The library is ready for your proven examples later.</p></div>
        <div class="builder-inline-form"><label class="name-field"><span>Topic</span><input id="builder-topic" placeholder="Hope, family, purpose..." autocomplete="off"></label><button class="button button-secondary" id="builder-generate-copy" type="button">Create copy</button></div><div class="copy-idea-results" id="builder-copy-results" aria-live="polite"></div>
      </section>
    </div>`;

  const form = root.querySelector("#builder-name-form");
  const output = root.querySelector("#builder-name-output");
  const description = root.querySelector("#builder-description");
  const adOutput = root.querySelector("#builder-ad-output");
  const adMessage = root.querySelector("#builder-ad-message");
  let selectedAds = [];
  const updateName = () => { output.textContent = buildCampaignName(Object.fromEntries(new FormData(form))); };
  form.elements.startDate.value = getLocalDateInputValue();
  form.addEventListener("input", updateName); form.addEventListener("change", updateName);
  root.querySelector("#builder-copy-name").addEventListener("click", async () => { if (await copyText(output.textContent)) showToast("Campaign name copied"); });
  root.querySelector("#builder-generate-ads").addEventListener("click", () => {
    const ids = parseAdIds(root.querySelector("#builder-ad-ids").value);
    try { selectedAds = selectCampaignAds(ids, root.querySelector("#builder-ad-count").value); root.querySelector("#builder-ad-list").innerHTML = selectedAds.map((id) => `<li><code>${escapeHtml(id)}</code></li>`).join(""); adOutput.hidden = false; adMessage.textContent = `${selectedAds.length} of ${ids.length} unique IDs selected.`; }
    catch (error) { adOutput.hidden = true; adMessage.textContent = error.message; }
  });
  root.querySelector("#builder-copy-ads").addEventListener("click", async () => { if (await copyText(selectedAds.join(" "))) showToast(`${selectedAds.length} ad IDs copied`); });
  root.querySelector("#builder-generate-descriptions").addEventListener("click", () => {
    const ideas = generateDescriptionIdeas(root.querySelector("#builder-keyword").value);
    root.querySelector("#builder-description-ideas").innerHTML = ideas.length ? ideas.map((idea) => `<button class="builder-idea" type="button" data-description-idea="${escapeHtml(idea)}">${escapeHtml(idea)}</button>`).join("") : "<p>Enter a keyword to generate ideas.</p>";
  });
  root.querySelector("#builder-description-ideas").addEventListener("click", (event) => { const button = event.target.closest("[data-description-idea]"); if (!button) return; description.value = button.dataset.descriptionIdea; updateName(); form.scrollIntoView({ behavior: "smooth", block: "center" }); showToast("Description added to campaign name"); });
  root.querySelector("#builder-generate-copy").addEventListener("click", () => { const copy = generateAdCopy(root.querySelector("#builder-topic").value); root.querySelector("#builder-copy-results").innerHTML = copy.headlines.length ? renderCopyGroup("Headlines", copy.headlines) + renderCopyGroup("Primary texts", copy.primaryTexts) + renderCopyGroup("Descriptions", copy.descriptions) : "<p>Enter a topic to create copy ideas.</p>"; });
  root.querySelector("#builder-copy-results").addEventListener("click", async (event) => { const button = event.target.closest("[data-copy-group]"); if (button && await copyText(button.dataset.copyGroup)) showToast("Copy ideas copied"); });
  updateName();
  return { load: updateName };
}
