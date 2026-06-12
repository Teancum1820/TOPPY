import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("selectRandomAds returns unique ads and clamps the count", () => {
  const ads = Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1)
  }));

  const selection = selectRandomAds(ads, 50);
  assert.equal(selection.length, 12);
  assert.equal(new Set(selection.map((ad) => ad.id)).size, 12);
  assert.equal(ads[0].id, "1");
});

test("English and Spanish inventories contain usable ads and metrics", async () => {
  const inventories = [
    ["English", "../Data/English/English Data 6-12-2026.csv"],
    ["Spanish", "../Data/Spanish/Spanish Data 6-12-2026.csv"]
  ];

  for (const [language, relativePath] of inventories) {
    const csv = await readFile(new URL(relativePath, import.meta.url), "utf8");
    const inventory = consolidateAds(parseCsv(csv));

    assert.ok(inventory.ads.length > 0, `${language} inventory has no ads`);
    assert.ok(
      inventory.metricNames.length > 0,
      `${language} inventory has no metrics`
    );
  }
});
