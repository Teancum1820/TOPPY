import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdName,
  buildAdsetName,
  buildCampaignName,
  formatCampaignDate,
  getLocalDateInputValue
} from "../src/campaign-name.js";

test("formatCampaignDate converts an input date without timezone shifts", () => {
  assert.equal(formatCampaignDate("2026-06-12"), "06/12/2026");
  assert.equal(formatCampaignDate(""), "");
});

test("buildCampaignName matches the campaign naming convention", () => {
  assert.equal(
    buildCampaignName({
      description: "Summer Finding",
      startDate: "2026-06-12",
      objective: "Leads (Instant Forms)",
      regional: "True"
    }),
    "_CD:Summer Finding_CSD:06/12/2026_CO:Leads (Instant Forms)_CR:True_TID:_"
  );
});

test("buildCampaignName normalizes whitespace and regional values", () => {
  assert.equal(
    buildCampaignName({
      description: "  Salt   Lake\nLaunch ",
      startDate: "2026-01-03",
      objective: "Traffic",
      regional: "False",
      trackingId: "  ABC 123 "
    }),
    "_CD:Salt Lake Launch_CSD:01/03/2026_CO:Traffic_CR:False_TID:ABC 123_"
  );
});

test("getLocalDateInputValue uses local calendar fields", () => {
  assert.equal(
    getLocalDateInputValue(new Date(2026, 5, 12, 23, 30)),
    "2026-06-12"
  );
});

test("buildAdsetName matches the reference naming convention", () => {
  assert.equal(
    buildAdsetName({
      description: "March English",
      startDate: "2026-06-12",
      language: "English",
      audienceId: "A-12",
      trackingId: "T-4"
    }),
    "_ASD:March English_ASSD:06/12/2026_ASL:English_AID:A-12_TID:T-4_"
  );
});

test("buildAdName matches the reference naming convention", () => {
  assert.equal(
    buildAdName({
      description: "Come to Church",
      startDate: "2026-06-12",
      topic: "Church",
      blessing: "Peace",
      subject: "Missionaries",
      format: "Video",
      localized: "False",
      creativeId: "Mar26-00042",
      testingId: "Test 1"
    }),
    "_AD:Come to Church_ASD:06/12/2026_AT:Church_AB:Peace_AS:Missionaries_AF:Video_AL:False_TID:Mar26-00042_TEST:Test 1_"
  );
});
