const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

function normalizeInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function splitAudienceInput(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => normalizeInput(line))
    .filter(Boolean);
}

export function parseLatLong(value) {
  const text = normalizeInput(value);
  const matches = text.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) {
    return null;
  }

  const latitude = Number(matches[0]);
  const longitude = Number(matches[1]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude)
  };
}

export function roundCoordinate(value) {
  return Number(value).toFixed(6).replace(/\.?0+$/, "");
}

export function getZipCode(place) {
  const postcode = place?.address?.postcode;
  if (postcode) {
    return String(postcode).trim();
  }

  const displayName = place?.display_name ?? "";
  return displayName.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] ?? "";
}

function toResult(input, place, fallback = {}) {
  return {
    input,
    address: place?.display_name ?? fallback.address ?? "",
    latitude: place?.lat ? roundCoordinate(place.lat) : fallback.latitude ?? "",
    longitude: place?.lon ? roundCoordinate(place.lon) : fallback.longitude ?? "",
    zip: getZipCode(place),
    status: place ? "Found" : "No match"
  };
}

async function fetchJson(url, fetchImpl) {
  const response = await fetchImpl(url.toString(), {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Lookup failed with status ${response.status}.`);
  }
  return response.json();
}

export async function lookupAddress(address, fetchImpl = fetch) {
  const url = new URL("/search", NOMINATIM_BASE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  const [place] = await fetchJson(url, fetchImpl);
  return toResult(address, place);
}

export async function lookupPoint(point, fetchImpl = fetch) {
  const coordinates =
    typeof point === "string" ? parseLatLong(point) : point;
  if (!coordinates) {
    return {
      input: String(point ?? ""),
      address: "",
      latitude: "",
      longitude: "",
      zip: "",
      status: "Invalid lat/long"
    };
  }

  const url = new URL("/reverse", NOMINATIM_BASE_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("lat", coordinates.latitude);
  url.searchParams.set("lon", coordinates.longitude);

  const place = await fetchJson(url, fetchImpl);
  return toResult(`${coordinates.latitude}, ${coordinates.longitude}`, place, coordinates);
}

export async function lookupZip(input, fetchImpl = fetch) {
  const coordinates = parseLatLong(input);
  const result = coordinates
    ? await lookupPoint(coordinates, fetchImpl)
    : await lookupAddress(input, fetchImpl);

  return {
    ...result,
    input,
    status: result.zip ? "Found" : result.status === "Found" ? "Zip missing" : result.status
  };
}

export function resultsToCsv(results) {
  const headers = ["Input", "Address", "Latitude", "Longitude", "Zip Code", "Status"];
  const rows = results.map((result) => [
    result.input,
    result.address,
    result.latitude,
    result.longitude,
    result.zip,
    result.status
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

export function resultsToTxt(results) {
  if (results.length === 0) {
    return "";
  }

  return results
    .map((result, index) =>
      [
        `Location ${index + 1}`,
        `Input: ${result.input || ""}`,
        `Address: ${result.address || ""}`,
        `Latitude: ${result.latitude || ""}`,
        `Longitude: ${result.longitude || ""}`,
        `Zip Code: ${result.zip || ""}`,
        `Status: ${result.status || ""}`
      ].join("\n")
    )
    .join("\n\n");
}
