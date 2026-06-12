export const CAMPAIGN_OBJECTIVES = [
  "Leads (Instant Forms)",
  "Leads (Messenger)",
  "Leads (Calls)",
  "Awareness",
  "Traffic",
  "Engagement",
  "Sales"
];

export function formatCampaignDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    return "";
  }

  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function cleanSegment(value) {
  return String(value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCampaignName({
  description = "",
  startDate = "",
  objective = CAMPAIGN_OBJECTIVES[0],
  regional = "True",
  trackingId = ""
} = {}) {
  return [
    `_CD:${cleanSegment(description)}`,
    `_CSD:${formatCampaignDate(startDate)}`,
    `_CO:${cleanSegment(objective)}`,
    `_CR:${regional === "False" ? "False" : "True"}`,
    `_TID:${cleanSegment(trackingId)}_`
  ].join("");
}

export function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
