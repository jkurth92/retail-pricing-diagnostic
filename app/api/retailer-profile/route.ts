import { NextResponse } from "next/server";
import { resolveRetailer } from "./retailerDirectory";

type FinancialPoint = {
  year: string;
  value: number;
};
type EndpointStatus = {
  status: "not_requested" | "succeeded" | "unavailable" | "blocked" | "failed";
  statusCode: number | null;
  error: string | null;
};

type RetailerProfileResponse = {
  retailerName: string;
  ticker: string | null;
  ownership: "public" | "private" | "unknown";
  error: string | null;
  endpointStatus: {
    profile: EndpointStatus;
    quote: EndpointStatus;
    incomeStatement: EndpointStatus;
    ratios: EndpointStatus;
    growth: EndpointStatus;
    news: EndpointStatus;
  };
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
type FmpFetchResult<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
};
type FmpHeadlineResult = {
  headlines: RetailerProfileResponse["headlines"];
  endpointStatus: EndpointStatus;
};

const notRequestedStatus: EndpointStatus = {
  status: "not_requested",
  statusCode: null,
  error: null,
};

const createEmptyEndpointStatus = (): RetailerProfileResponse["endpointStatus"] => ({
  profile: notRequestedStatus,
  quote: notRequestedStatus,
  incomeStatement: notRequestedStatus,
  ratios: notRequestedStatus,
  growth: notRequestedStatus,
  news: notRequestedStatus,
});

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
  endpointStatus: createEmptyEndpointStatus(),
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

const hasUsableData = <T,>(data: T | null) =>
  Array.isArray(data) ? data.length > 0 : data !== null;

const endpointStatusFromResult = <T,>(
  result: FmpFetchResult<T>
): EndpointStatus => {
  if (hasUsableData(result.data)) {
    return { status: "succeeded", statusCode: result.status, error: null };
  }

  if (result.status === 403) {
    return { status: "blocked", statusCode: result.status, error: result.error };
  }

  if (result.error) {
    return { status: "failed", statusCode: result.status, error: result.error };
  }

  return { status: "unavailable", statusCode: result.status, error: null };
};

const fmpFetch = async <T>(
  path: string,
  apiKey: string
): Promise<FmpFetchResult<T>> => {
  const apiUrlWithoutKey = `https://financialmodelingprep.com/api/v3${path}`;
  const apiUrl = `${apiUrlWithoutKey}${
    path.includes("?") ? "&" : "?"
  }apikey=${encodeURIComponent(apiKey)}`;
  const sanitizedApiUrl = `${apiUrlWithoutKey}${
    path.includes("?") ? "&" : "?"
  }apikey=<redacted>`;

  console.log("[retailer-profile] FMP request URL:", sanitizedApiUrl);

  let response: Response;
  try {
    response = await fetch(apiUrl, { next: { revalidate: 3600 } });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Network error while calling FMP";
    const fetchError = `FMP request failed for ${sanitizedApiUrl}: ${message}`;

    console.error("[retailer-profile] FMP fetch error:", fetchError);
    return { data: null, error: fetchError, status: null };
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    const error = `FMP request failed for ${sanitizedApiUrl} with status ${response.status}`;

    console.error(
      "[retailer-profile] FMP failed response:",
      JSON.stringify(
        {
          url: sanitizedApiUrl,
          status: response.status,
          statusText: response.statusText,
          body: responseBody,
        },
        null,
        2
      )
    );

    return { data: null, error, status: response.status };
  }

  try {
    return { data: (await response.json()) as T, error: null, status: response.status };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to parse FMP response JSON";
    const parseError = `FMP response parse failed for ${sanitizedApiUrl}: ${message}`;

    console.error("[retailer-profile] FMP parse error:", parseError);
    return { data: null, error: parseError, status: response.status };
  }
};

const fetchHeadlines = async (
  ticker: string,
  fmpApiKey: string
): Promise<FmpHeadlineResult> => {
  const newsItems = await fmpFetch<FmpNewsItem[]>(
    `/stock_news?tickers=${encodeURIComponent(ticker)}&limit=5`,
    fmpApiKey
  );

  return {
    headlines: (newsItems.data || [])
      .filter((article) => article.title)
      .slice(0, 5)
      .map((article) => ({
        title: article.title || "",
        date: article.publishedDate || null,
        source: article.site || null,
      })),
    endpointStatus: endpointStatusFromResult(newsItems),
  };
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

  const [profileCheck, quoteCheck] = await Promise.all([
    fmpFetch<unknown[]>(`/profile/${encodeURIComponent(ticker)}`, fmpApiKey),
    fmpFetch<unknown[]>(`/quote/${encodeURIComponent(ticker)}`, fmpApiKey),
  ]);
  console.log(
    "[retailer-profile] FMP simple endpoint test:",
    JSON.stringify({
      ticker,
      profileStatus: profileCheck.status,
      profileOk: Boolean(profileCheck.data),
      quoteStatus: quoteCheck.status,
      quoteOk: Boolean(quoteCheck.data),
    })
  );

  const [incomeStatementResult, ratioResult, growthResult, newsResult] =
    await Promise.all([
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
  const endpointStatus: RetailerProfileResponse["endpointStatus"] = {
    profile: endpointStatusFromResult(profileCheck),
    quote: endpointStatusFromResult(quoteCheck),
    incomeStatement: endpointStatusFromResult(incomeStatementResult),
    ratios: endpointStatusFromResult(ratioResult),
    growth: endpointStatusFromResult(growthResult),
    news: newsResult.endpointStatus,
  };
  const usableSources = [
    profileCheck,
    quoteCheck,
    incomeStatementResult,
    ratioResult,
    growthResult,
  ].filter((result) => hasUsableData(result.data)).length + (newsResult.headlines.length > 0 ? 1 : 0);
  const profileOrQuoteSucceeded =
    endpointStatus.profile.status === "succeeded" ||
    endpointStatus.quote.status === "succeeded";
  const planLimitedIncomeStatement =
    endpointStatus.incomeStatement.status === "blocked" && profileOrQuoteSucceeded;

  if (planLimitedIncomeStatement) {
    console.warn(
      "[retailer-profile] Income statement endpoint returned 403 while profile/quote succeeded. Treating as endpoint or plan-level restriction and returning available FMP data."
    );
  }

  if (usableSources === 0) {
    const error = "All usable FMP public data sources failed or returned no data.";

    return NextResponse.json(
      {
        ...emptyProfile(resolvedRetailerName, ticker, ownership, error),
        endpointStatus,
      },
      { status: 502 }
    );
  }

  const financials = (incomeStatementResult.data || []).slice(0, 5).reverse();
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
  const latestRatio = ratioResult.data?.[0];
  const latestGrowthMetric = growthResult.data?.[0];
  const latestMargin =
    margin.length > 0 ? margin[margin.length - 1]?.value ?? null : null;

  const profile: RetailerProfileResponse = {
    retailerName: resolvedRetailerName,
    ticker,
    ownership,
    error: null,
    endpointStatus,
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
    headlines: newsResult.headlines,
  };

  return NextResponse.json(profile);
}
