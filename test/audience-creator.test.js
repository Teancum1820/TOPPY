import assert from "node:assert/strict";
import test from "node:test";
import {
  getZipCode,
  lookupAddress,
  lookupPoint,
  lookupZip,
  parseLatLong,
  resultsToCsv,
  resultsToTxt,
  splitAudienceInput
} from "../src/audience-creator.js";

function mockFetch(payload) {
  return async () => ({
    ok: true,
    async json() {
      return payload;
    }
  });
}

test("splitAudienceInput keeps one non-empty location per line", () => {
  assert.deepEqual(splitAudienceInput(" 123 Main St \n\n40.1, -111.2\n"), [
    "123 Main St",
    "40.1, -111.2"
  ]);
});

test("parseLatLong accepts comma or space separated coordinate pairs", () => {
  assert.deepEqual(parseLatLong("40.689247, -74.044502"), {
    latitude: "40.689247",
    longitude: "-74.044502"
  });
  assert.deepEqual(parseLatLong("lat 40.69 lon -74.04"), {
    latitude: "40.69",
    longitude: "-74.04"
  });
  assert.equal(parseLatLong("200, -74"), null);
});

test("getZipCode prefers structured postcode and falls back to display name", () => {
  assert.equal(getZipCode({ address: { postcode: "10001" } }), "10001");
  assert.equal(getZipCode({ display_name: "Example, NY 10002, USA" }), "10002");
});

test("lookupAddress maps Nominatim search result to audience result", async () => {
  const result = await lookupAddress(
    "350 5th Ave, New York, NY",
    mockFetch([
      {
        display_name: "350 5th Ave, New York, NY 10118, USA",
        lat: "40.7484405",
        lon: "-73.9856644",
        address: { postcode: "10118" }
      }
    ])
  );

  assert.deepEqual(result, {
    input: "350 5th Ave, New York, NY",
    address: "350 5th Ave, New York, NY 10118, USA",
    latitude: "40.748441",
    longitude: "-73.985664",
    zip: "10118",
    status: "Found"
  });
});

test("lookupPoint reverse geocodes valid coordinates", async () => {
  const result = await lookupPoint(
    "40.689247, -74.044502",
    mockFetch({
      display_name: "Statue of Liberty, New York, NY 10004, USA",
      lat: "40.689247",
      lon: "-74.044502",
      address: { postcode: "10004" }
    })
  );

  assert.equal(result.address, "Statue of Liberty, New York, NY 10004, USA");
  assert.equal(result.zip, "10004");
  assert.equal(result.status, "Found");
});

test("lookupZip handles coordinates and reports missing zip codes", async () => {
  const result = await lookupZip(
    "40.689247, -74.044502",
    mockFetch({
      display_name: "Statue of Liberty, New York, NY, USA",
      lat: "40.689247",
      lon: "-74.044502",
      address: {}
    })
  );

  assert.equal(result.input, "40.689247, -74.044502");
  assert.equal(result.zip, "");
  assert.equal(result.status, "Zip missing");
});

test("resultsToCsv escapes cells for copy output", () => {
  assert.equal(
    resultsToCsv([
      {
        input: 'A "quoted" address',
        address: "Somewhere",
        latitude: "1",
        longitude: "2",
        zip: "12345",
        status: "Found"
      }
    ]),
    '"Input","Address","Latitude","Longitude","Zip Code","Status"\n"A ""quoted"" address","Somewhere","1","2","12345","Found"'
  );
});

test("resultsToTxt formats location results for plain text export", () => {
  assert.equal(
    resultsToTxt([
      {
        input: "40.689247, -74.044502",
        address: "Statue of Liberty, New York, NY 10004, USA",
        latitude: "40.689247",
        longitude: "-74.044502",
        zip: "10004",
        status: "Found"
      }
    ]),
    [
      "Location 1",
      "Input: 40.689247, -74.044502",
      "Address: Statue of Liberty, New York, NY 10004, USA",
      "Latitude: 40.689247",
      "Longitude: -74.044502",
      "Zip Code: 10004",
      "Status: Found"
    ].join("\n")
  );
});
