export const GEMINI_MODEL = "gemini-3.5-flash";

export const AD_TOPICS = [
  "Jesus Christ",
  "Church Attendance",
  "Book of Mormon",
  "Baptism",
  "Plan of Salvation",
  "Repentance"
];

export const AD_BLESSINGS = [
  "Healing",
  "Love",
  "Peace",
  "Joy / Happiness",
  "Repentance",
  "Faith in Jesus Christ",
  "Best Version of Yourself",
  "Find Community"
];

const AD_TEXT_SCHEMA = {
  type: "object",
  required: ["campaigns"],
  properties: {
    campaigns: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        required: [
          "campaignName",
          "angle",
          "primaryTexts",
          "headlines",
          "descriptions"
        ],
        properties: {
          campaignName: {
            type: "string",
            description: "A short internal name for this campaign concept."
          },
          angle: {
            type: "string",
            description: "A one-sentence summary of the emotional and spiritual angle."
          },
          primaryTexts: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" }
          },
          headlines: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" }
          },
          descriptions: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: { type: "string" }
          }
        }
      }
    }
  }
};

const SYSTEM_INSTRUCTION = `
You are a direct-response marketing expert with 20 years of United States
social media marketing experience. You understand current Facebook and
Instagram lead-generation best practices and clear response-focused
copywriting principles.

You are helping a marketing expert in the Missionary Department of The Church
of Jesus Christ of Latter-day Saints create English Meta ads for a broad United
States audience. The goal is to invite people to meet missionaries, attend
church, and progress toward baptism.

Write respectfully for a broad audience. Do not infer or call out sensitive
personal traits. Do not use fear, shame, guaranteed outcomes, deceptive claims,
or manipulative pressure. Never refer to Jesus as only "Jesus" in Primary
Texts. Use "Jesus Christ" or an appropriate title.
`.trim();

function clean(value) {
  return String(value ?? "").trim();
}

export function buildAdTextPrompt({
  topic,
  blessing,
  notes = "",
  sourceUrl = ""
}) {
  const sourceInstructions = sourceUrl
    ? `
SOURCE URL
Use URL context to read this public page: ${sourceUrl}
In at least one Primary Text for each campaign, include one short, accurate,
direct quote from the source in quotation marks. Keep each quote brief and
faithful to the page. Do not invent a quote.`
    : "";

  const notesInstructions = notes
    ? `
ADDITIONAL NOTES
${clean(notes)}`
    : "";

  return `
Create exactly 5 distinct high-intent lead-generation campaign concepts.

SELECTED AD CATEGORIES
- Ad Topic (AT): ${clean(topic)}
- Ad Blessing (AB): ${clean(blessing)}
- Also blend each campaign with either "Best Version of Yourself" or
  "Find Community", since those are the strongest blessings for this area.

OUTPUT FOR EACH CAMPAIGN
- Exactly 3 Primary Text options.
- Exactly 3 Headline options.
- Exactly 3 Description options.
- Treat matching array positions as one complete ad variation:
  Primary Text 1 + Headline 1 + Description 1, and so on.

REQUIRED MESSAGE FRAMEWORK
- Pain: begin with a relatable struggle such as loneliness, brokenness,
  unhappiness, fear, sin, or disconnection. Do not claim the reader personally
  has that condition.
- Promise: clearly teach how the Atonement of Jesus Christ, worship, and
  covenant discipleship can bring healing, hope, purpose, transformation, or
  community.
- Invitation: give one simple next step such as meet with missionaries, sign
  up below, learn more, or attend church this Sunday.

PRIMARY TEXT RULES
- Make the selected blessing and call to action obvious.
- Mention missionaries in every Primary Text.
- Teach one memorable truth about the Atonement of Jesus Christ in every
  Primary Text.
- Include a relevant Bible or Book of Mormon scripture reference in every
  Primary Text. Paraphrase rather than inventing a quotation.
- Use simple, easy-to-read English.
- Format for skimming with short paragraphs or short lines.
- Use emojis naturally and sparingly.
- Keep the topic within Church, "Come to church and _____", or Baptism.
- For Come to Church concepts, explain what a visitor can expect at a service:
  worship centered on Jesus Christ, hymns, prayers, the sacrament, scripture,
  and a welcoming congregation.

HEADLINE AND DESCRIPTION RULES
- Headlines must reiterate their paired Primary Text in a shorter phrase.
- Mention missionaries and/or Jesus Christ where natural.
- Each paired variation has one Headline and one Description.
- Keep both concise and suitable for Meta placements.

Make all 5 concepts materially different while following the same doctrine,
goal, and selected categories.
${sourceInstructions}
${notesInstructions}
`.trim();
}

export function buildGeminiRequest(input) {
  const prompt = buildAdTextPrompt(input);
  const request = {
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 8192,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema: AD_TEXT_SCHEMA
        }
      }
    }
  };

  if (clean(input.sourceUrl)) {
    request.tools = [{ urlContext: {} }];
  }

  return request;
}

function extractResponseText(response) {
  return response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

function normalizeCampaign(campaign, index) {
  const normalizeOptions = (values, label) => {
    if (!Array.isArray(values) || values.length !== 3) {
      throw new Error(`Campaign ${index + 1} must include 3 ${label}.`);
    }
    return values.map((value) => clean(value));
  };

  return {
    campaignName: clean(campaign?.campaignName) || `Campaign ${index + 1}`,
    angle: clean(campaign?.angle),
    primaryTexts: normalizeOptions(campaign?.primaryTexts, "Primary Texts"),
    headlines: normalizeOptions(campaign?.headlines, "Headlines"),
    descriptions: normalizeOptions(campaign?.descriptions, "Descriptions")
  };
}

export function parseGeminiResponse(response) {
  const text = extractResponseText(response);
  if (!text) {
    const reason = response?.candidates?.[0]?.finishReason;
    throw new Error(
      reason
        ? `Gemini did not return ad text (${reason}).`
        : "Gemini did not return ad text."
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unreadable response. Try again.");
  }

  if (!Array.isArray(parsed.campaigns) || parsed.campaigns.length !== 5) {
    throw new Error("Gemini must return exactly 5 campaigns.");
  }

  return parsed.campaigns.map(normalizeCampaign);
}

export async function generateAdText({
  apiKey,
  topic,
  blessing,
  notes = "",
  sourceUrl = "",
  fetchImpl = fetch
}) {
  const key = clean(apiKey);
  if (!key) {
    throw new Error("Enter a Gemini API key.");
  }
  if (!AD_TOPICS.includes(topic)) {
    throw new Error("Select an Ad Topic.");
  }
  if (!AD_BLESSINGS.includes(blessing)) {
    throw new Error("Select an Ad Blessing.");
  }

  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
      body: JSON.stringify(
        buildGeminiRequest({ topic, blessing, notes, sourceUrl })
      )
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      `Gemini request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return parseGeminiResponse(payload);
}
