export type RetailerDirectoryEntry = {
  name: string;
  aliases: string[];
  ownership: "public" | "private";
  ticker: string | null;
  cik: string | null;
};

export const retailerDirectory: RetailerDirectoryEntry[] = [
  {
    name: "Target",
    aliases: ["target", "target corporation"],
    ownership: "public",
    ticker: "TGT",
    cik: "0000027419",
  },
  {
    name: "Walmart",
    aliases: ["walmart", "wal-mart", "walmart inc"],
    ownership: "public",
    ticker: "WMT",
    cik: "0000104169",
  },
  {
    name: "Costco",
    aliases: ["costco", "costco wholesale"],
    ownership: "public",
    ticker: "COST",
    cik: "0000909832",
  },
  {
    name: "Kroger",
    aliases: ["kroger", "the kroger co"],
    ownership: "public",
    ticker: "KR",
    cik: "0000056873",
  },
  {
    name: "Home Depot",
    aliases: ["home depot", "the home depot"],
    ownership: "public",
    ticker: "HD",
    cik: "0000354950",
  },
  {
    name: "Best Buy",
    aliases: ["best buy", "bestbuy"],
    ownership: "public",
    ticker: "BBY",
    cik: "0000764478",
  },
  {
    name: "Amazon",
    aliases: ["amazon", "amazon.com", "amazon.com inc"],
    ownership: "public",
    ticker: "AMZN",
    cik: "0001018724",
  },
  {
    name: "Lowe's",
    aliases: ["lowe's", "lowes", "lowe's companies"],
    ownership: "public",
    ticker: "LOW",
    cik: "0000060667",
  },
  {
    name: "Albertsons",
    aliases: ["albertsons", "albertsons companies"],
    ownership: "public",
    ticker: "ACI",
    cik: "0001646972",
  },
  {
    name: "Aldi",
    aliases: ["aldi"],
    ownership: "private",
    ticker: null,
    cik: null,
  },
  {
    name: "Publix",
    aliases: ["publix", "publix super markets"],
    ownership: "private",
    ticker: null,
    cik: null,
  },
  {
    name: "Trader Joe's",
    aliases: ["trader joe's", "trader joes"],
    ownership: "private",
    ticker: null,
    cik: null,
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
