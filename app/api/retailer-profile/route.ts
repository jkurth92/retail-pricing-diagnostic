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
type SourceStatus = {
  status: "not_requested" | "success" | "failed" | "empty";
  statusCode: number | null;
  error: string | null;
  keys: string[];
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
  sourceStatus: {
    profile: SourceStatus;
    quote: SourceStatus;
    secFinancials: SourceStatus;
    headlines: SourceStatus;
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
    tsr?: number | null;
  };
  headlines: {
    title: string;
    date: string | null;
    source: string | null;
    url?: string | null;
    category?: string | null;
  }[];
  sourceMetadata?: Record<string, string>;
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
  url?: string;
};
type FmpProfileItem = Record<string, unknown>;
type FmpQuoteItem = Record<string, unknown>;
type FmpHistoricalPriceItem = {
  date?: string;
  close?: number;
  adjClose?: number;
};
type FmpHistoricalPriceResponse = {
  historical?: FmpHistoricalPriceItem[];
};
type SecCompanyFactUnit = {
  fy?: number;
  fp?: string;
  form?: string;
  filed?: string;
  val?: number;
};
type SecCompanyFacts = {
  facts?: Record<
    string,
    Record<
      string,
      {
        units?: Record<string, SecCompanyFactUnit[]>;
      }
    >
  >;
};
type FmpFetchResult<T> = {
  data: T | null;
  error: string | null;
  status: number | null;
  keys: string[];
};
type FmpHeadlineResult = {
  headlines: RetailerProfileResponse["headlines"];
  endpointStatus: EndpointStatus;
  sourceStatus: SourceStatus;
};
type SecFinancialResult = {
  revenue: FinancialPoint[];
  ebitda: FinancialPoint[];
  margin: FinancialPoint[];
  revenueGrowth: number | null;
  workingCapitalToRevenue: number | null;
  sourceStatus: SourceStatus;
  sourceMetadata: Record<string, string>;
};
type MarketDataResult = {
  tsr: number | null;
  sourceStatus: SourceStatus;
  sourceMetadata: Record<string, string>;
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

const notRequestedSourceStatus: SourceStatus = {
  status: "not_requested",
  statusCode: null,
  error: null,
  keys: [],
};

const createEmptySourceStatus = (): RetailerProfileResponse["sourceStatus"] => ({
  profile: notRequestedSourceStatus,
  quote: notRequestedSourceStatus,
  secFinancials: notRequestedSourceStatus,
  headlines: notRequestedSourceStatus,
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
  sourceStatus: createEmptySourceStatus(),
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
    tsr: null,
  },
  headlines: [],
  sourceMetadata: {},
});

const getYear = (item: { calendarYear?: string; date?: string }) =>
  item.calendarYear || item.date?.slice(0, 4) || "Unknown";

const toBillions = (value: number | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value / 1000000000 : null;

const toPercent = (value: number | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.abs(value) <= 1 ? value * 100 : value;
};

const calculatePercent = (numerator: number | null, denominator: number | null) =>
  numerator !== null && denominator !== null && denominator !== 0
    ? (numerator / denominator) * 100
    : null;

const hasUsableData = <T,>(data: T | null) =>
  Array.isArray(data) ? data.length > 0 : data !== null;

const getPayloadKeys = (data: unknown) => {
  if (Array.isArray(data)) {
    const firstObject = data.find(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item)
    );
    return firstObject ? Object.keys(firstObject).sort() : [];
  }

  if (data && typeof data === "object") {
    return Object.keys(data).sort();
  }

  return [];
};

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

const sourceStatusFromResult = <T,>(
  result: FmpFetchResult<T>
): SourceStatus => {
  if (hasUsableData(result.data)) {
    return {
      status: "success",
      statusCode: result.status,
      error: null,
      keys: result.keys,
    };
  }

  if (result.error) {
    return {
      status: "failed",
      statusCode: result.status,
      error: result.error,
      keys: result.keys,
    };
  }

  return {
    status: "empty",
    statusCode: result.status,
    error: null,
    keys: result.keys,
  };
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
    return { data: null, error: fetchError, status: null, keys: [] };
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

    return { data: null, error, status: response.status, keys: [] };
  }

  try {
    const data = (await response.json()) as T;
    const keys = getPayloadKeys(data);

    console.log(
      "[retailer-profile] FMP payload keys:",
      JSON.stringify({ url: sanitizedApiUrl, keys })
    );

    return { data, error: null, status: response.status, keys };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to parse FMP response JSON";
    const parseError = `FMP response parse failed for ${sanitizedApiUrl}: ${message}`;

    console.error("[retailer-profile] FMP parse error:", parseError);
    return { data: null, error: parseError, status: response.status, keys: [] };
  }
};

