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
    if (getGoogleDriveFileId(value)) {
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
      record.Language ?? record["Language🌍💬"] ?? record["Language🌍💬 "]
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
  const topic = ad.topic || ad.mission;
  const subject = ad.missionaryNames || ad.mission || ad.country;
  const localized = ad.language
    ? ad.language.toLowerCase() === "english"
      ? "False"
      : "True"
    : "";

  return {
    description,
    startDate,
    topic,
    blessing: "",
    subject,
    format: ad.format,
    localized,
    creativeId: ad.id,
    testingId: ""
  };
}

export function getGoogleDriveFileId(url) {
  const fileMatch = /\/file\/d\/([^/]+)/.exec(url);
  const queryMatch = /[?&]id=([^&]+)/.exec(url);
  return fileMatch?.[1] || queryMatch?.[1] || "";
}

export function getGoogleDriveDownloadUrl(url) {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) {
    return "";
  }

  let resourceKey = "";
  try {
    resourceKey = new URL(url).searchParams.get("resourcekey") ?? "";
  } catch {
    // The file ID is enough for ordinary shared Drive links.
  }

  const params = new URLSearchParams({
    id: fileId,
    export: "download",
    confirm: "t"
  });
  if (resourceKey) {
    params.set("resourcekey", resourceKey);
  }

  return `https://drive.usercontent.google.com/download?${params}`;
}

const CONTENT_TYPE_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};

export function getAdDownloadFilename({
  adId,
  format = "Video",
  contentType = ""
}) {
  const safeId =
    clean(adId)
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/[.\s]+$/g, "") || "toppy-ad";
  const normalizedType = clean(contentType).split(";")[0].toLowerCase();
  const extension =
    CONTENT_TYPE_EXTENSIONS[normalizedType] ||
    (format === "Image" ? "jpg" : "mp4");

  return `${safeId}.${extension}`;
}

