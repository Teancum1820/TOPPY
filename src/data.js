const COLUMN_ALIASES = {
  id: ["level 1", "ad id", "adid", "id", "level 2"],
  measureName: ["measure names", "measure name", "metric names", "metric name"],
  measureValue: [
    "measure values",
    "measure value",
    "metric values",
    "metric value"
  ]
};

const TOP_AD_METADATA_PATTERNS = [
  /adjust\s*ad/i,
  /ad\s*country/i,
  /ads\s*manager\s*link/i,
  /campaign\s*preview\s*link/i,
  /(?:campaign|ad)\s*mission/i
];

export const AD_PERFORMANCE_FIELDS = [
  {
    key: "adjustAd",
    label: "Adjust Ad",
    source: "field",
    patterns: [/adjust\s*ad/i],
    direction: "text"
  },
  {
    key: "peopleFound",
    label: "People Found",
    source: "metric",
    patterns: [/people\s*found/i, /people\s*found\s*taught/i, /found\s*taught/i],
    direction: "desc"
  },
  {
    key: "adLeads",
    label: "Ad Leads",
    source: "metric",
    patterns: [/^ad\s*leads?$/i, /\bleads?\b/i],
    direction: "desc"
  },
  {
    key: "costPerLead",
    label: "Cost per Lead",
    source: "metric",
    patterns: [/cost\s*per.*lead/i, /cpl/i],
    direction: "asc"
  },
  {
    key: "newPeopleBeingTaught",
    label: "New People Being Taught",
    source: "metric",
    patterns: [/new\s*people\s*being\s*taught/i, /new\s*people\s*taught/i],
    direction: "desc"
  },
  {
    key: "sacramentMeeting",
    label: "People who attend sacrament meeting",
    source: "metric",
    patterns: [/sacrament\s*meeting/i, /attend(?:ing|ed)?\s*sacrament/i],
    direction: "desc"
  },
  {
    key: "baptismDate",
    label: "People with Baptism Date",
    source: "metric",
    patterns: [/baptism\s*date/i, /with\s*baptism/i],
    direction: "desc"
  },
  {
    key: "baptizedConfirmed",
    label: "People Baptized and Confirmed",
    source: "metric",
    patterns: [/baptized\s*and\s*confirmed/i, /people\s*baptized/i],
    direction: "desc"
  }
];

function normalizeColumnName(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers, aliases, fallback = "") {
  for (const alias of aliases) {
    const match = headers.find(
      (header) => normalizeColumnName(header) === alias
    );
    if (match) {
      return match;
    }
  }

  return fallback;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
}

export function parseCsv(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === delimiter) {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "").trim() : header.trim()
  );
  const records = rows
    .slice(1)
    .filter((values) => values.some((value) => value.trim() !== ""))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index]?.trim() ?? ""])
      )
    );

  return { headers, records };
}

function isTopAdMetadataColumn(column) {
  return TOP_AD_METADATA_PATTERNS.some((pattern) => pattern.test(column));
}

function isSummaryRow(id) {
  return /^grand\s+total$/i.test(id) || /^total$/i.test(id);
}

