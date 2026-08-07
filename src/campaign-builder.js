export const CAMPAIGN_SIZE_OPTIONS = [3, 4, 5];

export function parseAdIds(value) {
  const seen = new Set();
  return String(value ?? "").split(/[\s,;]+/).map((id) => id.trim())
    .filter((id) => id && !seen.has(id) && seen.add(id));
}

export function selectCampaignAds(ids, count, random = Math.random) {
  const uniqueIds = Array.isArray(ids) ? [...new Set(ids)] : parseAdIds(ids);
  const size = Number(count);
  if (!CAMPAIGN_SIZE_OPTIONS.includes(size)) throw new Error("Choose 3, 4, or 5 ads.");
  if (uniqueIds.length < size) throw new Error(`Add at least ${size} unique ad IDs.`);
  const pool = [...uniqueIds];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, size);
}

const DESCRIPTION_PATTERNS = ["{KEYWORD}", "{KEYWORD} REMIX", "{KEYWORD} MIX", "THE {KEYWORD} EDIT", "{KEYWORD} COLLECTION", "{KEYWORD} SPOTLIGHT", "{KEYWORD} FAVORITES", "{KEYWORD} MOMENT", "ALL ABOUT {KEYWORD}", "THE BEST OF {KEYWORD}", "{KEYWORD} REIMAGINED", "{KEYWORD} STORIES"];

export function generateDescriptionIdeas(keyword) {
  const cleanKeyword = String(keyword ?? "").replace(/\s+/g, " ").trim().toUpperCase();
  return cleanKeyword ? DESCRIPTION_PATTERNS.map((pattern) => pattern.replace("{KEYWORD}", cleanKeyword)) : [];
}

// Replace or extend these patterns when proven campaign copy is supplied.
const COPY_PATTERNS = {
  headlines: ["Discover {topic}", "A Better Way to Explore {topic}", "Your Next Step With {topic}", "See What {topic} Can Inspire", "Start Your {topic} Journey"],
  primaryTexts: ["Curious about {topic}? Explore a fresh perspective and find a next step that fits you.", "There is more to discover about {topic}. Take a moment, explore, and see what stands out.", "Ready to learn more about {topic}? Start here and discover ideas made to move you forward.", "Your next meaningful moment could begin with {topic}. See what is waiting for you.", "Explore {topic} in a simple, approachable way. One small step can lead somewhere meaningful."],
  descriptions: ["Explore {topic} today.", "Discover a fresh take on {topic}.", "Learn more and take the next step.", "Ideas and inspiration for {topic}.", "See what {topic} can mean for you."]
};

export function generateAdCopy(topic) {
  const cleanTopic = String(topic ?? "").replace(/\s+/g, " ").trim();
  if (!cleanTopic) return { headlines: [], primaryTexts: [], descriptions: [] };
  const fill = (pattern) => pattern.replaceAll("{topic}", cleanTopic);
  return Object.fromEntries(Object.entries(COPY_PATTERNS).map(([key, patterns]) => [key, patterns.map(fill)]));
}
