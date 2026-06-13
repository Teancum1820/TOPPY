import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createAdNameFields,
  filterNewAds,
  generateToppyAdId,
  getGoogleDriveDownloadUrl,
  parseNewAdsCsv
} from "../src/new-ads.js";

test("parseNewAdsCsv maps linked rows and generates missing IDs", () => {
  const csv = [
    "Mission,Language🌍💬 ,Script / Topic,Creative ID,Image?,Rating,Status,Final Video Link",
    "Denver,English,Come to Church,Mar26-100,TRUE,4,Available for Use,https://drive.google.com/file/d/abc/view",
    "Boise,Spanish,Faith,,FALSE,5,Rating Pending,https://drive.google.com/file/d/def/view",
    "Provo,English,Prayer,May26-100,FALSE,5,Available for Use,"
  ].join("\n");

  const ads = parseNewAdsCsv(csv, {
    month: "2026-03",
    monthLabel: "March 2026",
    idFactory: () => "TPY-GENERATED"
  });

  assert.equal(ads.length, 2);
  assert.equal(ads[0].id, "Mar26-100");
  assert.equal(ads[0].format, "Image");
  assert.equal(ads[1].id, "TPY-GENERATED");
  assert.equal(ads[1].generatedId, true);
});

test("filterNewAds combines language, month, rating, format, and status", () => {
  const ads = [
    {
      language: "English",
      month: "2026-03",
      rating: 4,
      format: "Video",
      status: "Available for Use"
    },
    {
      language: "English",
      month: "2026-03",
      rating: 2,
      format: "Video",
      status: "Available for Use"
    },
    {
      language: "Spanish",
      month: "2026-03",
      rating: 5,
      format: "Image",
      status: "Rating Pending"
    }
  ];

  assert.equal(
    filterNewAds(ads, {
      language: "English",
      month: "2026-03",
      minRating: "3",
      format: "Video",
      status: "Available for Use"
    }).length,
    1
  );
});

test("createAdNameFields prefills editable naming details", () => {
  assert.deepEqual(
    createAdNameFields(
      {
        id: "Mar26-100",
        topic: "Come to Church",
        mission: "Denver",
        missionaryNames: "Elder A / Elder B",
        country: "USA",
        language: "Spanish",
        format: "Video"
      },
      "2026-06-12"
    ),
    {
      description: "Come to Church",
      startDate: "2026-06-12",
      topic: "Come to Church",
      blessing: "",
      subject: "Elder A / Elder B",
      format: "Video",
      localized: "True",
      creativeId: "Mar26-100",
      testingId: ""
    }
  );
});

test("ID and Drive helpers return usable values", () => {
  assert.equal(
    generateToppyAdId({
      date: new Date(2026, 5, 12),
      random: () => 0
    }),
    "TPY-20260612-AAAAAA"
  );
  assert.equal(
    getGoogleDriveDownloadUrl("https://drive.google.com/file/d/abc123/view"),
    "https://drive.google.com/uc?export=download&id=abc123"
  );
});

test("real March data supports five English ads rated three or above", async () => {
  const csv = await readFile(
    new URL(
      "../New Ads/Missionary Content Initiative - March 2026.csv",
      import.meta.url
    ),
    "utf8"
  );
  const ads = parseNewAdsCsv(csv, {
    month: "2026-03",
    monthLabel: "March 2026"
  });

  assert.ok(
    filterNewAds(ads, {
      language: "English",
      month: "2026-03",
      minRating: "3"
    }).length >= 5
  );
  assert.ok(
    filterNewAds(ads, {
      language: "Spanish"
    }).length >= 10
  );
});
