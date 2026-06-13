import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdTextPrompt,
  buildGeminiRequest,
  generateAdText,
  parseGeminiResponse
} from "../src/ad-text.js";

function makeCampaign(index) {
  return {
    campaignName: `Campaign ${index}`,
    angle: `Angle ${index}`,
    primaryTexts: ["Primary 1", "Primary 2", "Primary 3"],
    headlines: ["Headline 1", "Headline 2", "Headline 3"],
    descriptions: ["Description 1", "Description 2", "Description 3"]
  };
}

function makeGeminiResponse() {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                campaigns: Array.from({ length: 5 }, (_, index) =>
                  makeCampaign(index + 1)
                )
              })
            }
          ]
        }
      }
    ]
  };
}

test("buildAdTextPrompt includes selected categories and core requirements", () => {
  const prompt = buildAdTextPrompt({
    topic: "Church Attendance",
    blessing: "Find Community",
    notes: "Target young adults.",
    sourceUrl: "https://example.com/article"
  });

  assert.match(prompt, /Ad Topic \(AT\): Church Attendance/);
  assert.match(prompt, /Ad Blessing \(AB\): Find Community/);
  assert.match(prompt, /exactly 5/i);
  assert.match(prompt, /Atonement of Jesus Christ/);
  assert.match(prompt, /scripture reference/i);
  assert.match(prompt, /direct quote/i);
  assert.match(prompt, /Target young adults/);
});

test("buildGeminiRequest enables structured JSON and URL context", () => {
  const request = buildGeminiRequest({
    topic: "Baptism",
    blessing: "Peace",
    sourceUrl: "https://example.com"
  });

  assert.equal(
    request.generationConfig.responseFormat.text.mimeType,
    "application/json"
  );
  assert.deepEqual(request.tools, [{ urlContext: {} }]);
  assert.equal(
    request.generationConfig.responseFormat.text.schema.properties.campaigns
      .minItems,
    5
  );
});

test("parseGeminiResponse validates and returns five campaigns", () => {
  const campaigns = parseGeminiResponse(makeGeminiResponse());
  assert.equal(campaigns.length, 5);
  assert.equal(campaigns[0].primaryTexts.length, 3);
  assert.equal(campaigns[4].campaignName, "Campaign 5");
});

test("generateAdText sends the API key only in the request header", async () => {
  let requestUrl;
  let requestOptions;
  const campaigns = await generateAdText({
    apiKey: "test-key",
    topic: "Jesus Christ",
    blessing: "Healing",
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => makeGeminiResponse()
      };
    }
  });

  assert.equal(campaigns.length, 5);
  assert.doesNotMatch(requestUrl, /test-key/);
  assert.equal(requestOptions.headers["x-goog-api-key"], "test-key");
});

test("generateAdText surfaces Gemini API errors", async () => {
  await assert.rejects(
    generateAdText({
      apiKey: "bad-key",
      topic: "Jesus Christ",
      blessing: "Healing",
      fetchImpl: async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "API key not valid." }
        })
      })
    }),
    /API key not valid/
  );
});
