import { parseCsv, selectRandomAds } from "./data.js";

const LINK_COLUMNS = [
  "Final Video Link",
  "Edited by FSC Link",
  "Edited by Mission Link",
  "Raw Video Link/Folder"
];

function clean(value) {
  return String(value ?? "").trim();
}

function isTrue(value) {
  return /^(true|yes|1)$/i.test(clean(value));
}

function getVideoUrl(record) {
  for (const column of LINK_COLUMNS) {
    const value = clean(record[column]);
    if (value) {
      return value;
    }
  }
  return "";
}

function randomToken(length, random) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length },
    () => alphabet[Math.floor(random() * alphabet.length)]
  ).join("");
}

export function generateToppyAdId({
  date = new Date(),
  random = Math.random
} = {}) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `TPY-${year}${month}${day}-${randomToken(6, random)}`;
}

export function parseNewAdsCsv(
  text,
  {
    month,
    monthLabel,
    idFactory = () => generateToppyAdId()
  }
) {
  const { records } = parseCsv(text);

  return records.flatMap((record, index) => {
    const videoUrl = getVideoUrl(record);
    if (!videoUrl) {
      return [];
    }

    const sheetId = clean(record["Creative ID"]);
    const ratingText = clean(record.Rating);
    const ratingValue = Number(ratingText);
    const language = clean(
      record["Language🌍💬"] ?? record["Language🌍💬 "]
    );
    const image = isTrue(record["Image?"]);

    return [
      {
        key: `${month}-${index}`,
        id: sheetId || idFactory(),
        generatedId: !sheetId,
        month,
        monthLabel,
        language,
        rating:
          ratingText && Number.isFinite(ratingValue) ? ratingValue : null,
        format: image ? "Image" : "Video",
        videoUrl,
        mission: clean(record.Mission),
        country: clean(record.Country),
        missionaryNames: clean(record["Missionary Names"]),
        topic: clean(record["Script / Topic"]),
        status: clean(record.Status),
        notes: clean(record.Notes),
        fields: record
      }
    ];
  });
}

export function filterNewAds(
  ads,
  {
    language = "",
    month = "",
    minRating = "",
    format = "",
    status = ""
  } = {}
) {
  const minimum = minRating === "" ? null : Number(minRating);

  return ads.filter(
    (ad) =>
      (!language || ad.language === language) &&
      (!month || ad.month === month) &&
      (minimum === null || (ad.rating !== null && ad.rating >= minimum)) &&
      (!format || ad.format === format) &&
      (!status || ad.status === status)
  );
}

export function selectFilteredNewAds(ads, count, filters) {
  return selectRandomAds(filterNewAds(ads, filters), count);
}

export function getNewAdFilterOptions(ads) {
  const uniqueSorted = (values) =>
    [...new Set(values.filter(Boolean))].sort((left, right) =>
      left.localeCompare(right)
    );

  return {
    languages: uniqueSorted(ads.map((ad) => ad.language)),
    months: [...new Map(ads.map((ad) => [ad.month, ad.monthLabel])).entries()],
    formats: uniqueSorted(ads.map((ad) => ad.format)),
    statuses: uniqueSorted(ads.map((ad) => ad.status))
  };
}

export function createAdNameFields(ad, startDate) {
  const description = ad.topic || ad.mission || ad.id;
  const subject = ad.missionaryNames || ad.mission || ad.country;
  const localized = ad.language
    ? ad.language.toLowerCase() === "english"
      ? "False"
      : "True"
    : "";

  return {
    description,
    startDate,
    topic: ad.topic,
    blessing: "",
    subject,
    format: ad.format,
    localized,
    creativeId: ad.id,
    testingId: ""
  };
}

export function getGoogleDriveDownloadUrl(url) {
  const fileMatch = /\/file\/d\/([^/]+)/.exec(url);
  const queryMatch = /[?&]id=([^&]+)/.exec(url);
  const fileId = fileMatch?.[1] || queryMatch?.[1];

  return fileId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    : url;
}
