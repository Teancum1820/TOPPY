import {
  AD_BLESSINGS,
  AD_TOPICS,
  GEMINI_MODEL,
  generateAdText
} from "./ad-text.js";

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

function createOptions(values) {
  return values
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function formatVariation(primaryText, headline, description) {
  return [
    "PRIMARY TEXT",
    primaryText,
    "",
    "HEADLINE",
    headline,
    "",
    "DESCRIPTION",
    description
  ].join("\n");
}

export function createAdTextController({
  root,
  copyText,
  showToast,
  generate = generateAdText
}) {
  root.innerHTML = `
    <section class="ad-text-hero">
      <div>
        <span class="eyebrow">Version 1.3.1 / Gemini-powered copy</span>
        <h1>Turn doctrine into<br><em>clear invitations.</em></h1>
        <p>
          Select an Ad Topic and Ad Blessing, add campaign context, and generate
          five editable Meta lead-generation campaign concepts.
        </p>
      </div>
      <div class="ai-provider-card">
        <span class="step-label">Free GenAI provider</span>
        <strong>Google ${GEMINI_MODEL}</strong>
        <p>Structured output with optional public webpage context.</p>
      </div>
    </section>

    <section class="ad-text-builder" aria-labelledby="ad-text-builder-title">
      <div class="ad-text-builder-heading">
        <div>
          <span class="step-label">01 / Campaign direction</span>
          <h2 id="ad-text-builder-title">What should the ads teach?</h2>
        </div>
        <span class="ai-badge">5 campaigns · 15 variations</span>
      </div>

      <form class="ad-text-form" id="ad-text-form">
        <label class="name-field">
          <span>Ad Topic <strong>(AT)</strong></span>
          <select name="topic" required>
            <option value="">Select a topic</option>
            ${createOptions(AD_TOPICS)}
          </select>
        </label>
        <label class="name-field">
          <span>Ad Blessing <strong>(AB)</strong></span>
          <select name="blessing" required>
            <option value="">Select a blessing</option>
            ${createOptions(AD_BLESSINGS)}
          </select>
        </label>
        <label class="name-field ad-text-source-field">
          <span>Public source URL <strong>(Optional)</strong></span>
          <input
            name="sourceUrl"
            type="url"
            placeholder="https://..."
            autocomplete="url"
          />
          <small>Gemini will use short direct quotes from this page.</small>
        </label>
        <label class="name-field ad-text-notes-field">
          <span>Additional notes</span>
          <textarea
            name="notes"
            rows="5"
            placeholder="Audience context, local needs, campaign details, scripture ideas, tone, or other instructions..."
          ></textarea>
        </label>

        <div class="api-key-panel">
          <div>
            <span class="field-label">Google AI Studio key</span>
            <h3>Connect the free Gemini model.</h3>
            <p>
              Your key stays in this browser tab and is sent only to Google.
              It is not saved in Toppy or included in the app build.
            </p>
            <p class="api-data-note">
              Use a separate Gemini-restricted key. A static browser app cannot
              protect it like a backend proxy. Google states free-tier prompts
              may be used to improve its products, so do not include
              confidential or personal information.
            </p>
          </div>
          <div class="api-key-actions">
            <label class="name-field">
              <span>Gemini API key</span>
              <input
                name="apiKey"
                type="password"
                placeholder="Paste API key"
                autocomplete="off"
                spellcheck="false"
                required
              />
            </label>
            <a
              class="button button-secondary"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get a free key ↗
            </a>
          </div>
        </div>

        <button class="button button-primary ad-text-generate" type="submit">
          <span>Generate Ad Text</span>
          <span aria-hidden="true">↗</span>
        </button>
      </form>
      <p class="form-message ad-text-message" id="ad-text-message" role="alert"></p>
    </section>

    <section class="ad-text-results" id="ad-text-results" aria-labelledby="ad-text-results-title">
      <div class="results-toolbar">
        <div>
          <span class="step-label">02 / Generated campaigns</span>
          <h2 id="ad-text-results-title">Ad Text results</h2>
        </div>
        <div class="result-actions">
          <button class="button button-dark" id="copy-all-ad-text" type="button" disabled>
            Copy all Ad Text
          </button>
        </div>
      </div>
      <div class="empty-state" id="ad-text-empty-state">
        <span class="empty-number">00</span>
        <div>
          <h3>Your campaign concepts will appear here.</h3>
          <p>Connect Gemini and choose the topic and blessing above.</p>
        </div>
      </div>
      <div class="ad-text-campaign-list" id="ad-text-campaign-list"></div>
    </section>
  `;

  const state = {
    campaigns: []
  };

  const elements = {
    form: root.querySelector("#ad-text-form"),
    message: root.querySelector("#ad-text-message"),
    generate: root.querySelector(".ad-text-generate"),
    empty: root.querySelector("#ad-text-empty-state"),
    list: root.querySelector("#ad-text-campaign-list"),
    copyAll: root.querySelector("#copy-all-ad-text")
  };

  function getVariationValues(variation) {
    return {
      primaryText: variation.querySelector("[name='primaryText']").value,
      headline: variation.querySelector("[name='headline']").value,
      description: variation.querySelector("[name='description']").value
    };
  }

  function formatCampaignCard(card) {
    const campaignName = card.querySelector("[name='campaignName']").value;
    const angle = card.querySelector("[name='angle']").value;
    const variations = [...card.querySelectorAll(".ad-copy-variation")];
    return [
      campaignName.toUpperCase(),
      angle,
      "",
      ...variations.flatMap((variation, index) => {
        const values = getVariationValues(variation);
        return [
          `VARIATION ${index + 1}`,
          formatVariation(
            values.primaryText,
            values.headline,
            values.description
          ),
          ""
        ];
      })
    ].join("\n");
  }

  function createTextField(label, name, value, rows = 0) {
    const wrapper = createElement("label", "ad-copy-field");
    wrapper.append(createElement("span", "", label));
    const input = rows
      ? Object.assign(document.createElement("textarea"), { rows })
      : document.createElement("input");
    input.name = name;
    input.value = value;
    input.autocomplete = "off";
    wrapper.append(input);
    return wrapper;
  }

  function createVariation(campaign, index) {
    const variation = createElement("section", "ad-copy-variation");
    const heading = createElement("div", "ad-copy-variation-heading");
    heading.append(
      createElement("span", "variation-number", `Variation ${index + 1}`)
    );
    const copyButton = createElement(
      "button",
      "icon-copy-button",
      "Copy variation"
    );
    copyButton.type = "button";
    heading.append(copyButton);

    variation.append(
      heading,
      createTextField(
        "Primary Text",
        "primaryText",
        campaign.primaryTexts[index],
        10
      ),
      createTextField("Headline", "headline", campaign.headlines[index]),
      createTextField(
        "Description",
        "description",
        campaign.descriptions[index],
        3
      )
    );

    copyButton.addEventListener("click", async () => {
      const values = getVariationValues(variation);
      await copyText(
        formatVariation(
          values.primaryText,
          values.headline,
          values.description
        )
      );
      showToast(`Variation ${index + 1} copied`);
    });

    return variation;
  }

  function createCampaignCard(campaign, index) {
    const article = createElement("article", "ad-text-campaign-card");
    const heading = createElement("div", "ad-text-campaign-heading");
    const identity = createElement("div");
    identity.append(
      createElement(
        "span",
        "campaign-position",
        String(index + 1).padStart(2, "0")
      )
    );

    const campaignFields = createElement("div", "ad-text-campaign-fields");
    campaignFields.append(
      createTextField(
        "Campaign concept",
        "campaignName",
        campaign.campaignName
      ),
      createTextField("Strategic angle", "angle", campaign.angle, 2)
    );
    identity.append(campaignFields);

    const copyCampaign = createElement(
      "button",
      "button button-secondary",
      "Copy campaign"
    );
    copyCampaign.type = "button";
    heading.append(identity, copyCampaign);
    article.append(heading);

    const variations = createElement("div", "ad-copy-variations");
    for (let variationIndex = 0; variationIndex < 3; variationIndex += 1) {
      variations.append(createVariation(campaign, variationIndex));
    }
    article.append(variations);

    copyCampaign.addEventListener("click", async () => {
      await copyText(formatCampaignCard(article));
      showToast(`${campaign.campaignName} copied`);
    });

    return article;
  }

  function renderCampaigns() {
    elements.list.replaceChildren();
    const hasCampaigns = state.campaigns.length > 0;
    elements.empty.hidden = hasCampaigns;
    elements.copyAll.disabled = !hasCampaigns;

    if (!hasCampaigns) {
      return;
    }

    const fragment = document.createDocumentFragment();
    state.campaigns.forEach((campaign, index) => {
      fragment.append(createCampaignCard(campaign, index));
    });
    elements.list.append(fragment);
  }

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(elements.form).entries());
    elements.message.textContent = "";
    elements.generate.disabled = true;
    elements.generate.querySelector("span").textContent =
      "Generating 5 campaigns...";

    try {
      state.campaigns = await generate(values);
      renderCampaigns();
      showToast("5 Ad Text campaigns generated");
      root.querySelector("#ad-text-results").scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    } catch (error) {
      console.error(error);
      elements.message.textContent =
        error instanceof Error
          ? error.message
          : "Ad Text generation failed. Try again.";
    } finally {
      elements.generate.disabled = false;
      elements.generate.querySelector("span").textContent = "Generate Ad Text";
    }
  });

  elements.copyAll.addEventListener("click", async () => {
    const cards = [...elements.list.querySelectorAll(".ad-text-campaign-card")];
    await copyText(cards.map(formatCampaignCard).join("\n\n"));
    showToast("All Ad Text copied");
  });

  return {
    setCampaigns(campaigns) {
      state.campaigns = campaigns;
      renderCampaigns();
    }
  };
}
