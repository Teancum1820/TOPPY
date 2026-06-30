import assert from "node:assert/strict";
import test from "node:test";
import { consolidateAds, parseCsv, selectRandomAds } from "../src/data.js";

test("parseCsv handles quoted commas, escaped quotes, and line breaks", () => {
  const csv =
    'Ad ID,Name,Notes\r\n123,"A, B","Said ""hello"""\r\n456,C,"Line 1\nLine 2"\r\n';
  const parsed = parseCsv(csv);

  assert.deepEqual(parsed.headers, ["Ad ID", "Name", "Notes"]);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].Name, "A, B");
  assert.equal(parsed.records[0].Notes, 'Said "hello"');
  assert.equal(parsed.records[1].Notes, "Line 1\nLine 2");
});

test("consolidateAds pivots measure rows into one ad", () => {
  const parsed = parseCsv(
    [
      "Level 1,Measure Names,Campaign Mission,Measure Values",
      "123,Leads,Denver,10",
      "123,Cost Per Lead,Denver,4.5",
      "456,Leads,Boise,8"
    ].join("\n")
  );
  const result = consolidateAds(parsed);

  assert.equal(result.ads.length, 2);
  assert.deepEqual(result.metricNames, ["Cost Per Lead", "Leads"]);
  assert.equal(result.ads[0].id, "123");
  assert.equal(result.ads[0].fields["Campaign Mission"], "Denver");
  assert.equal(result.ads[0].metrics.Leads, "10");
  assert.equal(result.ads[0].metrics["Cost Per Lead"], "4.5");
});

test("consolidateAds uses Level 2 as the ad ID for Top Ads exports", () => {
  const parsed = parseCsv(
    [
      "Level 1,Level 2,Measure Names,Adjust Ad?,Ad Mission,Ads Manager Link,Campaign Preview Link,Measure Values",
      "English,1234567890123,% Found Taught,Grow,Tennessee Nashville Mission,https://business.facebook.com/ad,https://fb.me/preview,0.166666667",
      "English,1234567890123,People Baptized and Confirmed,Grow,Tennessee Nashville Mission,https://business.facebook.com/ad,https://fb.me/preview,0",
      "Spanish,9876543210987,% Found Taught,Scale,Chile Santiago Mission,https://business.facebook.com/ad2,https://fb.me/preview2,0.25"
    ].join("\n")
  );
  const result = consolidateAds(parsed);

  assert.equal(result.ads.length, 2);
  assert.equal(result.ads[0].id, "1234567890123");
  assert.equal(result.ads[0].fields["Level 1"], "English");
  assert.equal(result.ads[0].fields["Ad Mission"], "Tennessee Nashville Mission");
  assert.equal(result.ads[0].metrics["% Found Taught"], "0.166666667");
  assert.equal(result.ads[0].metrics["People Baptized and Confirmed"], "0");
});

test("selectRandomAds returns unique ads and clamps the count", () => {
  const ads = Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1)
  }));

  const selection = selectRandomAds(ads, 50);
  assert.equal(selection.length, 12);
  assert.equal(new Set(selection.map((ad) => ad.id)).size, 12);
  assert.equal(ads[0].id, "1");
});
