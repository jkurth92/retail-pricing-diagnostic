export type RetailerDirectoryEntry = {
  name: string;
  aliases: string[];
  ownership: "public" | "private";
  ticker: string | null;
};

export const retailerDirectory: RetailerDirectoryEntry[] = [
  {
    name: "Target",
    aliases: ["target", "target corporation"],
    ownership: "public",
    ticker: "TGT",
  },
  {
    name: "Walmart",
    aliases: ["walmart", "wal-mart", "walmart inc"],
    ownership: "public",
    ticker: "WMT",
  },
  {
    name: "Costco",
    aliases: ["costco", "costco wholesale"],
    ownership: "public",
    ticker: "COST",
  },
  {
    name: "Kroger",
    aliases: ["kroger", "the kroger co"],
    ownership: "public",
    ticker: "KR",
  },
  {
    name: "Home Depot",
    aliases: ["home depot", "the home depot"],
    ownership: "public",
    ticker: "HD",
  },
  {
    name: "Best Buy",
    aliases: ["best buy", "bestbuy"],
    ownership: "public",
    ticker: "BBY",
  },
  {
    name: "Aldi",
    aliases: ["aldi"],
    ownership: "private",
    ticker: null,
  },
  {
    name: "Publix",
    aliases: ["publix", "publix super markets"],
    ownership: "private",
    ticker: null,
  },
  {
    name: "Trader Joe's",
    aliases: ["trader joe's", "trader joes"],
    ownership: "private",
    ticker: null,
  },
];

export const normalizeRetailerName = (retailerName: string) =>
  retailerName.trim().toLowerCase().replace(/\s+/g, " ");

export const resolveRetailer = (retailerName: string) => {
  const normalizedName = normalizeRetailerName(retailerName);

  return (
    retailerDirectory.find(
      (entry) =>
        normalizeRetailerName(entry.name) === normalizedName ||
        entry.aliases.some((alias) => normalizeRetailerName(alias) === normalizedName)
    ) || null
  );
};
