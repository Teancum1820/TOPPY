import test from "node:test";
import assert from "node:assert/strict";
import { generateAdCopy, generateDescriptionIdeas, parseAdIds, selectCampaignAds } from "../src/campaign-builder.js";

test("parseAdIds accepts common separators and removes duplicates", () => {
  assert.deepEqual(parseAdIds("A1, A2\nA1; A3 A4"), ["A1", "A2", "A3", "A4"]);
});

test("selectCampaignAds returns the requested unique campaign size", () => {
  assert.deepEqual(selectCampaignAds(["1", "2", "3", "4"], 3, () => 0), ["2", "3", "4"]);
  assert.throws(() => selectCampaignAds(["1", "2"], 3), /at least 3/);
  assert.throws(() => selectCampaignAds(["1", "2", "3"], 6), /3, 4, or 5/);
});

test("description and copy ideas consistently use user input", () => {
  const descriptions = generateDescriptionIdeas(" top ");
  assert.equal(descriptions.length, 12);
  assert.ok(descriptions.every((idea) => idea.includes("TOP")));
  const copy = generateAdCopy("Hope");
  assert.equal(copy.headlines.length, 5);
  assert.ok(copy.primaryTexts.every((idea) => idea.includes("Hope")));
});