export function consolidateAds({ headers, records }) {
  if (headers.length === 0) {
    return {
      ads: [],
      idColumn: "",
      metadataColumns: [],
      metricNames: []
    };
  }

  const idColumn = findColumn(headers, COLUMN_ALIASES.id, headers[0]);
  const measureNameColumn = findColumn(headers, COLUMN_ALIASES.measureName);
  const measureValueColumn = findColumn(headers, COLUMN_ALIASES.measureValue);
  const excludedColumns = new Set(
    [idColumn, measureNameColumn, measureValueColumn].filter(Boolean)
  );
  const hasMeasureRows = Boolean(measureNameColumn && measureValueColumn);
  const metadataColumns = headers.filter((header) => {
    if (excludedColumns.has(header)) {
      return false;
    }
    return hasMeasureRows || isTopAdMetadataColumn(header);
  });
  const wideMetricColumns = hasMeasureRows
    ? []
    : headers.filter(
        (header) => !excludedColumns.has(header) && !metadataColumns.includes(header)
      );
  const adsById = new Map();
  const metricNames = new Set();

  for (const record of records) {
    const id = record[idColumn]?.trim();
    if (!id || isSummaryRow(id)) {
      continue;
    }

    if (!adsById.has(id)) {
      adsById.set(id, {
        id,
        fields: Object.fromEntries(
          metadataColumns.map((column) => [column, ""])
        ),
        metrics: {}
      });
    }

    const ad = adsById.get(id);
    for (const column of metadataColumns) {
      if (!ad.fields[column] && record[column]) {
        ad.fields[column] = record[column];
      }
    }

    if (hasMeasureRows) {
      const metricName = record[measureNameColumn]?.trim();
      if (metricName) {
        metricNames.add(metricName);
        ad.metrics[metricName] = record[measureValueColumn]?.trim() ?? "";
      }
    } else {
      for (const column of wideMetricColumns) {
        metricNames.add(column);
        ad.metrics[column] = record[column]?.trim() ?? "";
      }
    }
  }

  return {
    ads: [...adsById.values()],
    idColumn,
    metadataColumns,
    metricNames: [...metricNames].sort((left, right) =>
      left.localeCompare(right)
    )
  };
}

function getRandomIndex(maxExclusive, randomValues) {
  const maxUint32 = 0x100000000;
  const rejectionLimit = maxUint32 - (maxUint32 % maxExclusive);
  let value;

  do {
    crypto.getRandomValues(randomValues);
    [value] = randomValues;
  } while (value >= rejectionLimit);

  return value % maxExclusive;
}

export function selectRandomAds(ads, count) {
  const safeCount = Math.max(0, Math.min(Math.trunc(count), ads.length));
  const pool = [...ads];
  const randomValues = new Uint32Array(1);

  for (let index = 0; index < safeCount; index += 1) {
    const randomOffset = getRandomIndex(pool.length - index, randomValues);
    const randomIndex = index + randomOffset;
    [pool[index], pool[randomIndex]] = [pool[randomIndex], pool[index]];
  }

  return pool.slice(0, safeCount);
}

export function selectRandomAdsExcluding(ads, count, excludedIds = []) {
  const excluded = new Set(excludedIds);
  return selectRandomAds(
    ads.filter((ad) => !excluded.has(ad.id)),
    count
  );
}

export function parseMetricNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const multiplier = text.includes("%") ? 0.01 : 1;
  const parsed = Number(text.replace(/[$,%\s]/g, ""));
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

function findMatchingValue(values, patterns) {
  const entries = Object.entries(values ?? {});
  const match = entries.find(([name]) =>
    patterns.some((pattern) => pattern.test(name))
  );
  return match?.[1] ?? "";
}

export function getAdPerformanceValue(ad, key) {
  const config = AD_PERFORMANCE_FIELDS.find((field) => field.key === key);
  if (!config) {
    return "";
  }

  return findMatchingValue(
    config.source === "field" ? ad.fields : ad.metrics,
    config.patterns
  );
}

function getNumericPerformanceValue(ad, key) {
  return parseMetricNumber(getAdPerformanceValue(ad, key)) ?? 0;
}

function percentileCutoff(values, percentile) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1)
  );
  return sorted[index];
}

function scoreRatio(numerator, denominator) {
  const bottom = Math.max(1, denominator);
  return numerator / bottom;
}

export function getBaptismPercentage(ad) {
  return Math.max(
    parseMetricNumber(findMatchingValue(ad.metrics, [/baptism\s*%/i, /%.*bapt/i])) ?? 0,
    scoreRatio(
      getNumericPerformanceValue(ad, "baptizedConfirmed"),
      getNumericPerformanceValue(ad, "adLeads")
    )
  );
}

