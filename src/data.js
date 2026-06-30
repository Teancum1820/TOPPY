const COLUMN_ALIASES = {
  id: ["ad id", "adid", "level 2", "id", "level 1"],
  measureName: ["measure names", "measure name", "metric names", "metric name"],
  measureValue: [
    "measure values",
    "measure value",
    "metric values",
    "metric value"
  ]
};

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

export function parseCsv(text) {
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
    } else if (character === ",") {
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
  const metadataColumns = headers.filter(
    (header) => !excludedColumns.has(header)
  );
  const adsById = new Map();
  const metricNames = new Set();

  for (const record of records) {
    const id = record[idColumn]?.trim();
    if (!id) {
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

    const metricName = record[measureNameColumn]?.trim();
    if (metricName) {
      metricNames.add(metricName);
      ad.metrics[metricName] = record[measureValueColumn]?.trim() ?? "";
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
