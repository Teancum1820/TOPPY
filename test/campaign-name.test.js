import assert from "node:assert/strict";
import test from "node:test";
import {
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
