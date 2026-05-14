import { NextResponse } from "next/server";

type FinancialPoint = {
  year: string;
  value: number;
};

type RetailerProfileResponse = {
  retailerName: string;
  ticker: string | null;
  financials: {
    revenue: FinancialPoint[];
    ebitda: FinancialPoint[];
    margin: FinancialPoint[];
  };
  profitability: {
    roic: number | null;
    workingCapital: number | null;
  };
  market: {
    revenueGrowth: number | null;
    margin: number | null;
  };
  headlines: {
    title: string;
    date: string | null;
    source: string | null;
  }[];
};

type FmpIncomeStatement = {
  calendarYear?: string;
  date?: string;
  revenue?: number;
  ebitda?: number;
  ebitdaratio?: number;
};

type FmpRatio = {
  calendarYear?: string;
  date?: string;
  ebitdaMargin?: number;
  operatingProfitMargin?: number;
  returnOnInvestedCapital?: number;
  returnOnCapitalEmployed?: number;
  workingCapitalRatio?: number;
  workingCapitalRevenueRatio?: number;
};

type FmpGrowthMetric = {
  revenueGrowth?: number;
  grossProfitGrowth?: number;
};

type FmpSymbolSearchResult = {
  symbol?: string;
  name?: string;
  exchangeShortName?: string;
};

type NewsApiArticle = {
  title?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
};

const retailerTickerMap: Record<string, string> = {
  target: "TGT",
  walmart: "WMT",
  "wal-mart": "WMT",
  costco: "COST",
  kroger: "KR",
  "home depot": "HD",
  lowes: "LOW",
  "lowe's": "LOW",
  bestbuy: "BBY",
  "best buy": "BBY",
  amazon: "AMZN",
  albertsons: "ACI",
  macys: "M",
  "macy's": "M",
  nordstrom: "JWN",
  "dollar general": "DG",
  "dollar tree": "DLTR",
  walgreens: "WBA",
  cvs: "CVS",
};

const emptyProfile = (
  retailerName: string,
  ticker: string | null
): RetailerProfileResponse => ({
  retailerName,
  ticker,
  financials: {
    revenue: [],
    ebitda: [],
    margin: [],
  },
  profitability: {
    roic: null,
    workingCapital: null,
  },
  market: {
    revenueGrowth: null,
    margin: null,
  },
  headlines: [],
});

const normalizeRetailerName = (retailerName: string) =>
  retailerName.trim().toLowerCase().replace(/\s+/g, " ");

const getYear = (item: { calendarYear?: string; date?: string }) =>
  item.calendarYear || item.date?.slice(0, 4) || "Unknown";

const toBillions = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value / 1000000000 : null;

const toPercent = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
};

const fmpFetch = async <T>(path: string, apiKey: string): Promise<T | null> => {
  const apiUrlWithoutKey = `https://financialmodelingprep.com/api/v3${path}`;
  const apiUrl = `${apiUrlWithoutKey}${
    path.includes("?") ? "&" : "?"
  }apikey=${encodeURIComponent(apiKey)}`;

  console.log("[retailer-profile] FMP API URL:", apiUrlWithoutKey);

  const response = await fetch(apiUrl, { next: { revalidate: 3600 } });

  if (!response.ok) return null;
  return (await response.json()) as T;
};

const findTicker = async (retailerName: string, fmpApiKey: string) => {
  const normalizedName = normalizeRetailerName(retailerName);
  const mappedTicker = retailerTickerMap[normalizedName];
  if (mappedTicker) return mappedTicker;

  const searchResults = await fmpFetch<FmpSymbolSearchResult[]>(
    `/search-name?query=${encodeURIComponent(retailerName)}&limit=10`,
    fmpApiKey
  );

  return (
    searchResults?.find(
      (result) =>
        result.symbol &&
        (result.exchangeShortName === "NASDAQ" ||
          result.exchangeShortName === "NYSE")
    )?.symbol || null
  );
};

const fetchHeadlines = async (retailerName: string) => {
  const newsApiKey = process.env.NEWS_API_KEY;
  if (!newsApiKey) return [];

  const response = await fetch(
    `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      `"${retailerName}" retail`
    )}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${encodeURIComponent(
      newsApiKey
    )}`,
    { next: { revalidate: 1800 } }
  );

  if (!response.ok) return [];
  const payload = (await response.json()) as { articles?: NewsApiArticle[] };

  return (payload.articles || [])
    .filter((article) => article.title)
    .slice(0, 5)
    .map((article) => ({
      title: article.title || "",
      date: article.publishedAt || null,
      source: article.source?.name || null,
    }));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const retailerName = searchParams.get("retailerName")?.trim();
  const fmpApiKey = process.env.FMP_API_KEY;

  console.log("[retailer-profile] FMP_API_KEY defined:", Boolean(fmpApiKey));

  if (!retailerName) {
    return NextResponse.json(
      { error: "retailerName is required" },
      { status: 400 }
    );
  }

  if (!fmpApiKey) {
    console.warn(
      "[retailer-profile] FMP_API_KEY is undefined in the API route runtime. Confirm it is set in .env.local or the deployment environment and restart the Next.js server."
    );

    return NextResponse.json(
      { error: "FMP_API_KEY is not configured" },
      { status: 500 }
    );
  }

  const ticker = await findTicker(retailerName, fmpApiKey);
  if (!ticker) {
    return NextResponse.json(emptyProfile(retailerName, null));
  }

  const [incomeStatements, ratios, growthMetrics, headlines] = await Promise.all([
    fmpFetch<FmpIncomeStatement[]>(
      `/income-statement/${encodeURIComponent(ticker)}?limit=5`,
      fmpApiKey
    ),
    fmpFetch<FmpRatio[]>(`/ratios/${encodeURIComponent(ticker)}?limit=5`, fmpApiKey),
    fmpFetch<FmpGrowthMetric[]>(
      `/financial-growth/${encodeURIComponent(ticker)}?limit=5`,
      fmpApiKey
    ),
    fetchHeadlines(retailerName),
  ]);

  const financials = (incomeStatements || []).slice(0, 5).reverse();
  const revenue = financials.flatMap((item) => {
    const value = toBillions(item.revenue);
    return value === null ? [] : [{ year: getYear(item), value }];
  });
  const ebitda = financials.flatMap((item) => {
    const value = toBillions(item.ebitda);
    return value === null ? [] : [{ year: getYear(item), value }];
  });
  const margin = financials.flatMap((item) => {
    const value = toPercent(item.ebitdaratio);
    return value === null ? [] : [{ year: getYear(item), value }];
  });
  const latestRatio = ratios?.[0];
  const latestGrowthMetric = growthMetrics?.[0];
  const latestMargin =
    margin.length > 0 ? margin[margin.length - 1]?.value ?? null : null;

  const profile: RetailerProfileResponse = {
    retailerName,
    ticker,
    financials: {
      revenue,
      ebitda,
      margin,
    },
    profitability: {
      roic:
        toPercent(latestRatio?.returnOnInvestedCapital) ??
        toPercent(latestRatio?.returnOnCapitalEmployed),
      workingCapital:
        toPercent(latestRatio?.workingCapitalRevenueRatio) ??
        toPercent(latestRatio?.workingCapitalRatio),
    },
    market: {
      revenueGrowth:
        toPercent(latestGrowthMetric?.revenueGrowth) ??
        toPercent(latestGrowthMetric?.grossProfitGrowth),
      margin:
        latestMargin ??
        toPercent(latestRatio?.ebitdaMargin) ??
        toPercent(latestRatio?.operatingProfitMargin),
    },
    headlines,
  };

  return NextResponse.json(profile);
}