const categorizeHeadline = (headline: string) => {
  const normalizedHeadline = headline.toLowerCase();
  if (normalizedHeadline.includes("promo") || normalizedHeadline.includes("discount")) {
    return "Promotions";
  }
  if (
    normalizedHeadline.includes("cost") ||
    normalizedHeadline.includes("margin") ||
    normalizedHeadline.includes("profit")
  ) {
    return "Cost / Margin";
  }
  if (
    normalizedHeadline.includes("strateg") ||
    normalizedHeadline.includes("growth") ||
    normalizedHeadline.includes("acquir") ||
    normalizedHeadline.includes("invest")
  ) {
    return "Strategy";
  }
  if (
    normalizedHeadline.includes("operat") ||
    normalizedHeadline.includes("supply") ||
    normalizedHeadline.includes("store")
  ) {
    return "Operations";
  }
  return "Pricing";
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
        url: article.url || null,
        category: categorizeHeadline(article.title || ""),
      })),
    endpointStatus: endpointStatusFromResult(newsItems),
    sourceStatus: sourceStatusFromResult(newsItems),
  };
};

const fetchPublicRssHeadlines = async (
  ticker: string
): Promise<FmpHeadlineResult> => {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    ticker
  )}&region=US&lang=en-US`;

  console.log("[retailer-profile] Attempting headline source:", url);

  try {
    const response = await fetch(url, { next: { revalidate: 1800 } });
    const xml = await response.text();

    if (!response.ok) {
      const error = `Headline RSS request failed with status ${response.status}`;
      console.error("[retailer-profile]", error, xml);

      return {
        headlines: [],
        endpointStatus: {
          status: "failed",
          statusCode: response.status,
          error,
        },
        sourceStatus: {
          status: "failed",
          statusCode: response.status,
          error,
          keys: [],
        },
      };
    }

    const headlines = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 5)
      .map((match) => {
        const itemXml = match[1] || "";
        const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
          itemXml.match(/<title>(.*?)<\/title>/)?.[1] ||
          "";
        const date = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || null;
        const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || null;

        return {
          title,
          date,
          source: "Yahoo Finance RSS",
          url: link,
          category: categorizeHeadline(title),
        };
      })
      .filter((headline) => headline.title);
    const status: SourceStatus["status"] =
      headlines.length > 0 ? "success" : "empty";

    console.log(
      "[retailer-profile] Headline source result:",
      JSON.stringify({
        source: "Yahoo Finance RSS",
        status,
        count: headlines.length,
        keys: headlines.length > 0 ? Object.keys(headlines[0]) : [],
      })
    );

    return {
      headlines,
      endpointStatus: {
        status: headlines.length > 0 ? "succeeded" : "unavailable",
        statusCode: response.status,
        error: null,
      },
      sourceStatus: {
        status,
        statusCode: response.status,
        error: null,
        keys: headlines.length > 0 ? Object.keys(headlines[0]) : [],
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch headline RSS feed";
    console.error("[retailer-profile] Headline source failed:", message);

    return {
      headlines: [],
      endpointStatus: { status: "failed", statusCode: null, error: message },
      sourceStatus: { status: "failed", statusCode: null, error: message, keys: [] },
    };
  }
};

const fetchHeadlinesWithFallback = async (
  ticker: string,
  fmpApiKey: string | undefined
): Promise<FmpHeadlineResult> => {
  if (!fmpApiKey) return fetchPublicRssHeadlines(ticker);

  const fmpNewsResult = await fetchHeadlines(ticker, fmpApiKey);
  if (fmpNewsResult.headlines.length > 0) return fmpNewsResult;

  console.warn(
    "[retailer-profile] FMP headlines returned no usable data. Falling back to public RSS headlines."
  );

  return fetchPublicRssHeadlines(ticker);
};

const getSecConceptSeries = (
  companyFacts: SecCompanyFacts,
  conceptNames: string[]
): FinancialPoint[] => {
  for (const conceptName of conceptNames) {
    const concept = companyFacts.facts?.["us-gaap"]?.[conceptName];
    const usdFacts = concept?.units?.USD;
    if (!usdFacts) continue;

    const annualFactsByYear = new Map<number, SecCompanyFactUnit>();
    usdFacts
      .filter(
        (fact) =>
          typeof fact.val === "number" &&
          typeof fact.fy === "number" &&
          fact.fp === "FY" &&
          (fact.form === "10-K" || fact.form === "10-K/A")
      )
      .forEach((fact) => {
        const existingFact = annualFactsByYear.get(fact.fy as number);
        if (
          !existingFact ||
          String(fact.filed || "") > String(existingFact.filed || "")
        ) {
          annualFactsByYear.set(fact.fy as number, fact);
        }
      });

    const series = [...annualFactsByYear.entries()]
      .sort(([leftYear], [rightYear]) => leftYear - rightYear)
      .slice(-5)
      .flatMap(([year, fact]) =>
        typeof fact.val === "number"
          ? [{ year: `FY${String(year).slice(-2)}`, value: fact.val / 1000000000 }]
          : []
      );

    if (series.length > 0) return series;
  }

  return [];
};

const latestPoint = (series: FinancialPoint[]) =>
  series.length > 0 ? series[series.length - 1] : null;

const calculateGrowthFromSeries = (series: FinancialPoint[]) => {
  if (series.length < 2) return null;
  const previousPoint = series[series.length - 2];
  const currentPoint = series[series.length - 1];

  if (!previousPoint || !currentPoint || previousPoint.value === 0) return null;
  return ((currentPoint.value - previousPoint.value) / previousPoint.value) * 100;
};

const calculateMatchedMarginSeries = (
  numeratorSeries: FinancialPoint[],
  denominatorSeries: FinancialPoint[]
) =>
  numeratorSeries.flatMap((numeratorPoint) => {
    const denominatorPoint = denominatorSeries.find(
      (point) => point.year === numeratorPoint.year
    );
    const value = calculatePercent(
      numeratorPoint.value,
      denominatorPoint?.value ?? null
    );

    return value === null ? [] : [{ year: numeratorPoint.year, value }];
  });

const fetchSecFinancials = async (
  cik: string | null
): Promise<SecFinancialResult> => {
  if (!cik) {
    return {
      revenue: [],
      ebitda: [],
      margin: [],
      revenueGrowth: null,
      workingCapitalToRevenue: null,
      sourceStatus: {
        status: "empty",
        statusCode: null,
        error: "No CIK available for SEC company facts lookup.",
        keys: [],
      },
      sourceMetadata: {},
    };
  }

  const paddedCik = cik.replace(/^0+/, "").padStart(10, "0");
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;

  console.log("[retailer-profile] Attempting SEC financial source:", url);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "retail-pricing-diagnostic contact@example.com",
      },
      next: { revalidate: 86400 },
    });
    const text = await response.text();

    if (!response.ok) {
      const error = `SEC company facts request failed with status ${response.status}`;
      console.error("[retailer-profile]", error, text);

      return {
        revenue: [],
        ebitda: [],
        margin: [],
        revenueGrowth: null,
        workingCapitalToRevenue: null,
        sourceStatus: {
          status: "failed",
          statusCode: response.status,
          error,
          keys: [],
        },
        sourceMetadata: {},
      };
    }

    const companyFacts = JSON.parse(text) as SecCompanyFacts;
    const usGaapKeys = Object.keys(companyFacts.facts?.["us-gaap"] || {}).sort();
    const revenue = getSecConceptSeries(companyFacts, [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]);
    const ebitda = getSecConceptSeries(companyFacts, [
      "EarningsBeforeInterestTaxesDepreciationAmortization",
      "EarningsBeforeInterestTaxesDepreciationAndAmortization",
      "OperatingIncomeLoss",
    ]);
    const currentAssets = getSecConceptSeries(companyFacts, ["AssetsCurrent"]);
    const currentLiabilities = getSecConceptSeries(companyFacts, [
      "LiabilitiesCurrent",
    ]);
    const margin = calculateMatchedMarginSeries(ebitda, revenue);
    const revenueGrowth = calculateGrowthFromSeries(revenue);
    const latestRevenue = latestPoint(revenue);
    const latestCurrentAssets = currentAssets.find(
      (point) => point.year === latestRevenue?.year
    );
    const latestCurrentLiabilities = currentLiabilities.find(
      (point) => point.year === latestRevenue?.year
    );
    const workingCapital =
      latestCurrentAssets && latestCurrentLiabilities
        ? latestCurrentAssets.value - latestCurrentLiabilities.value
        : null;
    const workingCapitalToRevenue = calculatePercent(
      workingCapital,
      latestRevenue?.value ?? null
    );
    const hasFinancialData =
      revenue.length > 0 ||
      ebitda.length > 0 ||
      margin.length > 0 ||
      revenueGrowth !== null ||
      workingCapitalToRevenue !== null;
    const sourceMetadata = {
      ...(revenue.length > 0
        ? { "financials.revenue": "SEC company facts: revenue concept" }
        : {}),
      ...(ebitda.length > 0
        ? {
            "financials.ebitda":
              "SEC company facts: EBITDA concept or OperatingIncomeLoss as EBITA",
          }
        : {}),
      ...(margin.length > 0
        ? {
            "financials.margin":
              "Computed as EBITDA/EBITA divided by revenue for matching fiscal years",
          }
        : {}),
      ...(revenueGrowth !== null
        ? {
            "market.revenueGrowth":
              "Computed as latest SEC revenue year-over-year growth",
          }
        : {}),
      ...(workingCapitalToRevenue !== null
        ? {
            "profitability.workingCapital":
              "Computed as (current assets - current liabilities) / revenue from SEC company facts",
          }
        : {}),
    };

    console.log(
      "[retailer-profile] SEC source result:",
      JSON.stringify({
        status: hasFinancialData ? "success" : "empty",
        revenuePoints: revenue.length,
        ebitdaPoints: ebitda.length,
        marginPoints: margin.length,
        revenueGrowthAvailable: revenueGrowth !== null,
        workingCapitalToRevenueAvailable: workingCapitalToRevenue !== null,
        keys: usGaapKeys.slice(0, 40),
      })
    );

    return {
      revenue,
      ebitda,
      margin,
      revenueGrowth,
      workingCapitalToRevenue,
      sourceStatus: {
        status: hasFinancialData ? "success" : "empty",
        statusCode: response.status,
        error: null,
        keys: usGaapKeys,
      },
      sourceMetadata,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch SEC financials";
    console.error("[retailer-profile] SEC source failed:", message);

    return {
      revenue: [],
      ebitda: [],
      margin: [],
      revenueGrowth: null,
      workingCapitalToRevenue: null,
      sourceStatus: {
        status: "failed",
        statusCode: null,
        error: message,
        keys: [],
      },
      sourceMetadata: {},
    };
  }
};

const fetchMarketData = async (
  ticker: string,
  fmpApiKey: string | undefined
): Promise<MarketDataResult> => {
  if (!fmpApiKey) {
    return {
      tsr: null,
      sourceStatus: {
        status: "not_requested",
        statusCode: null,
        error: "FMP_API_KEY is not configured. Skipping historical price source.",
        keys: [],
      },
      sourceMetadata: {},
    };
  }

  const result = await fmpFetch<FmpHistoricalPriceResponse>(
    `/historical-price-full/${encodeURIComponent(ticker)}?timeseries=260`,
    fmpApiKey
  );
  const sortedPrices = (result.data?.historical || [])
    .filter((price) => typeof (price.adjClose ?? price.close) === "number")
    .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")));
  const firstPrice = sortedPrices[0]?.adjClose ?? sortedPrices[0]?.close ?? null;
  const latestPrice =
    sortedPrices[sortedPrices.length - 1]?.adjClose ??
    sortedPrices[sortedPrices.length - 1]?.close ??
    null;
  const tsr = calculatePercent(
    latestPrice !== null && firstPrice !== null ? latestPrice - firstPrice : null,
    firstPrice
  );
  const status: SourceStatus["status"] =
    tsr !== null
      ? "success"
      : result.error
        ? "failed"
        : "empty";

  console.log(
    "[retailer-profile] Historical price source result:",
    JSON.stringify({
      status,
      points: sortedPrices.length,
      tsrAvailable: tsr !== null,
      keys: result.keys,
    })
  );

  return {
    tsr,
    sourceStatus: {
      status,
      statusCode: result.status,
      error: result.error,
      keys: result.keys,
    },
    sourceMetadata:
      tsr === null
        ? {}
        : {
            "market.tsr":
              "Computed from FMP historical adjusted close over available lookback window",
          },
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
  const missingFmpKeyError = fmpApiKey
    ? null
    : "FMP_API_KEY is not configured. Skipping FMP profile and quote sources.";

  if (missingFmpKeyError) {
    console.warn("[retailer-profile]", missingFmpKeyError);
  }

  console.log(
    "[retailer-profile] Source attempts:",
    JSON.stringify({
      ticker,
      profile: Boolean(fmpApiKey),
      quote: Boolean(fmpApiKey),
      secFinancials: Boolean(directoryEntry?.cik),
      historicalPrices: Boolean(fmpApiKey),
      headlines: true,
    })
  );

  const [profileCheck, quoteCheck] = fmpApiKey
    ? await Promise.all([
        fmpFetch<FmpProfileItem[]>(
          `/profile/${encodeURIComponent(ticker)}`,
          fmpApiKey
        ),
        fmpFetch<FmpQuoteItem[]>(`/quote/${encodeURIComponent(ticker)}`, fmpApiKey),
      ])
    : [
        {
          data: null,
          error: missingFmpKeyError,
          status: null,
          keys: [],
        } satisfies FmpFetchResult<FmpProfileItem[]>,
        {
          data: null,
          error: missingFmpKeyError,
          status: null,
          keys: [],
        } satisfies FmpFetchResult<FmpQuoteItem[]>,
      ];
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

  const [secFinancials, marketData, newsResult] = await Promise.all([
    fetchSecFinancials(directoryEntry?.cik || null),
    fetchMarketData(ticker, fmpApiKey),
    fetchHeadlinesWithFallback(ticker, fmpApiKey),
  ]);
  const incomeStatementResult: FmpFetchResult<FmpIncomeStatement[]> = {
    data: null,
    error: null,
    status: null,
    keys: [],
  };
  const ratioResult: FmpFetchResult<FmpRatio[]> = {
    data: null,
    error: null,
    status: null,
    keys: [],
  };
  const growthResult: FmpFetchResult<FmpGrowthMetric[]> = {
    data: null,
    error: null,
    status: null,
    keys: [],
  };
  const endpointStatus: RetailerProfileResponse["endpointStatus"] = {
    profile: endpointStatusFromResult(profileCheck),
    quote: endpointStatusFromResult(quoteCheck),
    incomeStatement: notRequestedStatus,
    ratios: notRequestedStatus,
    growth: notRequestedStatus,
    news: newsResult.endpointStatus,
  };
  const sourceStatus: RetailerProfileResponse["sourceStatus"] = {
    profile: sourceStatusFromResult(profileCheck),
    quote: sourceStatusFromResult(quoteCheck),
    secFinancials: secFinancials.sourceStatus,
    headlines: newsResult.sourceStatus,
  };
  const usableSources = [
    sourceStatus.profile,
    sourceStatus.quote,
    sourceStatus.secFinancials,
    sourceStatus.headlines,
    marketData.sourceStatus,
  ].filter((status) => status.status === "success").length;

  console.log(
    "[retailer-profile] Source results:",
    JSON.stringify({
      profile: sourceStatus.profile.status,
      quote: sourceStatus.quote.status,
      secFinancials: sourceStatus.secFinancials.status,
      historicalPrices: marketData.sourceStatus.status,
      headlines: sourceStatus.headlines.status,
      successfulSources: usableSources,
    })
  );

  if (usableSources === 0) {
    const error = "All external public data sources failed or returned no data.";

    return NextResponse.json(
      {
        ...emptyProfile(resolvedRetailerName, ticker, ownership, error),
        endpointStatus,
        sourceStatus,
      },
      { status: 502 }
    );
  }

  const revenue = secFinancials.revenue;
  const ebitda = secFinancials.ebitda;
  const margin = secFinancials.margin;
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
    sourceStatus,
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
        secFinancials.workingCapitalToRevenue ??
        toPercent(latestRatio?.workingCapitalRevenueRatio) ??
        toPercent(latestRatio?.workingCapitalRatio),
    },
    market: {
      revenueGrowth:
        secFinancials.revenueGrowth ??
        toPercent(latestGrowthMetric?.revenueGrowth) ??
        toPercent(latestGrowthMetric?.grossProfitGrowth),
      margin:
        latestMargin ??
        toPercent(latestRatio?.ebitdaMargin) ??
        toPercent(latestRatio?.operatingProfitMargin),
      tsr: marketData.tsr,
    },
    headlines: newsResult.headlines,
    sourceMetadata: {
      ...secFinancials.sourceMetadata,
      ...marketData.sourceMetadata,
    },
  };

  return NextResponse.json(profile);
}
