import assert from "node:assert/strict";
import test from "node:test";
import {
  consolidateAds,
  filterAdsByPreset,
  getAdPerformanceValue,
  parseMetricNumber,
  parseCsv,
  selectRandomAds,
  selectRandomAdsExcluding,
  sortAdsByPerformance
} from "../src/data.js";

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

test("consolidateAds uses Level 1 as the ad ID for Top Ads exports", () => {
  const parsed = parseCsv(
    [
      "Level 1,Measure Names,Adjust Ad?,Ad Mission,Ads Manager Link,Campaign Preview Link,Measure Values",
      "1234567890123,% Found Taught,Grow,Tennessee Nashville Mission,https://business.facebook.com/ad,https://fb.me/preview,0.166666667",
      "1234567890123,People Baptized and Confirmed,Grow,Tennessee Nashville Mission,https://business.facebook.com/ad,https://fb.me/preview,0",
      "9876543210987,% Found Taught,Scale,Chile Santiago Mission,https://business.facebook.com/ad2,https://fb.me/preview2,0.25"
    ].join("\n")
  );
  const result = consolidateAds(parsed);

  assert.equal(result.ads.length, 2);
  assert.equal(result.ads[0].id, "1234567890123");
  assert.equal(result.ads[0].fields["Ad Mission"], "Tennessee Nashville Mission");
  assert.equal(result.ads[0].metrics["% Found Taught"], "0.166666667");
  assert.equal(result.ads[0].metrics["People Baptized and Confirmed"], "0");
});

test("consolidateAds supports tab-delimited wide Top Ads exports", () => {
  const parsed = parseCsv(
    [
      [
        "Level 1",
        "Adjust Ad?",
        "Ads Manager Link",
        "Campaign Preview Link",
        "Ad Mission",
        "People Found",
        "Ad Leads",
        "Cost Per Facebook Lead",
        "New People Being Taught",
        "People Who Attended Sacrament",
        "People with a Baptism Date",
        "People Baptized and Confirmed"
      ].join("\t"),
      [
        "Grand Total",
        "Total",
        "Total",
        "Total",
        "Total",
        "277,272",
        "370,110",
        "$32",
        "42,748",
        "6,426",
        "3,094",
        "353"
      ].join("\t"),
      [
        "120220221775130246",
        "Grow",
        "https://business.facebook.com/ad",
        "https://fb.me/preview",
        "California Modesto",
        "2,609",
        "2,749",
        "$34",
        "604",
        "103",
        "53",
        "12"
      ].join("\t")
    ].join("\n")
  );
  const result = consolidateAds(parsed);

  assert.equal(result.ads.length, 1);
  assert.equal(result.ads[0].id, "120220221775130246");
  assert.equal(result.ads[0].fields["Adjust Ad?"], "Grow");
  assert.equal(result.ads[0].fields["Ad Mission"], "California Modesto");
  assert.equal(result.ads[0].metrics["People Found"], "2,609");
  assert.equal(result.ads[0].metrics["Cost Per Facebook Lead"], "$34");
  assert.ok(result.metricNames.includes("People Baptized and Confirmed"));
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

test("selectRandomAdsExcluding skips rejected ad IDs", () => {
  const ads = [
    { id: "approved-1" },
    { id: "rejected" },
    { id: "approved-2" }
  ];

  const selection = selectRandomAdsExcluding(ads, 5, ["rejected"]);

  assert.deepEqual(
    selection.map((ad) => ad.id).sort(),
    ["approved-1", "approved-2"]
  );
});

test("parseMetricNumber handles currency, commas, and percentages", () => {
  assert.equal(parseMetricNumber("$1,250.50"), 1250.5);
  assert.equal(parseMetricNumber("42%"), 0.42);
  assert.equal(parseMetricNumber(""), null);
});

test("sortAdsByPerformance supports requested Top Ads metrics", () => {
  const ads = [
    {
      id: "low-cost",
      fields: { "Adjust Ad?": "Grow" },
      metrics: {
        "Ad Leads": "12",
        "Cost per Lead": "$2",
        "People Baptized and Confirmed": "1"
      }
    },
    {
      id: "high-baptism",
      fields: { "Adjust Ad?": "Remove" },
      metrics: {
        "Ad Leads": "30",
        "Cost per Lead": "$8",
        "People Baptized and Confirmed": "4"
      }
    }
  ];

  assert.equal(getAdPerformanceValue(ads[0], "adjustAd"), "Grow");
  assert.deepEqual(
    sortAdsByPerformance(ads, "baptizedConfirmed", "desc").map((ad) => ad.id),
    ["high-baptism", "low-cost"]
  );
  assert.deepEqual(
    sortAdsByPerformance(ads, "costPerLead", "asc").map((ad) => ad.id),
    ["low-cost", "high-baptism"]
  );
});

test("filterAdsByPreset finds top performing and through the roof ads", () => {
  const ads = [
    {
      id: "best",
      fields: { "Adjust Ad?": "Grow" },
      metrics: {
        "Ad Leads": "100",
        "Cost per Lead": "$2",
        "New People Being Taught": "30",
        "People who attend sacrament meeting": "12",
        "People with Baptism Date": "8",
        "People Baptized and Confirmed": "5"
      }
    },
    {
      id: "volume",
      fields: { "Adjust Ad?": "Grow" },
      metrics: {
        "Ad Leads": "300",
        "Cost per Lead": "$12",
        "New People Being Taught": "50",
        "People who attend sacrament meeting": "25",
        "People with Baptism Date": "12",
        "People Baptized and Confirmed": "4"
      }
    },
    {
      id: "expensive",
      fields: { "Adjust Ad?": "Remove" },
      metrics: {
        "Ad Leads": "80",
        "Cost per Lead": "$40",
        "New People Being Taught": "7",
        "People who attend sacrament meeting": "2",
        "People with Baptism Date": "1",
        "People Baptized and Confirmed": "1"
      }
    },
    {
      id: "incomplete",
      fields: { "Adjust Ad?": "Grow" },
      metrics: {
        "Ad Leads": "500",
        "New People Being Taught": "0",
        "People Baptized and Confirmed": "0"
      }
    }
  ];

  assert.equal(filterAdsByPreset(ads, "top-performing")[0].id, "best");
  assert.deepEqual(
    filterAdsByPreset(ads, "through-the-roof").map((ad) => ad.id),
    ["volume"]
  );
});
