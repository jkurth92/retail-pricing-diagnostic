import { NextResponse } from "next/server";
import { resolveRetailer } from "./retailerDirectory";

type FinancialPoint = {
  year: string;
  value: number;
};

type RetailerProfileResponse = {
  retailerName: string;
  ticker: string | null;
  ownership: "public" | "private" | "unknown";
  error: string | null;
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

type FmpNewsItem = {
  title?: string;
  publishedDate?: string;
  site?: string;
};

const emptyProfile = (
  retailerName: string,
  ticker: string | null,
  ownership: RetailerProfileResponse["ownership"],
  error: string | null = null
): RetailerProfileResponse => ({
  retailerName,
  ticker,
  ownership,
  error,
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

  if (!response.ok) {
    throw new Error(
      `FMP request failed for ${apiUrlWithoutKey} with status ${response.status}`
    );
  }

  return (await response.json()) as T;
};

const fetchHeadlines = async (ticker: string, fmpApiKey: string) => {
  const newsItems = await fmpFetch<FmpNewsItem[]>(
    `/stock_news?tickers=${encodeURIComponent(ticker)}&limit=5`,
    fmpApiKey
  );

  return (newsItems || [])
    .filter((article) => article.title)
    .slice(0, 5)
    .map((article) => ({
      title: article.title || "",
      date: article.publishedDate || null,
      source: article.site || null,
    }));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const retailerName = searchParams.get("retailerName")?.trim();

  if (!retailerName) {
    return NextResponse.json(
      { error: "retailerName is required" },
      { status: 400 }
    );
  }

  const directoryEntry = resolveRetailer(retailerName);
  const resolvedRetailerName = directoryEntry?.name || retailerName;
  const ownership = directoryEntry?.ownership || "unknown";
  const ticker = directoryEntry?.ticker || null;

  if (ownership !== "public" || !ticker) {
    return NextResponse.json(emptyProfile(resolvedRetailerName, ticker, ownership));
  }

  const fmpApiKey = process.env.FMP_API_KEY;
  if (!fmpApiKey) {
    const error =
      "FMP_API_KEY is not configured. Set it in .env.local or the deployment environment and restart the Next.js server.";
    console.warn("[retailer-profile]", error);

    return NextResponse.json(
      emptyProfile(resolvedRetailerName, ticker, ownership, error),
      { status: 500 }
    );
  }

  let incomeStatements: FmpIncomeStatement[] | null;
  let ratios: FmpRatio[] | null;
  let growthMetrics: FmpGrowthMetric[] | null;
  let headlines: RetailerProfileResponse["headlines"];

  try {
    [incomeStatements, ratios, growthMetrics, headlines] = await Promise.all([
      fmpFetch<FmpIncomeStatement[]>(
        `/income-statement/${encodeURIComponent(ticker)}?limit=5`,
        fmpApiKey
      ),
      fmpFetch<FmpRatio[]>(`/ratios/${encodeURIComponent(ticker)}?limit=5`, fmpApiKey),
      fmpFetch<FmpGrowthMetric[]>(
        `/financial-growth/${encodeURIComponent(ticker)}?limit=5`,
        fmpApiKey
      ),
      fetchHeadlines(ticker, fmpApiKey),
    ]);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch retailer profile from FMP";
    console.error("[retailer-profile]", message);

    return NextResponse.json(
      emptyProfile(resolvedRetailerName, ticker, ownership, message),
      { status: 502 }
    );
  }

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
    retailerName: resolvedRetailerName,
    ticker,
    ownership,
    error: null,
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