function escapePowerShellString(value) {
  return clean(value).replace(/'/g, "''");
}

export function getAdRenameScriptFilename() {
  return "toppy-rename-selected-ads.ps1";
}

export function buildWindowsRenameScript(ads) {
  const ids = ads.map((ad) => getAdDownloadFilename({ adId: ad.id, format: ad.format })
    .replace(/\.[^.]+$/, ""));
  const idLines = ids.map((id) => `  '${escapePowerShellString(id)}'`).join(",\r\n");

  return [
    "# Toppy Windows rename script",
    "# 1. Download the selected ads into one folder.",
    "# 2. Move this script into that same folder.",
    "# 3. Right-click the script and choose Run with PowerShell.",
    "# The script renames the newest matching media files in download order.",
    "",
    "param(",
    "  [string]$Path = $PSScriptRoot",
    ")",
    "",
    "$ErrorActionPreference = 'Stop'",
    `$CreativeIds = @(\r\n${idLines}\r\n)`,
    "$MediaExtensions = @('.mp4', '.mov', '.webm', '.jpg', '.jpeg', '.png', '.webp', '.gif')",
    "",
    "if ([string]::IsNullOrWhiteSpace($Path)) {",
    "  $Path = (Get-Location).Path",
    "}",
    "",
    "$Folder = Resolve-Path -LiteralPath $Path",
    "$Files = @(",
    "  Get-ChildItem -LiteralPath $Folder -File |",
    "    Where-Object { $MediaExtensions -contains $_.Extension.ToLowerInvariant() } |",
    "    Sort-Object LastWriteTime, Name |",
    "    Select-Object -Last $CreativeIds.Count",
    ")",
    "",
    "if ($Files.Count -lt $CreativeIds.Count) {",
    "  Write-Host \"Found $($Files.Count) media files, but $($CreativeIds.Count) Creative IDs need files.\" -ForegroundColor Red",
    "  Write-Host \"Download all selected ads into $Folder, then run this script again.\"",
    "  exit 1",
    "}",
    "",
    "Write-Host \"Toppy will rename these files:\" -ForegroundColor Cyan",
    "for ($Index = 0; $Index -lt $CreativeIds.Count; $Index++) {",
    "  $File = $Files[$Index]",
    "  $NewName = \"$($CreativeIds[$Index])$($File.Extension.ToLowerInvariant())\"",
    "  Write-Host \"  $($File.Name) -> $NewName\"",
    "}",
    "",
    "$Answer = Read-Host \"Rename these files? Type YES to continue\"",
    "if ($Answer -ne 'YES') {",
    "  Write-Host 'No files renamed.'",
    "  exit 0",
    "}",
    "",
    "for ($Index = 0; $Index -lt $CreativeIds.Count; $Index++) {",
    "  $File = $Files[$Index]",
    "  $BaseName = $CreativeIds[$Index]",
    "  $Extension = $File.Extension.ToLowerInvariant()",
    "  $NewName = \"$BaseName$Extension\"",
    "  $TargetPath = Join-Path -Path $Folder -ChildPath $NewName",
    "  $Suffix = 2",
    "",
    "  while ((Test-Path -LiteralPath $TargetPath) -and ($TargetPath -ne $File.FullName)) {",
    "    $NewName = \"$BaseName-$Suffix$Extension\"",
    "    $TargetPath = Join-Path -Path $Folder -ChildPath $NewName",
    "    $Suffix++",
    "  }",
    "",
    "  if ($File.FullName -ne $TargetPath) {",
    "    Rename-Item -LiteralPath $File.FullName -NewName $NewName",
    "  }",
    "}",
    "",
    "Write-Host \"Renamed $($CreativeIds.Count) files.\" -ForegroundColor Green",
    ""
  ].join("\r\n");
}

function clickDownloadLink({ href, filename, documentRef, target = "" }) {
  const anchor = documentRef.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  if (target) {
    anchor.target = target;
    anchor.rel = "noopener noreferrer";
  }
  anchor.hidden = true;
  documentRef.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadNewAdFile({
  url,
  adId,
  format = "Video",
  openInNewTab = false,
  fetchImpl = fetch,
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
  revokeDelay = 1000
}) {
  const downloadUrl = getGoogleDriveDownloadUrl(url);
  if (!downloadUrl) {
    throw new Error("This Drive link does not point to a downloadable file.");
  }

  if (openInNewTab) {
    const filename = getAdDownloadFilename({ adId, format });
    clickDownloadLink({
      href: downloadUrl,
      filename,
      documentRef,
      target: "_blank"
    });

    return {
      filename,
      size: null,
      type: "",
      openedInNewTab: true
    };
  }

  let response;
  try {
    response = await fetchImpl(downloadUrl);
  } catch {
    const filename = getAdDownloadFilename({ adId, format });
    clickDownloadLink({
      href: downloadUrl,
      filename,
      documentRef,
      target: "_blank"
    });

    return {
      filename,
      size: null,
      type: "",
      openedInNewTab: true
    };
  }

  if (!response.ok) {
    throw new Error(`Google Drive download failed with ${response.status}.`);
  }

  const blob = await response.blob();
  if (blob.size === 0) {
    throw new Error("Google Drive returned an empty file.");
  }

  const filename = getAdDownloadFilename({
    adId,
    format,
    contentType: blob.type || response.headers.get("Content-Type") || ""
  });
  const objectUrl = urlApi.createObjectURL(blob);
  clickDownloadLink({
    href: objectUrl,
    filename,
    documentRef
  });
  setTimeout(() => urlApi.revokeObjectURL(objectUrl), revokeDelay);

  return {
    filename,
    size: blob.size,
    type: blob.type,
    openedInNewTab: false
  };
}

export async function downloadNewAdFiles({
  ads,
  downloadFile = downloadNewAdFile,
  delayMs = 350,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
}) {
  const results = [];
  for (const ad of ads) {
    const result = await downloadFile({
      url: ad.videoUrl,
      adId: ad.id,
      format: ad.format
    });
    results.push({
      adId: ad.id,
      ...result
    });
    if (delayMs > 0 && results.length < ads.length) {
      await wait(delayMs);
    }
  }
  return results;
}

export function downloadWindowsRenameScript({
  ads,
  documentRef = globalThis.document,
  urlApi = globalThis.URL,
  revokeDelay = 1000
}) {
  const script = buildWindowsRenameScript(ads);
  const blob = new Blob([script], {
    type: "text/plain;charset=utf-8"
  });
  const objectUrl = urlApi.createObjectURL(blob);
  const filename = getAdRenameScriptFilename();
  clickDownloadLink({
    href: objectUrl,
    filename,
    documentRef
  });
  setTimeout(() => urlApi.revokeObjectURL(objectUrl), revokeDelay);

  return {
    filename,
    count: ads.length
  };
}