export function getTopPerformingScore(ad) {
  const baptized = getNumericPerformanceValue(ad, "baptizedConfirmed");
  const baptismRate = getBaptismPercentage(ad);
  const costPerLead = getNumericPerformanceValue(ad, "costPerLead");
  const teaching = getNumericPerformanceValue(ad, "newPeopleBeingTaught");
  const sacrament = getNumericPerformanceValue(ad, "sacramentMeeting");
  const baptismDates = getNumericPerformanceValue(ad, "baptismDate");
  const lowCostBonus = costPerLead > 0 ? 50 / costPerLead : 0;

  return (
    baptized * 300 +
    baptismRate * 220 +
    baptismDates * 12 +
    sacrament * 6 +
    teaching * 3 +
    lowCostBonus * 4
  );
}

export function getThroughTheRoofScore(ad) {
  return (
    getNumericPerformanceValue(ad, "adLeads") +
    getNumericPerformanceValue(ad, "newPeopleBeingTaught") * 4 +
    getNumericPerformanceValue(ad, "sacramentMeeting") * 6 +
    getNumericPerformanceValue(ad, "baptismDate") * 10 +
    getNumericPerformanceValue(ad, "baptizedConfirmed") * 18
  );
}

export function sortAdsByPerformance(ads, sortKey, direction = "desc") {
  if (!sortKey) {
    return [...ads];
  }

  const config = AD_PERFORMANCE_FIELDS.find((field) => field.key === sortKey);
  if (!config) {
    return [...ads];
  }

  const multiplier = direction === "asc" ? 1 : -1;
  return [...ads].sort((left, right) => {
    const leftValue = getAdPerformanceValue(left, sortKey);
    const rightValue = getAdPerformanceValue(right, sortKey);

    if (config.direction === "text") {
      return multiplier * String(leftValue).localeCompare(String(rightValue));
    }

    const leftNumber = parseMetricNumber(leftValue);
    const rightNumber = parseMetricNumber(rightValue);
    if (leftNumber === null && rightNumber === null) {
      return left.id.localeCompare(right.id);
    }
    if (leftNumber === null) {
      return 1;
    }
    if (rightNumber === null) {
      return -1;
    }
    if (leftNumber === rightNumber) {
      return left.id.localeCompare(right.id);
    }
    return multiplier * (leftNumber - rightNumber);
  });
}

export function filterAdsByPreset(ads, preset) {
  if (!preset) {
    return [...ads];
  }

  if (preset === "top-performing") {
    const scored = ads
      .map((ad) => ({
        ad,
        score: getTopPerformingScore(ad),
        baptized: getNumericPerformanceValue(ad, "baptizedConfirmed"),
        baptismRate: getBaptismPercentage(ad)
      }))
      .filter(({ score, baptized, baptismRate }) =>
        score > 0 && (baptized > 0 || baptismRate > 0)
      );
    const cutoff = percentileCutoff(
      scored.map(({ score }) => score),
      0.75
    );
    return scored
      .filter(({ score }) => score >= cutoff)
      .sort((left, right) => right.score - left.score)
      .map(({ ad }) => ad);
  }

  if (preset === "through-the-roof") {
    const requiredKeys = [
      "adLeads",
      "newPeopleBeingTaught",
      "sacramentMeeting",
      "baptismDate",
      "baptizedConfirmed"
    ];
    const scored = ads
      .map((ad) => ({
        ad,
        score: getThroughTheRoofScore(ad),
        values: requiredKeys.map((key) => getNumericPerformanceValue(ad, key))
      }))
      .filter(({ values }) => values.every((value) => value > 0));
    const cutoff = percentileCutoff(
      scored.map(({ score }) => score),
      0.9
    );
    return scored
      .filter(({ score }) => score >= cutoff)
      .sort((left, right) => right.score - left.score)
      .map(({ ad }) => ad);
  }

  return [...ads];
}
