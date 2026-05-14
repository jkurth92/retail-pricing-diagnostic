"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import PricingLadderModule from "@/components/PricingLadderModule";
import PriceZoneModule from "@/components/PriceZoneModule";
import PromoCalendarModule from "@/components/PromoCalendarModule";
import MarkdownModule from "@/components/MarkdownModule";
import { estimateOpportunity } from "./utils/opportunityEngine";

type Tab = "overview" | "pricing" | "promotions" | "markdown";
type OverviewTab = "prompts" | "retailer" | "retailerOverview" | "opportunity";
type AnalysisMode = "external" | "hybrid";
type EprDimension =
  | "strategicPricePositioning"
  | "priceArchitectureKvis"
  | "promotionsStrategyEffectiveness"
  | "promoPriceIntegration"
  | "markdownInventoryManagement"
  | "executionTools";
type EprScores = Record<EprDimension, number>;
type UploadedClientDataMetadata = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  status: "Uploaded";
};
type ClientStructuredContext = {
  pricingModel: string;
  promoIntensity: string;
  channelMix: string;
  retailerFormat: string;
  scopeSignal: string;
};
type ClientContext = {
  eprScores: EprScores;
  eprAverageScore: number;
  eprMaturityLabel: string;
  additionalContext: string;
  structuredContext: ClientStructuredContext;
  uploadedClientData: UploadedClientDataMetadata[];
};
type Opportunity = ReturnType<typeof estimateOpportunity>;
type Scenario = "Base" | "Conservative" | "Aggressive";
type EstimateComponents = {
  baseBenchmarkAdjustment: number;
  eprAdjustment: number;
  scopeAdjustment: number;
  clientDataAdjustment: number;
};
type LeverContributions = {
  pricing: number;
  promotions: number;
  markdown: number;
};
type ConfidenceInputs = {
  overall: number;
  benchmarkRelevance: number;
  dataQuality: number;
  assumptionStrength: number;
};
type AssumptionInputs = {
  elasticity: number;
  promoIncrementality: number;
  markdownRecovery: number;
};
type ActionCard = {
  id: string;
  title: string;
  lever: string;
  impactRange: string;
  effort: string;
  included: boolean;
  highlighted: boolean;
};
type CategoryScopeStatus = "included" | "excluded";
type CategoryScopeSelections = Partial<Record<string, CategoryScopeStatus>>;
type ScopeCategory = {
  id: string;
  name: string;
  source: "AI suggested" | "Manual override";
  reason: string;
  defaultStatus: CategoryScopeStatus;
};
type ScopeLever = {
  id: string;
  label: string;
};
type ScopeLeverGroup = {
  group: string;
  levers: ScopeLever[];
};
type RetailerScopeInputs = {
  annualRevenue: string;
  storeCount: string;
  retailerFormat: string;
  addressableRevenuePct: string;
  categories: ScopeCategory[];
  categorySelections: CategoryScopeSelections;
  selectedLeverIds: string[];
};
type RetailerCompetitor = {
  id: string;
  name: string;
  format: string;
  scale: string;
  relationship: string;
  pricePosition: string;
  reason: string;
  source: "AI suggested" | "Manual override";
};
type HeadlineCategory =
  | "Pricing"
  | "Promotions"
  | "Cost / Margin"
  | "Strategy"
  | "Operations";
type RetailerHeadline = {
  category: HeadlineCategory;
  title: string;
};
type FinancialDataPoint = {
  year: string;
  value: number;
};
type FinancialSeries = {
  label: string;
  unit: "currency" | "percent";
  values: FinancialDataPoint[];
};
type RetailerProfileSource = "external" | "uploaded_pdf";
type SourcedFinancialSeries = FinancialSeries & {
  source: RetailerProfileSource | null;
};
type SourcedProfitabilityMetric = {
  label: string;
  value: string | null;
  benchmark: string | null;
  note: string | null;
  source: RetailerProfileSource | null;
};
type SourcedPeerComparisonMetric = {
  label: string;
  company: number | null;
  peerMedian: number | null;
  unit: "percent";
  source: RetailerProfileSource | null;
};
type PeerMetricDetail = {
  name: string;
  value: number | null;
};
type PeerBenchmark = {
  benchmarkValue: number | null;
  details: PeerMetricDetail[];
  availableCount: number;
  totalCount: number;
  isSelectedSet: boolean;
  isLoading: boolean;
};
type SourcedRetailerHeadline = RetailerHeadline & {
  source: RetailerProfileSource;
  date?: string | null;
  publisher?: string | null;
  url?: string | null;
};
type RetailerProfile = {
  retailerName: string;
  financials: SourcedFinancialSeries[];
  profitability: SourcedProfitabilityMetric[];
  marketPosition: SourcedPeerComparisonMetric[];
  insights: string[];
  headlines: SourcedRetailerHeadline[];
  sources: Record<string, RetailerProfileSource>;
};
type SupplementalPdfStatus = {
  fileName: string;
  status: "Parsed" | "No fields found" | "Unable to parse";
};
type RetailerProfileApiResponse = {
  retailerName: string;
  ticker: string | null;
  financials: {
    revenue: FinancialDataPoint[];
    ebitda: FinancialDataPoint[];
    margin: FinancialDataPoint[];
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

const sectionCard =
  "brand-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";
const subCard =
  "brand-subcard rounded-xl border border-gray-200 bg-white p-3 shadow-sm";
const metricCard =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

const defaultRetailerRevenue = 10000000000;
const defaultAddressableRevenuePct = 60;
const createScopeCategory = (
  name: string,
  reason: string,
  defaultStatus: CategoryScopeStatus = "included",
  source: ScopeCategory["source"] = "AI suggested"
): ScopeCategory => ({
  id: `${source === "Manual override" ? "manual" : "ai"}-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`,
  name,
  source,
  reason,
  defaultStatus,
});
const fallbackScopeCategories: ScopeCategory[] = [
  createScopeCategory("Grocery", "Baseline retail category placeholder."),
  createScopeCategory("Household", "Baseline retail category placeholder."),
  createScopeCategory("Health & Beauty", "Baseline retail category placeholder."),
  createScopeCategory("Apparel", "Baseline retail category placeholder."),
  createScopeCategory("Electronics", "Baseline retail category placeholder.", "excluded"),
  createScopeCategory("Seasonal", "Baseline retail category placeholder."),
];
const normalizeCategorySelections = (
  categories: ScopeCategory[],
  previousSelections: CategoryScopeSelections = {}
): CategoryScopeSelections =>
  categories.reduce<CategoryScopeSelections>((selections, category) => {
    selections[category.name] =
      previousSelections[category.name] ?? category.defaultStatus;
    return selections;
  }, {});
const scopeLeverGroups: ScopeLeverGroup[] = [
  {
    group: "Pricing",
    levers: [
      { id: "price-architecture", label: "Price architecture" },
      { id: "kvis", label: "KVIs" },
      { id: "price-zoning", label: "Price zoning" },
    ],
  },
  {
    group: "Promotions",
    levers: [
      { id: "promo-density", label: "Promo density" },
      { id: "promo-effectiveness", label: "Promo effectiveness" },
    ],
  },
  {
    group: "Markdown",
    levers: [
      { id: "markdown-timing", label: "Markdown timing" },
      { id: "markdown-depth", label: "Markdown depth" },
    ],
  },
];
const initialRetailerScopeInputs: RetailerScopeInputs = {
  annualRevenue: "",
  storeCount: "",
  retailerFormat: "",
  addressableRevenuePct: String(defaultAddressableRevenuePct),
  categories: fallbackScopeCategories,
  categorySelections: normalizeCategorySelections(fallbackScopeCategories),
  selectedLeverIds: scopeLeverGroups.flatMap((group) =>
    group.levers.map((lever) => lever.id)
  ),
};

const parseCurrencyInput = (value: string, fallback: number) => {
  const parsedValue = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const parsePercentageInput = (value: string, fallback: number) => {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) return fallback;
  return Math.min(Math.max(parsedValue, 0), 100);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const parseBpsValue = (value: string) => {
  const parsedValue = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const formatSignedBps = (value: number) =>
  `${value >= 0 ? "+" : ""}${Math.round(value)} bps`;

const formatSignedPct = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const eprQuestions: { id: EprDimension; label: string }[] = [
  { id: "strategicPricePositioning", label: "Strategic Price Positioning" },
  { id: "priceArchitectureKvis", label: "Price Architecture & KVIs" },
  {
    id: "promotionsStrategyEffectiveness",
    label: "Promotions Strategy & Effectiveness",
  },
  { id: "promoPriceIntegration", label: "Promo & Price Integration" },
  {
    id: "markdownInventoryManagement",
    label: "Markdown & Inventory Management",
  },
  { id: "executionTools", label: "Execution & Tools" },
];

const contextFieldOptions: {
  id: keyof ClientStructuredContext;
  label: string;
  options: string[];
}[] = [
  {
    id: "pricingModel",
    label: "Pricing model",
    options: ["EDLP", "High-low", "Hybrid", "Other"],
  },
  {
    id: "promoIntensity",
    label: "Promo intensity",
    options: ["Low", "Medium", "High"],
  },
  {
    id: "channelMix",
    label: "Channel mix",
    options: ["Store", "Online", "Omnichannel"],
  },
  {
    id: "retailerFormat",
    label: "Retailer type or format",
    options: ["Grocery", "Mass", "Specialty", "Club", "Other"],
  },
  {
    id: "scopeSignal",
    label: "Scope signal",
    options: ["Enterprise", "Category", "Region", "Pilot"],
  },
];

const initialEprScores: EprScores = {
  strategicPricePositioning: 3,
  priceArchitectureKvis: 3,
  promotionsStrategyEffectiveness: 3,
  promoPriceIntegration: 3,
  markdownInventoryManagement: 3,
  executionTools: 3,
};

const initialStructuredContext: ClientStructuredContext = {
  pricingModel: "",
  promoIntensity: "",
  channelMix: "",
  retailerFormat: "",
  scopeSignal: "",
};
const categoryTemplates: Record<string, ScopeCategory[]> = {
  grocery: [
    createScopeCategory("Fresh grocery", "Core traffic-driving grocery category."),
    createScopeCategory("Center store", "Shelf-stable grocery categories with price perception impact."),
    createScopeCategory("Household essentials", "Comparable basket-building category for everyday value."),
    createScopeCategory("Health & beauty", "Margin-rich adjacent category with promo sensitivity."),
    createScopeCategory("General merchandise", "Adjacent cross-shop category.", "excluded"),
    createScopeCategory("Seasonal", "Event-driven category that may need separate treatment."),
  ],
  mass: [
    createScopeCategory("Grocery", "High-frequency category that anchors price perception."),
    createScopeCategory("Household essentials", "Everyday basket category with broad competitive overlap."),
    createScopeCategory("Health & beauty", "Core mass retail category with national-brand benchmarks."),
    createScopeCategory("Apparel", "Discretionary category with different pricing cadence."),
    createScopeCategory("Electronics", "High-comparison category that may require separate rules.", "excluded"),
    createScopeCategory("Seasonal", "Event-led assortment with promo and markdown relevance."),
  ],
  specialty: [
    createScopeCategory("Core category", "Primary specialty category for the diagnostic."),
    createScopeCategory("Accessories", "Attach-rate category with margin opportunity."),
    createScopeCategory("Premium assortment", "Higher-ticket products with price architecture relevance."),
    createScopeCategory("Entry price points", "Opening-price products that shape value perception."),
    createScopeCategory("Clearance / outlet", "Markdown-heavy category that may need distinct treatment.", "excluded"),
  ],
  club: [
    createScopeCategory("Bulk grocery", "High-volume club category with pack-size pricing logic."),
    createScopeCategory("Household essentials", "Large-pack category with strong value perception."),
    createScopeCategory("Fresh", "Traffic-driving category with quality and price signals."),
    createScopeCategory("General merchandise", "Cross-category club assortment with margin range."),
    createScopeCategory("Seasonal / treasure hunt", "Event and opportunistic buys that may be scoped separately."),
  ],
  other: fallbackScopeCategories,
};

const generateCategorySuggestions = ({
  retailerName,
  structuredContext,
  scopeInputs,
  uploadedClientData,
  additionalClientContext,
}: {
  retailerName: string;
  structuredContext: ClientStructuredContext;
  scopeInputs: RetailerScopeInputs;
  uploadedClientData: UploadedClientDataMetadata[];
  additionalClientContext: string;
}) => {
  const formatSignal =
    scopeInputs.retailerFormat || structuredContext.retailerFormat || "Other";
  const templateKey = inferCompetitorTemplateKey(
    formatSignal,
    `${retailerName} ${additionalClientContext}`
  );
  const pricingModel = structuredContext.pricingModel || "current pricing model";
  const scopeSignal = structuredContext.scopeSignal || "diagnostic scope";
  const contextSignal =
    uploadedClientData.length > 0
      ? "uploaded client context"
      : additionalClientContext.trim()
        ? "client context notes"
        : "format-based placeholders";

  return (categoryTemplates[templateKey] || categoryTemplates.other).map(
    (category) => ({
      ...category,
      id: `${category.id}-${pricingModel}-${scopeSignal}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      reason: `Suggested from ${formatSignal} format, ${pricingModel} pricing, ${scopeSignal.toLowerCase()} scope, and ${contextSignal}.`,
    })
  );
};

const createCompetitor = (
  name: string,
  format: string,
  scale: string,
  relationship: string,
  pricePosition: string,
  reason: string,
  source: RetailerCompetitor["source"] = "AI suggested"
): RetailerCompetitor => ({
  id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${format
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`,
  name,
  format,
  scale,
  relationship,
  pricePosition,
  reason,
  source,
});

type CompetitorCandidate = {
  name: string;
  formats: string[];
  sectors: string[];
  pricingSignals: string[];
  scale: string;
  geography: string;
  pricePosition: string;
  adjacency: "direct" | "adjacent";
};

const competitorCandidatePool: CompetitorCandidate[] = [
  {
    name: "Walmart",
    formats: ["mass", "grocery", "general merchandise"],
    sectors: ["mass", "food", "drug", "household"],
    pricingSignals: ["edlp", "value"],
    scale: "National",
    geography: "US",
    pricePosition: "Value / EDLP",
    adjacency: "direct",
  },
  {
    name: "Amazon",
    formats: ["marketplace", "digital", "mass"],
    sectors: ["mass", "apparel", "specialty", "electronics", "household"],
    pricingSignals: ["dynamic", "value"],
    scale: "National",
    geography: "US",
    pricePosition: "Dynamic / value",
    adjacency: "adjacent",
  },
  {
    name: "Costco",
    formats: ["club", "membership", "grocery", "mass"],
    sectors: ["club", "food", "household", "mass"],
    pricingSignals: ["value", "edlp"],
    scale: "National",
    geography: "US",
    pricePosition: "Value",
    adjacency: "adjacent",
  },
  {
    name: "Kroger",
    formats: ["grocery", "supermarket"],
    sectors: ["food", "drug", "grocery"],
    pricingSignals: ["high-low", "loyalty", "hybrid"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market",
    adjacency: "direct",
  },
  {
    name: "Albertsons",
    formats: ["grocery", "supermarket"],
    sectors: ["food", "drug", "grocery"],
    pricingSignals: ["high-low", "loyalty", "hybrid"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market",
    adjacency: "direct",
  },
  {
    name: "Meijer",
    formats: ["supercenter", "grocery", "mass"],
    sectors: ["food", "mass", "household"],
    pricingSignals: ["hybrid", "value"],
    scale: "Regional",
    geography: "Midwest",
    pricePosition: "Value / mid-market",
    adjacency: "direct",
  },
  {
    name: "Sprouts",
    formats: ["specialty grocery", "grocery"],
    sectors: ["food", "natural grocery", "specialty"],
    pricingSignals: ["high-low", "premium"],
    scale: "National",
    geography: "US",
    pricePosition: "Premium / specialty",
    adjacency: "adjacent",
  },
  {
    name: "Publix",
    formats: ["grocery", "supermarket"],
    sectors: ["food", "grocery"],
    pricingSignals: ["high-low", "premium"],
    scale: "Regional",
    geography: "Southeast",
    pricePosition: "Premium",
    adjacency: "direct",
  },
  {
    name: "Aldi",
    formats: ["discount grocery", "grocery"],
    sectors: ["food", "grocery", "discount"],
    pricingSignals: ["edlp", "value"],
    scale: "National",
    geography: "US",
    pricePosition: "Value",
    adjacency: "adjacent",
  },
  {
    name: "Nordstrom",
    formats: ["department store", "apparel", "specialty"],
    sectors: ["apparel", "fashion", "department store"],
    pricingSignals: ["premium", "high-low"],
    scale: "National",
    geography: "US",
    pricePosition: "Premium",
    adjacency: "direct",
  },
  {
    name: "Kohl's",
    formats: ["department store", "apparel"],
    sectors: ["apparel", "home", "department store"],
    pricingSignals: ["high-low", "promo"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market / promotional",
    adjacency: "direct",
  },
  {
    name: "Macy's",
    formats: ["department store", "apparel"],
    sectors: ["apparel", "fashion", "department store"],
    pricingSignals: ["high-low", "promo"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market",
    adjacency: "direct",
  },
  {
    name: "Best Buy",
    formats: ["specialty", "electronics"],
    sectors: ["electronics", "specialty"],
    pricingSignals: ["price match", "promo"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market",
    adjacency: "direct",
  },
  {
    name: "Home Depot",
    formats: ["home improvement", "specialty"],
    sectors: ["home", "hardlines", "specialty"],
    pricingSignals: ["edlp", "promo"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market / value",
    adjacency: "direct",
  },
  {
    name: "Lowe's",
    formats: ["home improvement", "specialty"],
    sectors: ["home", "hardlines", "specialty"],
    pricingSignals: ["edlp", "promo"],
    scale: "National",
    geography: "US",
    pricePosition: "Mid-market / value",
    adjacency: "direct",
  },
];

const getRetailerAttributeSignals = (
  retailerName: string,
  structuredContext: ClientStructuredContext,
  scopeInputs: RetailerScopeInputs,
  additionalClientContext: string
) => {
  const combinedContext = `${retailerName} ${structuredContext.retailerFormat} ${scopeInputs.retailerFormat} ${structuredContext.pricingModel} ${additionalClientContext}`.toLowerCase();
  const sectorSignals: string[] = [];
  const formatSignals: string[] = [];

  if (/(grocery|supermarket|food|fresh|natural|kroger|albertsons|publix|sprouts|aldi|meijer)/.test(combinedContext)) {
    sectorSignals.push("food", "grocery");
    formatSignals.push("grocery", "supermarket");
  }
  if (/(mass|general merchandise|supercenter|target|walmart)/.test(combinedContext)) {
    sectorSignals.push("mass", "household");
    formatSignals.push("mass", "general merchandise");
  }
  if (/(club|membership|warehouse|costco|sam)/.test(combinedContext)) {
    sectorSignals.push("club", "household");
    formatSignals.push("club", "membership");
  }
  if (/(apparel|fashion|department|macy|nordstrom|kohl)/.test(combinedContext)) {
    sectorSignals.push("apparel", "department store", "fashion");
    formatSignals.push("department store", "apparel");
  }
  if (/(electronics|best buy|technology)/.test(combinedContext)) {
    sectorSignals.push("electronics", "specialty");
    formatSignals.push("electronics", "specialty");
  }
  if (/(home improvement|hardlines|home depot|lowe)/.test(combinedContext)) {
    sectorSignals.push("home", "hardlines", "specialty");
    formatSignals.push("home improvement", "specialty");
  }
  if (/(specialty|premium)/.test(combinedContext)) {
    sectorSignals.push("specialty");
    formatSignals.push("specialty");
  }

  const pricingSignals = [
    structuredContext.pricingModel,
    /edlp|everyday low/.test(combinedContext) ? "edlp" : "",
    /high-low|promo|promotional/.test(combinedContext) ? "high-low" : "",
    /hybrid/.test(combinedContext) ? "hybrid" : "",
    /value|discount/.test(combinedContext) ? "value" : "",
    /premium/.test(combinedContext) ? "premium" : "",
  ]
    .map((signal) => signal.toLowerCase())
    .filter(Boolean);

  return {
    sectors: Array.from(new Set(sectorSignals.length > 0 ? sectorSignals : ["mass"])),
    formats: Array.from(new Set(formatSignals)),
    pricingSignals: Array.from(new Set(pricingSignals)),
    geography: /midwest|southeast|west|northeast|regional/.test(combinedContext)
      ? combinedContext
      : "US",
  };
};

const inferCompetitorTemplateKey = (
  retailerFormat: string,
  additionalContext: string
) => {
  const combinedContext = `${retailerFormat} ${additionalContext}`.toLowerCase();
  if (combinedContext.includes("grocery") || combinedContext.includes("fresh")) {
    return "grocery";
  }
  if (combinedContext.includes("mass") || combinedContext.includes("general")) {
    return "mass";
  }
  if (combinedContext.includes("club") || combinedContext.includes("membership")) {
    return "club";
  }
  if (combinedContext.includes("specialty")) {
    return "specialty";
  }
  return "other";
};

const generateCompetitorSuggestions = ({
  retailerName,
  structuredContext,
  scopeInputs,
  uploadedClientData,
  additionalClientContext,
}: {
  retailerName: string;
  structuredContext: ClientStructuredContext;
  scopeInputs: RetailerScopeInputs;
  uploadedClientData: UploadedClientDataMetadata[];
  additionalClientContext: string;
}) => {
  const formatSignal =
    scopeInputs.retailerFormat || structuredContext.retailerFormat || "Other";
  const pricingModel = structuredContext.pricingModel || "current pricing model";
  const scopeSignal = structuredContext.scopeSignal || "diagnostic scope";
  const contextSignal =
    uploadedClientData.length > 0
      ? "uploaded client context"
      : additionalClientContext.trim()
        ? "client context notes"
        : "format-based placeholders";
  const retailerNameNormalized = retailerName.trim().toLowerCase();
  const signals = getRetailerAttributeSignals(
    retailerName,
    structuredContext,
    scopeInputs,
    additionalClientContext
  );
  const scoredCandidates = competitorCandidatePool
    .filter(
      (candidate) => candidate.name.trim().toLowerCase() !== retailerNameNormalized
    )
    .map((candidate) => {
      const sectorScore = candidate.sectors.filter((sector) =>
        signals.sectors.includes(sector)
      ).length;
      const formatScore = candidate.formats.filter((format) =>
        signals.formats.includes(format)
      ).length;
      const pricingScore = candidate.pricingSignals.filter((pricingSignal) =>
        signals.pricingSignals.includes(pricingSignal)
      ).length;
      const geographyScore = signals.geography.includes(
        candidate.geography.toLowerCase()
      )
        ? 1
        : 0;
      const nationalScaleScore = candidate.scale === "National" ? 1 : 0;
      const adjacentScore = candidate.adjacency === "adjacent" ? 0.5 : 1;

      return {
        candidate,
        score:
          sectorScore * 4 +
          formatScore * 3 +
          pricingScore * 2 +
          geographyScore +
          nationalScaleScore +
          adjacentScore,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  return scoredCandidates.map(({ candidate, score }) =>
    createCompetitor(
      candidate.name,
      candidate.formats[0] || formatSignal,
      candidate.scale,
      candidate.adjacency === "direct"
        ? "Direct competitor"
        : "Adjacent competitor",
      candidate.pricePosition,
      `Selected by attribute scoring from ${formatSignal} format, ${pricingModel} pricing, ${signals.sectors.join(", ")} sector signals, ${scopeSignal.toLowerCase()} scope, and ${contextSignal}. Score: ${score.toFixed(1)}.`,
      "AI suggested"
    )
  );
};

const newsCategoryStyles: Record<HeadlineCategory, string> = {
  Pricing: "border-blue-200 bg-blue-50 text-blue-700",
  Promotions: "border-purple-200 bg-purple-50 text-purple-700",
  "Cost / Margin": "border-amber-200 bg-amber-50 text-amber-700",
  Strategy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Operations: "border-gray-200 bg-gray-100 text-gray-700",
};

const emptyRetailerFinancials = (): SourcedFinancialSeries[] => [
  { label: "Revenue", unit: "currency", values: [], source: null },
  { label: "EBITDA", unit: "currency", values: [], source: null },
  { label: "Margin", unit: "percent", values: [], source: null },
];

const emptyRetailerProfitability = (): SourcedProfitabilityMetric[] => [
  { label: "ROIC", value: null, benchmark: null, note: null, source: null },
  {
    label: "Working capital / revenue",
    value: null,
    benchmark: null,
    note: null,
    source: null,
  },
  { label: "Cost structure", value: null, benchmark: null, note: null, source: null },
];

const emptyRetailerMarketPosition = (): SourcedPeerComparisonMetric[] => [
  { label: "Revenue growth", company: null, peerMedian: null, unit: "percent", source: null },
  { label: "Margin", company: null, peerMedian: null, unit: "percent", source: null },
  { label: "TSR", company: null, peerMedian: null, unit: "percent", source: null },
];

const createEmptyRetailerProfile = (retailerName = ""): RetailerProfile => ({
  retailerName,
  financials: emptyRetailerFinancials(),
  profitability: emptyRetailerProfitability(),
  marketPosition: emptyRetailerMarketPosition(),
  insights: [],
  headlines: [],
  sources: {},
});

const hasFinancialValues = (series: SourcedFinancialSeries) =>
  series.values.length > 0;

const hasMetricValue = (metric: SourcedProfitabilityMetric) =>
  Boolean(metric.value);

const hasPeerMetricValue = (metric: SourcedPeerComparisonMetric) =>
  metric.company !== null || metric.peerMedian !== null;

const mergeByLabel = <T extends { label: string }>(
  fallbackItems: T[],
  priorityItems: T[],
  hasValue: (item: T) => boolean
) => {
  const labels = Array.from(
    new Set([
      ...fallbackItems.map((item) => item.label),
      ...priorityItems.map((item) => item.label),
    ])
  );

  return labels.map((label) => {
    const priorityItem = priorityItems.find((item) => item.label === label);
    const fallbackItem = fallbackItems.find((item) => item.label === label);

    if (priorityItem && hasValue(priorityItem)) return priorityItem;
    return fallbackItem || priorityItem;
  }) as T[];
};

const mergeRetailerProfiles = (
  externalProfile: RetailerProfile,
  uploadedProfile: RetailerProfile
): RetailerProfile => ({
  retailerName: uploadedProfile.retailerName || externalProfile.retailerName,
  financials: mergeByLabel(
    externalProfile.financials,
    uploadedProfile.financials,
    hasFinancialValues
  ),
  profitability: mergeByLabel(
    externalProfile.profitability,
    uploadedProfile.profitability,
    hasMetricValue
  ),
  marketPosition: mergeByLabel(
    externalProfile.marketPosition,
    uploadedProfile.marketPosition,
    hasPeerMetricValue
  ),
  insights:
    uploadedProfile.insights.length > 0
      ? uploadedProfile.insights
      : externalProfile.insights,
  headlines:
    uploadedProfile.headlines.length > 0
      ? uploadedProfile.headlines
      : externalProfile.headlines,
  sources: {
    ...externalProfile.sources,
    ...uploadedProfile.sources,
  },
});

const normalizeUploadedText = (text: string) =>
  text.replace(/\s+/g, " ").replace(/[^\x20-\x7E]/g, " ").trim();

const extractFirstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }

  return null;
};

const parseCurrencyToBillions = (rawValue: string | undefined) => {
  if (!rawValue) return null;
  const numericValue = Number(rawValue.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numericValue)) return null;
  const normalizedValue = rawValue.toLowerCase();

  if (/\b(million|mn|m)\b/.test(normalizedValue)) return numericValue / 1000;
  if (/\b(billion|bn|b)\b/.test(normalizedValue)) return numericValue;
  return null;
};

const parsePercentValue = (rawValue: string | undefined) => {
  if (!rawValue) return null;
  const numericValue = Number(rawValue.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatExtractedCurrency = (valueInBillions: number) =>
  `$${valueInBillions.toFixed(valueInBillions >= 10 ? 1 : 2)}B`;

const buildUploadedFinancialSeries = (
  label: string,
  unit: "currency" | "percent",
  value: number | null
): SourcedFinancialSeries => ({
  label,
  unit,
  values: value === null ? [] : [{ year: "Uploaded PDF", value }],
  source: value === null ? null : "uploaded_pdf",
});

const parseRetailerFactPackPdf = async (
  file: File,
  retailerName: string
): Promise<RetailerProfile> => {
  const emptyProfile = createEmptyRetailerProfile(retailerName);
  const rawText = await file.text().catch(() => "");
  const text = normalizeUploadedText(rawText);
  if (!text) return emptyProfile;

  const revenueMatch = extractFirstMatch(text, [
    /\brevenue\b.{0,80}?(\$?\s?\d+(?:\.\d+)?\s?(?:billion|bn|b|million|mn|m)\b)/i,
    /\bsales\b.{0,80}?(\$?\s?\d+(?:\.\d+)?\s?(?:billion|bn|b|million|mn|m)\b)/i,
  ]);
  const ebitdaMatch = extractFirstMatch(text, [
    /\bEBITDA\b.{0,80}?(\$?\s?\d+(?:\.\d+)?\s?(?:billion|bn|b|million|mn|m)\b)/i,
    /\bEBITA\b.{0,80}?(\$?\s?\d+(?:\.\d+)?\s?(?:billion|bn|b|million|mn|m)\b)/i,
  ]);
  const marginMatch = extractFirstMatch(text, [
    /\b(?:EBITDA|EBITA|operating)?\s*margin\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const roicMatch = extractFirstMatch(text, [
    /\bROIC\b.{0,80}?(\d+(?:\.\d+)?%)/i,
    /\breturn on invested capital\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const workingCapitalMatch = extractFirstMatch(text, [
    /\bworking capital\b.{0,80}?\brevenue\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const costStructureMatch = extractFirstMatch(text, [
    /\bcost structure\b.{0,80}?(\d+(?:\.\d+)?%)/i,
    /\bCOGS\b.{0,80}?(\d+(?:\.\d+)?%)/i,
    /\bSG&A\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const revenueGrowthPeerMatch = extractFirstMatch(text, [
    /\brevenue growth\b.{0,80}?(\d+(?:\.\d+)?%).{0,80}?\bpeer(?: median)?\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const marginPeerMatch = extractFirstMatch(text, [
    /\bmargin\b.{0,80}?(\d+(?:\.\d+)?%).{0,80}?\bpeer(?: median)?\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);
  const tsrPeerMatch = extractFirstMatch(text, [
    /\bTSR\b.{0,80}?(\d+(?:\.\d+)?%).{0,80}?\bpeer(?: median)?\b.{0,80}?(\d+(?:\.\d+)?%)/i,
  ]);

  const revenueValue = parseCurrencyToBillions(revenueMatch?.[1]);
  const ebitdaValue = parseCurrencyToBillions(ebitdaMatch?.[1]);
  const marginValue = parsePercentValue(marginMatch?.[1]);
  const roicValue = parsePercentValue(roicMatch?.[1]);
  const workingCapitalValue = parsePercentValue(workingCapitalMatch?.[1]);
  const costStructureValue = parsePercentValue(costStructureMatch?.[1]);
  const revenueGrowthValue = parsePercentValue(revenueGrowthPeerMatch?.[1]);
  const revenueGrowthPeerValue = parsePercentValue(revenueGrowthPeerMatch?.[2]);
  const marginPeerCompanyValue = parsePercentValue(marginPeerMatch?.[1]);
  const marginPeerMedianValue = parsePercentValue(marginPeerMatch?.[2]);
  const tsrValue = parsePercentValue(tsrPeerMatch?.[1]);
  const tsrPeerValue = parsePercentValue(tsrPeerMatch?.[2]);
  const extractedHeadlines = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) =>
      /\b(pric|promo|cost|margin|strateg|operat|peer|EBITDA|EBITA|ROIC)\w*/i.test(
        sentence
      )
    )
    .slice(0, 5)
    .map<SourcedRetailerHeadline>((sentence) => ({
      title: sentence.slice(0, 180),
      category: categorizeHeadline(sentence),
      source: "uploaded_pdf",
    }));

  const uploadedProfile: RetailerProfile = {
    ...emptyProfile,
    financials: [
      buildUploadedFinancialSeries("Revenue", "currency", revenueValue),
      buildUploadedFinancialSeries("EBITDA", "currency", ebitdaValue),
      buildUploadedFinancialSeries("Margin", "percent", marginValue),
    ],
    profitability: [
      {
        label: "ROIC",
        value: roicValue === null ? null : `${roicValue.toFixed(1)}%`,
        benchmark: null,
        note: "Extracted from uploaded retailer fact pack.",
        source: roicValue === null ? null : "uploaded_pdf",
      },
      {
        label: "Working capital / revenue",
        value:
          workingCapitalValue === null
            ? null
            : `${workingCapitalValue.toFixed(1)}%`,
        benchmark: null,
        note: "Extracted from uploaded retailer fact pack.",
        source: workingCapitalValue === null ? null : "uploaded_pdf",
      },
      {
        label: "Cost structure",
        value:
          costStructureValue === null ? null : `${costStructureValue.toFixed(1)}%`,
        benchmark: null,
        note: "Extracted from uploaded retailer fact pack.",
        source: costStructureValue === null ? null : "uploaded_pdf",
      },
    ],
    marketPosition: [
      {
        label: "Revenue growth",
        company: revenueGrowthValue,
        peerMedian: revenueGrowthPeerValue,
        unit: "percent",
        source:
          revenueGrowthValue === null && revenueGrowthPeerValue === null
            ? null
            : "uploaded_pdf",
      },
      {
        label: "Margin",
        company: marginPeerCompanyValue,
        peerMedian: marginPeerMedianValue,
        unit: "percent",
        source:
          marginPeerCompanyValue === null && marginPeerMedianValue === null
            ? null
            : "uploaded_pdf",
      },
      {
        label: "TSR",
        company: tsrValue,
        peerMedian: tsrPeerValue,
        unit: "percent",
        source: tsrValue === null && tsrPeerValue === null ? null : "uploaded_pdf",
      },
    ],
    insights: [
      ...(revenueValue === null ? [] : [`Revenue: ${formatExtractedCurrency(revenueValue)}`]),
      ...(ebitdaValue === null ? [] : [`EBITDA / EBITA: ${formatExtractedCurrency(ebitdaValue)}`]),
      ...(marginValue === null ? [] : [`Margin: ${marginValue.toFixed(1)}%`]),
      ...(roicValue === null ? [] : [`ROIC: ${roicValue.toFixed(1)}%`]),
      ...(costStructureValue === null ? [] : [`Cost structure: ${costStructureValue.toFixed(1)}%`]),
    ],
    headlines: extractedHeadlines,
    sources: {},
  };

  uploadedProfile.financials.forEach((series) => {
    if (series.source) uploadedProfile.sources[`financials.${series.label}`] = series.source;
  });
  uploadedProfile.profitability.forEach((metric) => {
    if (metric.source) uploadedProfile.sources[`profitability.${metric.label}`] = metric.source;
  });
  uploadedProfile.marketPosition.forEach((metric) => {
    if (metric.source) uploadedProfile.sources[`marketPosition.${metric.label}`] = metric.source;
  });
  if (uploadedProfile.headlines.length > 0) {
    uploadedProfile.sources.headlines = "uploaded_pdf";
  }

  return uploadedProfile;
};

const categorizeHeadline = (headline: string): HeadlineCategory => {
  const normalizedHeadline = headline.toLowerCase();
  if (normalizedHeadline.includes("promo") || normalizedHeadline.includes("discount")) {
    return "Promotions";
  }
  if (normalizedHeadline.includes("cost") || normalizedHeadline.includes("margin")) {
    return "Cost / Margin";
  }
  if (normalizedHeadline.includes("strateg") || normalizedHeadline.includes("growth")) {
    return "Strategy";
  }
  if (normalizedHeadline.includes("operat") || normalizedHeadline.includes("supply")) {
    return "Operations";
  }
  return "Pricing";
};

const normalizeHeadlineCategory = (
  category: string | null | undefined,
  title: string
): HeadlineCategory => {
  const validCategories: HeadlineCategory[] = [
    "Pricing",
    "Promotions",
    "Cost / Margin",
    "Strategy",
    "Operations",
  ];

  return validCategories.includes(category as HeadlineCategory)
    ? (category as HeadlineCategory)
    : categorizeHeadline(title);
};

const formatPercentMetric = (value: number | null) =>
  value === null ? null : `${value.toFixed(1)}%`;

const buildExternalFinancialSeries = (
  label: string,
  unit: "currency" | "percent",
  values: FinancialDataPoint[]
): SourcedFinancialSeries => ({
  label,
  unit,
  values,
  source: values.length > 0 ? "external" : null,
});

const getLatestRevenueDollars = (profile: RetailerProfile) => {
  const revenueSeries = profile.financials.find(
    (series) => series.label === "Revenue"
  );
  const latestRevenuePoint =
    revenueSeries?.values[revenueSeries.values.length - 1];

  return typeof latestRevenuePoint?.value === "number"
    ? latestRevenuePoint.value * 1000000000
    : null;
};

const getEffectiveAnnualRevenueInput = (
  scopeInputs: RetailerScopeInputs,
  sourcedRevenueDollars: number | null
) => {
  if (scopeInputs.annualRevenue.trim()) return scopeInputs.annualRevenue;
  if (sourcedRevenueDollars) return String(Math.round(sourcedRevenueDollars));
  return "";
};

const calculateMedian = (values: number[]) => {
  if (values.length === 0) return null;
  const sortedValues = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? ((sortedValues[midpoint - 1] || 0) + (sortedValues[midpoint] || 0)) / 2
    : sortedValues[midpoint] || null;
};

const getMarketMetricValue = (profile: RetailerProfile | null, label: string) =>
  profile?.marketPosition.find((metric) => metric.label === label)?.company ??
  null;

const buildPeerBenchmark = ({
  metric,
  competitors,
  peerProfiles,
  isLoading,
}: {
  metric: SourcedPeerComparisonMetric;
  competitors: RetailerCompetitor[];
  peerProfiles: Record<string, RetailerProfile | null>;
  isLoading: boolean;
}): PeerBenchmark => {
  if (competitors.length === 0) {
    return {
      benchmarkValue: metric.peerMedian,
      details: [],
      availableCount: metric.peerMedian === null ? 0 : 1,
      totalCount: 0,
      isSelectedSet: false,
      isLoading: false,
    };
  }

  const details = competitors.map((competitor) => ({
    name: competitor.name,
    value: getMarketMetricValue(peerProfiles[competitor.name] || null, metric.label),
  }));
  const availableValues = details.flatMap((detail) =>
    detail.value === null ? [] : [detail.value]
  );

  return {
    benchmarkValue:
      availableValues.length > 0 ? calculateMedian(availableValues) : metric.peerMedian,
    details,
    availableCount: availableValues.length,
    totalCount: competitors.length,
    isSelectedSet: true,
    isLoading,
  };
};

const mapApiResponseToRetailerProfile = (
  response: RetailerProfileApiResponse,
  fallbackRetailerName: string
): RetailerProfile => {
  const retailerName = response.retailerName || fallbackRetailerName;
  const tickerNote = response.ticker ? `Ticker: ${response.ticker}` : null;
  const latestRevenue =
    response.financials.revenue[response.financials.revenue.length - 1];
  const latestEbitda =
    response.financials.ebitda[response.financials.ebitda.length - 1];
  const latestMargin =
    response.financials.margin[response.financials.margin.length - 1];
  const insights = [
    tickerNote,
    latestRevenue
      ? `Latest revenue: $${latestRevenue.value.toFixed(1)}B (${latestRevenue.year})`
      : null,
    latestEbitda
      ? `Latest EBITDA: $${latestEbitda.value.toFixed(1)}B (${latestEbitda.year})`
      : null,
    latestMargin
      ? `Latest EBITDA margin: ${latestMargin.value.toFixed(1)}% (${latestMargin.year})`
      : null,
  ].filter((insight): insight is string => Boolean(insight));

  return {
    retailerName,
    financials: [
      buildExternalFinancialSeries(
        "Revenue",
        "currency",
        response.financials.revenue || []
      ),
      buildExternalFinancialSeries(
        "EBITDA",
        "currency",
        response.financials.ebitda || []
      ),
      buildExternalFinancialSeries(
        "Margin",
        "percent",
        response.financials.margin || []
      ),
    ],
    profitability: [
      {
        label: "ROIC",
        value: formatPercentMetric(response.profitability.roic),
        benchmark: null,
        note: response.profitability.roic === null ? null : "From FMP ratios.",
        source: response.profitability.roic === null ? null : "external",
      },
      {
        label: "Working capital / revenue",
        value: formatPercentMetric(response.profitability.workingCapital),
        benchmark: null,
        note:
          response.profitability.workingCapital === null
            ? null
            : "From FMP working capital ratio data.",
        source:
          response.profitability.workingCapital === null ? null : "external",
      },
      {
        label: "Cost structure",
        value: null,
        benchmark: null,
        note: null,
        source: null,
      },
    ],
    marketPosition: [
      {
        label: "Revenue growth",
        company: response.market.revenueGrowth,
        peerMedian: null,
        unit: "percent",
        source: response.market.revenueGrowth === null ? null : "external",
      },
      {
        label: "Margin",
        company: response.market.margin,
        peerMedian: null,
        unit: "percent",
        source: response.market.margin === null ? null : "external",
      },
      {
        label: "TSR",
        company: response.market.tsr ?? null,
        peerMedian: null,
        unit: "percent",
        source: response.market.tsr === null || response.market.tsr === undefined ? null : "external",
      },
    ],
    insights,
    headlines: (response.headlines || []).map((headline) => ({
      title: headline.title,
      date: headline.date,
      publisher: headline.source,
      url: headline.url || null,
      category: normalizeHeadlineCategory(headline.category, headline.title),
      source: "external",
    })),
    sources: {
      ...(response.financials.revenue.length > 0
        ? { "financials.Revenue": "external" as const }
        : {}),
      ...(response.financials.ebitda.length > 0
        ? { "financials.EBITDA": "external" as const }
        : {}),
      ...(response.financials.margin.length > 0
        ? { "financials.Margin": "external" as const }
        : {}),
      ...(response.profitability.roic === null
        ? {}
        : { "profitability.ROIC": "external" as const }),
      ...(response.profitability.workingCapital === null
        ? {}
        : { "profitability.Working capital / revenue": "external" as const }),
      ...(response.market.revenueGrowth === null
        ? {}
        : { "marketPosition.Revenue growth": "external" as const }),
      ...(response.market.margin === null
        ? {}
        : { "marketPosition.Margin": "external" as const }),
      ...(response.market.tsr === null || response.market.tsr === undefined
        ? {}
        : { "marketPosition.TSR": "external" as const }),
      ...(response.headlines.length > 0 ? { headlines: "external" as const } : {}),
    },
  };
};

const fetchRetailerData = async (retailerName: string): Promise<RetailerProfile> => {
  const response = await fetch(
    `/api/retailer-profile?retailerName=${encodeURIComponent(retailerName)}`
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || "Unable to fetch retailer profile");
  }

  const externalProfile = (await response.json()) as RetailerProfileApiResponse;
  return mapApiResponseToRetailerProfile(externalProfile, retailerName);
};

const getEprMaturityLabel = (score: number) => {
  if (score >= 4.25) return "Advanced";
  if (score >= 2.75) return "Developing";
  return "Underdeveloped";
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [activeOverviewTab, setActiveOverviewTab] =
    useState<OverviewTab>("prompts");
  const [retailerInput, setRetailerInput] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState("Retailer");
  const [retailerProfile, setRetailerProfile] = useState<RetailerProfile>(() =>
    createEmptyRetailerProfile("Retailer")
  );
  const [retailerProfileError, setRetailerProfileError] = useState<string | null>(
    null
  );
  const [supplementalPdfStatus, setSupplementalPdfStatus] =
    useState<SupplementalPdfStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [eprScores, setEprScores] = useState<EprScores>(initialEprScores);
  const [additionalClientContext, setAdditionalClientContext] = useState("");
  const [structuredClientContext, setStructuredClientContext] =
    useState<ClientStructuredContext>(initialStructuredContext);
  const analysisMode: AnalysisMode = "hybrid";
  const [uploadedClientData, setUploadedClientData] = useState<
    UploadedClientDataMetadata[]
  >([]);
  const [retailerScopeInputs, setRetailerScopeInputs] =
    useState<RetailerScopeInputs>(initialRetailerScopeInputs);
  const [categoryListManuallyEdited, setCategoryListManuallyEdited] =
    useState(false);
  const [retailerCompetitors, setRetailerCompetitors] = useState<
    RetailerCompetitor[]
  >(() =>
    generateCompetitorSuggestions({
      retailerName: "Retailer",
      structuredContext: initialStructuredContext,
      scopeInputs: initialRetailerScopeInputs,
      uploadedClientData: [],
      additionalClientContext: "",
    })
  );
  const [competitorsManuallyEdited, setCompetitorsManuallyEdited] =
    useState(false);

  const eprAverageScore =
    eprQuestions.reduce((total, question) => total + eprScores[question.id], 0) /
    eprQuestions.length;
  const clientContext: ClientContext = {
    eprScores,
    eprAverageScore,
    eprMaturityLabel: getEprMaturityLabel(eprAverageScore),
    additionalContext: additionalClientContext,
    structuredContext: structuredClientContext,
    uploadedClientData,
  };

  useEffect(() => {
    if (categoryListManuallyEdited) return;

    setRetailerScopeInputs((currentScopeInputs: RetailerScopeInputs) => {
      const generatedCategories = generateCategorySuggestions({
        retailerName: selectedRetailer,
        structuredContext: structuredClientContext,
        scopeInputs: currentScopeInputs,
        uploadedClientData,
        additionalClientContext,
      });

      return {
        ...currentScopeInputs,
        categories: generatedCategories,
        categorySelections: normalizeCategorySelections(
          generatedCategories,
          currentScopeInputs.categorySelections
        ),
      };
    });
  }, [
    additionalClientContext,
    categoryListManuallyEdited,
    retailerScopeInputs.retailerFormat,
    selectedRetailer,
    structuredClientContext.pricingModel,
    structuredClientContext.retailerFormat,
    structuredClientContext.scopeSignal,
    uploadedClientData,
  ]);

  useEffect(() => {
    if (competitorsManuallyEdited) return;

    setRetailerCompetitors(
      generateCompetitorSuggestions({
        retailerName: selectedRetailer,
        structuredContext: structuredClientContext,
        scopeInputs: retailerScopeInputs,
        uploadedClientData,
        additionalClientContext,
      })
    );
  }, [
    additionalClientContext,
    competitorsManuallyEdited,
    retailerScopeInputs.retailerFormat,
    selectedRetailer,
    structuredClientContext.pricingModel,
    structuredClientContext.retailerFormat,
    structuredClientContext.scopeSignal,
    uploadedClientData,
  ]);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    setUploadedClientData(
      Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || "Unknown",
        lastModified: file.lastModified,
        status: "Uploaded",
      }))
    );
  };

  const clearFiles = () => {
    setUploadedClientData([]);
  };

  const confirmRetailerInput = async (nameInput: string) => {
    const retailerName = nameInput.trim();
    if (!retailerName) return;

    setSelectedRetailer(retailerName);
    setRetailerProfileError(null);
    setIsLoading(true);
    try {
      const externalProfile = await fetchRetailerData(retailerName);
      setRetailerProfile(externalProfile);
      setSupplementalPdfStatus(null);
    } catch (error) {
      setRetailerProfile(createEmptyRetailerProfile(retailerName));
      setRetailerProfileError(
        error instanceof Error
          ? error.message
          : "Unable to fetch retailer profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSupplementalPdfUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const retailerName = retailerProfile.retailerName || selectedRetailer;
    try {
      const uploadedProfile = await parseRetailerFactPackPdf(file, retailerName);
      const hasUploadedData =
        uploadedProfile.financials.some(hasFinancialValues) ||
        uploadedProfile.profitability.some(hasMetricValue) ||
        uploadedProfile.marketPosition.some(hasPeerMetricValue) ||
        uploadedProfile.headlines.length > 0 ||
        uploadedProfile.insights.length > 0;

      setRetailerProfile((currentProfile) =>
        mergeRetailerProfiles(currentProfile, uploadedProfile)
      );
      setSupplementalPdfStatus({
        fileName: file.name,
        status: hasUploadedData ? "Parsed" : "No fields found",
      });
    } catch {
      setSupplementalPdfStatus({
        fileName: file.name,
        status: "Unable to parse",
      });
    }
  };

const mockInputs = {
  revenue: 10000000000,
  priceVariancePct: 4.5,
  kviCoveragePct: 32,
  promoIntensityPct: 38,
  zoneVariancePct: 1.2,
  markdownDepthPct: 37,
  markdownTiming: "late" as const,
};

const opportunity = estimateOpportunity(mockInputs);
const sourcedRetailerRevenue = getLatestRevenueDollars(retailerProfile);
const effectiveRetailerScopeInputs: RetailerScopeInputs = {
  ...retailerScopeInputs,
  annualRevenue: getEffectiveAnnualRevenueInput(
    retailerScopeInputs,
    sourcedRetailerRevenue
  ),
};

  const activeWorkflowStep =
    activeTab !== "overview"
      ? "Analysis"
      : activeOverviewTab === "retailer" ||
          activeOverviewTab === "retailerOverview"
        ? "Context"
        : activeOverviewTab === "opportunity"
          ? "Opportunity"
          : "Setup";

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-6 text-[var(--ui-text)]">
      <div className="mx-auto max-w-[1200px] space-y-5">
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Diagnostic Flow
            </p>
            <div className="mt-4 space-y-1">
              {["Setup", "Context", "Analysis", "Opportunity"].map(
                (step) => (
                  <div
                    key={step}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      activeWorkflowStep === step
                        ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-navy)]"
                        : "border-transparent text-gray-500"
                    }`}
                  >
                    {step}
                  </div>
                )
              )}
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                History
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Latest run:{" "}
                {retailerProfileError
                  ? "Error"
                  : isLoading
                    ? "In progress"
                    : "Ready"}
              </p>
            </div>
          </aside>

          <main className="space-y-5">
            <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h1 className="brand-heading text-3xl font-bold tracking-tight text-[var(--ui-navy)]">
                    Retail Pricing Diagnostic
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Analyze pricing, promotions, and markdown opportunity using public signals.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-4 lg:min-w-[520px]">
                  {[
                    { label: "Retailer", value: selectedRetailer },
                    { label: "Scope", value: "All categories" },
                    {
                      label: "Mode",
                      value: analysisMode === "hybrid" ? "With client data" : "External",
                    },
                    {
                      label: "Status",
                      value: retailerProfileError
                        ? "Error"
                        : isLoading
                          ? "Running"
                          : "Ready",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                        {item.label}
                      </p>
                      <p className="mt-0.5 truncate font-semibold text-[var(--ui-text)]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </header>

            <div className="flex gap-5 border-b border-gray-200">
              {[
                ["overview", "Overview"],
                ["pricing", "Pricing"],
                ["promotions", "Promotions"],
                ["markdown", "Markdown"],
              ].map(([tabId, label]) => (
                <button
                  key={tabId}
                  onClick={() => setActiveTab(tabId as Tab)}
                  className={`border-b-2 px-1 pb-2.5 text-sm font-semibold transition ${
                    activeTab === tabId
                      ? "border-[var(--ui-blue)] text-[var(--ui-navy)]"
                      : "border-transparent text-gray-500 hover:text-[var(--ui-navy)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <>
                {isLoading ? (
                  <section className="brand-card space-y-6 rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[var(--ui-blue)]" />
                      <h2 className="text-xl font-semibold tracking-tight text-[var(--ui-navy)]">
                        Fetching external data for {selectedRetailer}...
                      </h2>
                    </div>

                    <div className="space-y-3 text-sm text-gray-600">
                      <p>✓ Resolving retailer ticker</p>
                      <p>✓ Fetching FMP income statement</p>
                      <p>✓ Fetching FMP ratios and growth metrics</p>
                      <p>✓ Fetching recent headlines</p>
                      <p className="font-semibold text-[var(--ui-blue)]">
                        → Normalizing retailer profile
                      </p>
                    </div>
                  </section>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-3 shadow-sm">
                      <div className="flex flex-wrap gap-5 border-b border-gray-200">
                        {[
                          ["prompts", "Client Context"],
                          ["retailer", "Scope of Diagnostic"],
                          ["retailerOverview", "Retailer Overview"],
                          ["opportunity", "Opportunity Size"],
                        ].map(([tabId, label]) => (
                          <button
                            key={tabId}
                            type="button"
                            onClick={() =>
                              setActiveOverviewTab(tabId as OverviewTab)
                            }
                            className={`border-b-2 px-1 pb-3 text-sm font-semibold transition ${
                              activeOverviewTab === tabId
                                ? "border-[var(--ui-blue)] text-[var(--ui-navy)]"
                                : "border-transparent text-gray-500 hover:text-[var(--ui-navy)]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeOverviewTab === "prompts" && (
                      <PromptsSection
                        retailerInput={retailerInput}
                        setRetailerInput={setRetailerInput}
                        confirmRetailerInput={confirmRetailerInput}
                        eprScores={eprScores}
                        setEprScores={setEprScores}
                        clientContext={clientContext}
                        additionalClientContext={additionalClientContext}
                        setAdditionalClientContext={setAdditionalClientContext}
                        structuredClientContext={structuredClientContext}
                        setStructuredClientContext={setStructuredClientContext}
                        uploadedClientData={uploadedClientData}
                        handleFileUpload={handleFileUpload}
                        clearFiles={clearFiles}
                      />
                    )}

                    {activeOverviewTab === "retailer" && (
                      <ScopeOfDiagnosticSection
                        selectedRetailer={selectedRetailer}
                        clientContext={clientContext}
                        scopeInputs={retailerScopeInputs}
                        setScopeInputs={setRetailerScopeInputs}
                        sourcedRetailerRevenue={sourcedRetailerRevenue}
                        setCategoryListManuallyEdited={
                          setCategoryListManuallyEdited
                        }
                        competitors={retailerCompetitors}
                        setCompetitors={setRetailerCompetitors}
                        competitorsManuallyEdited={competitorsManuallyEdited}
                        setCompetitorsManuallyEdited={
                          setCompetitorsManuallyEdited
                        }
                      />
                    )}

                    {activeOverviewTab === "retailerOverview" && (
                      <RetailerOverviewSection
                        retailerProfile={retailerProfile}
                        competitors={retailerCompetitors}
                        handleSupplementalPdfUpload={handleSupplementalPdfUpload}
                        supplementalPdfStatus={supplementalPdfStatus}
                        retailerProfileError={retailerProfileError}
                      />
                    )}

                    {activeOverviewTab === "opportunity" && (
                      <OpportunitySection
                        opportunity={opportunity}
                        analysisMode={analysisMode}
                        scopeInputs={effectiveRetailerScopeInputs}
                        clientContext={clientContext}
                      />
                    )}
                  </div>
                )}
              </>
            )}

      {activeTab === "pricing" && (
        <div className="space-y-5">
          <section className={sectionCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Pricing diagnostic
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
              Pricing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Diagnose price position, KVI structure, price-pack architecture, and pricing ladder gaps.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { value: "Mid-tier", label: "Position" },
              { value: "Compressed", label: "Ladder" },
              { value: "+15–40 bps", label: "Margin opportunity" },
            ].map((item) => (
              <div key={item.label} className={metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-blue)]">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Current State</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Position: Mid-tier</p>
                <p>Ladder: Compressed</p>
                <p>Competitiveness: Mixed</p>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Opportunity</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Revenue: <span className="font-semibold text-[var(--ui-blue)]">+0.5%–1.5%</span></p>
                <p>Margin: <span className="font-semibold text-[var(--ui-blue)]">+15–40 bps</span></p>
                <p>Unit Impact: Flat to +0.5%</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">KVI Structure</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>KVIs priced competitively</p>
                <p>Over-investment in some categories</p>
                <p>Under-monetization of non-KVIs</p>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Price-Pack Architecture</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Missing mid-tier packs</p>
                <p>Inconsistent price-per-unit scaling</p>
                <p>Limited trade-up pathways</p>
              </div>
            </div>
          </section>

          <section className={sectionCard}>
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Embedded Analysis</h3>
            <div className="space-y-6">
              <PricingLadderModule />
              <PriceZoneModule />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Introduce mid-tier packs</div>
                <div className={subCard}>Normalize price-per-unit logic</div>
                <div className={subCard}>Improve zone differentiation</div>
                <div className={subCard}>Increase non-KVI price capture</div>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Data Requests</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>• Elasticities by category</p>
                <p>• Price zones and rules</p>
                <p>• Pack-level sales mix</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-5">
          <section className={sectionCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Promotions diagnostic
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
              Promotions
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Diagnose promo intensity, incrementality, vehicle mix, and KVI alignment.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { value: "High", label: "Promo intensity" },
              { value: "+25–70 bps", label: "Margin opportunity" },
              { value: "Flat–+0.8%", label: "Unit impact" },
            ].map((item) => (
              <div key={item.label} className={metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-blue)]">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Current State</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Promo intensity: High</p>
                <p>Discount depth: Moderate to deep</p>
                <p>Dependency: High</p>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Opportunity</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Revenue: <span className="font-semibold text-[var(--ui-blue)]">+0.8%–2.0%</span></p>
                <p>Margin: <span className="font-semibold text-[var(--ui-blue)]">+25–70 bps</span></p>
                <p>Unit Impact: Flat to +0.8%</p>
              </div>
            </div>
          </section>

          <section className={sectionCard}>
            <h3 className="mb-3 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">KVI Alignment</h3>
            <div className="space-y-2 text-sm leading-6 text-gray-600">
              <p>KVIs over-promoted</p>
              <p>Non-KVIs under-monetized</p>
              <p>Promo mix should be more selective</p>
            </div>
          </section>

          <section className={sectionCard}>
            <PromoCalendarModule />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Reduce promo frequency</div>
                <div className={subCard}>Shift to event-based promotions</div>
                <div className={subCard}>Protect KVI pricing</div>
                <div className={subCard}>Use multi-buy to drive trade-up</div>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Data Requests</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>• Incremental promo lift data</p>
                <p>• Promo calendar</p>
                <p>• Vehicle-level performance</p>
                <p>• Vendor funding structure</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "markdown" && (
        <div className="space-y-5">
          <section className={sectionCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Markdown diagnostic
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
              Markdown
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Diagnose markdown timing, discount depth, sell-through, and inventory efficiency.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { value: "Late", label: "Timing" },
              { value: "+10–35 bps", label: "Margin opportunity" },
              { value: "Improved turns", label: "Inventory impact" },
            ].map((item) => (
              <div key={item.label} className={metricCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-blue)]">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Current State</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Sell-through: Mixed</p>
                <p>Timing: Late</p>
                <p>Discount depth: Deep</p>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Opportunity</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Revenue: <span className="font-semibold text-[var(--ui-blue)]">+0.2%–0.8%</span></p>
                <p>Margin: <span className="font-semibold text-[var(--ui-blue)]">+10–35 bps</span></p>
                <p>Inventory: Improved turns</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">KVI Interaction</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Occasional markdowns on KVIs</p>
                <p>Risk to price perception</p>
                <p>Need more discipline on what gets cleared and when</p>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Price-Pack Impact</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>Large packs driving markdown risk</p>
                <p>Too many slow-moving SKUs</p>
                <p>Pack rationalization could reduce clearance pressure</p>
              </div>
            </div>
          </section>

          <section className={sectionCard}>
            <MarkdownModule />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Earlier targeted markdowns</div>
                <div className={subCard}>Reduce deep clearance discounting</div>
                <div className={subCard}>Rationalize pack assortment</div>
              </div>
            </div>

            <div className={`${sectionCard} space-y-3`}>
              <h3 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Data Requests</h3>
              <div className="space-y-2 text-sm leading-6 text-gray-600">
                <p>• Inventory aging</p>
                <p>• Sell-through by SKU</p>
                <p>• Markdown policies</p>
                <p>• Clearance timing by pack</p>
              </div>
            </div>
          </section>
        </div>
      )}
          </main>
        </div>
      </div>
    </div>
  );
}

function PromptsSection({
  retailerInput,
  setRetailerInput,
  confirmRetailerInput,
  eprScores,
  setEprScores,
  clientContext,
  additionalClientContext,
  setAdditionalClientContext,
  structuredClientContext,
  setStructuredClientContext,
  uploadedClientData,
  handleFileUpload,
  clearFiles,
}: {
  retailerInput: string;
  setRetailerInput: (value: string) => void;
  confirmRetailerInput: (value: string) => void;
  eprScores: EprScores;
  setEprScores: (value: EprScores) => void;
  clientContext: ClientContext;
  additionalClientContext: string;
  setAdditionalClientContext: (value: string) => void;
  structuredClientContext: ClientStructuredContext;
  setStructuredClientContext: (value: ClientStructuredContext) => void;
  uploadedClientData: UploadedClientDataMetadata[];
  handleFileUpload: (files: FileList | null) => void;
  clearFiles: () => void;
}) {
  const hasRequiredClientUpload = uploadedClientData.length > 0;
  const canPopulateRetailer = retailerInput.trim().length > 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Retailer input
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <input
                value={retailerInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRetailerInput(e.target.value)
                }
                onBlur={() => confirmRetailerInput(retailerInput)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmRetailerInput(retailerInput);
                  }
                }}
                placeholder="Enter retailer name"
                className="w-80 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                disabled={!canPopulateRetailer}
                onClick={() => confirmRetailerInput(retailerInput)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  canPopulateRetailer
                    ? "bg-[var(--ui-blue)] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                Populate retailer data
              </button>
            </div>
            <p className="text-xs leading-5 text-gray-500">
              Confirming the retailer name fetches external data for Retailer Overview. Client uploads are optional for this trigger.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className={`${sectionCard} space-y-4`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Client context
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-navy)]">
                EPR scoring
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-gray-600">
                Score the retailer across the six EPR dimensions.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                Current maturity
              </p>
              <p className="mt-1 font-semibold text-[var(--ui-navy)]">
                {clientContext.eprMaturityLabel} (
                {clientContext.eprAverageScore.toFixed(1)}/5)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {eprQuestions.map((question) => (
              <div
                key={question.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <p className="text-sm font-semibold text-[var(--ui-text)]">
                  {question.label}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() =>
                        setEprScores({ ...eprScores, [question.id]: score })
                      }
                      className={`min-w-9 rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition ${
                        eprScores[question.id] === score
                          ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-blue)]"
                          : "border-gray-200 bg-white text-gray-600 hover:border-[var(--ui-blue)]"
                      }`}
                      aria-label={`${question.label}: ${score}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 border-t border-gray-200 pt-3 text-xs font-medium text-gray-500 sm:grid-cols-3">
            <p>1 = Underdeveloped</p>
            <p>3 = Developing</p>
            <p>5 = Advanced</p>
          </div>
        </div>

        <div className={`${sectionCard} space-y-4`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Client Context Inputs
            </p>
            <p className="mt-1.5 text-sm leading-6 text-gray-600">
              Capture client-specific nuance and upload supporting data for the next diagnostic step.
            </p>
          </div>

          <textarea
            value={additionalClientContext}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setAdditionalClientContext(e.target.value)
            }
            placeholder="Pricing posture (EDLP, high-low, hybrid), promo posture, category mix or scope notes, channel mix, known constraints, recent changes, and any retailer-specific nuances that should affect the diagnostic."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
            rows={4}
          />

          <div className="space-y-4 border-y border-gray-200 py-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                  Client data upload
                </p>
                <p className="mt-1.5 text-sm leading-6 text-gray-600">
                  Required. Upload files that contain retailer, pricing, promo, markdown, category, or other client inputs.
                </p>
              </div>

              <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                {uploadedClientData.length > 0
                  ? "Upload complete"
                  : "Required upload"}
              </div>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-6 text-center transition hover:border-[var(--ui-blue)] hover:bg-white">
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf,.ppt,.pptx,.doc,.docx,.txt,.json"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleFileUpload(e.target.files)
                }
              />
              <p className="font-medium text-[var(--ui-text)]">
                Drop files here or browse
              </p>
              <p className="mt-1 text-xs text-gray-500">
                CSV, Excel, PDF, PowerPoint, or other client source files
              </p>
            </label>

            {uploadedClientData.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <span className="font-semibold text-[var(--ui-text)]">
                    Uploaded {uploadedClientData.length} file
                    {uploadedClientData.length === 1 ? "" : "s"}
                  </span>
                  {" "}for client context capture.
                </div>

                <div className="space-y-2">
                  {uploadedClientData.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-[var(--ui-text)]">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">{file.status}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        <p>{file.type}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={clearFiles}
                  className="text-sm font-medium text-[var(--ui-blue)]"
                >
                  Clear files
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {contextFieldOptions.map((field) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <p className="text-sm font-semibold text-[var(--ui-text)]">
                  {field.label}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {field.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setStructuredClientContext({
                          ...structuredClientContext,
                          [field.id]: option,
                        })
                      }
                      className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition ${
                        structuredClientContext[field.id] === option
                          ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-blue)]"
                          : "border-gray-200 bg-white text-gray-600 hover:border-[var(--ui-blue)]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

function ScopeOfDiagnosticSection({
  selectedRetailer,
  clientContext,
  scopeInputs,
  setScopeInputs,
  sourcedRetailerRevenue,
  setCategoryListManuallyEdited,
  competitors,
  setCompetitors,
  competitorsManuallyEdited,
  setCompetitorsManuallyEdited,
}: {
  selectedRetailer: string;
  clientContext: ClientContext;
  scopeInputs: RetailerScopeInputs;
  setScopeInputs: (value: RetailerScopeInputs) => void;
  sourcedRetailerRevenue: number | null;
  setCategoryListManuallyEdited: (value: boolean) => void;
  competitors: RetailerCompetitor[];
  setCompetitors: (value: RetailerCompetitor[]) => void;
  competitorsManuallyEdited: boolean;
  setCompetitorsManuallyEdited: (value: boolean) => void;
}) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const {
    annualRevenue,
    addressableRevenuePct,
    categories,
    categorySelections,
    selectedLeverIds,
  } = scopeInputs;

  const updateScopeInputs = (updates: Partial<RetailerScopeInputs>) => {
    setScopeInputs({ ...scopeInputs, ...updates });
  };

  const revenueFallback = sourcedRetailerRevenue || defaultRetailerRevenue;
  const totalRevenue = parseCurrencyInput(annualRevenue, revenueFallback);
  const hasRevenueOverride = annualRevenue.trim().length > 0;
  const scopedRevenuePct = parsePercentageInput(
    addressableRevenuePct,
    defaultAddressableRevenuePct
  );
  const addressableRevenue = totalRevenue * (scopedRevenuePct / 100);
  const includedCategories = categories
    .filter((category) => categorySelections[category.name] === "included")
    .map((category) => category.name);
  const excludedCategories = categories
    .filter((category) => categorySelections[category.name] === "excluded")
    .map((category) => category.name);
  const selectedLeverLabels = scopeLeverGroups
    .flatMap((group) => group.levers)
    .filter((lever) => selectedLeverIds.includes(lever.id))
    .map((lever) => lever.label);

  const setCategoryScope = (
    category: string,
    status: CategoryScopeStatus
  ) => {
    updateScopeInputs({
      categorySelections: {
        ...categorySelections,
        [category]: categorySelections[category] === status ? undefined : status,
      },
    });
  };

  const addCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) return;

    const categoryAlreadyExists = categories.some(
      (category) => category.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (categoryAlreadyExists) {
      setNewCategoryName("");
      return;
    }

    updateScopeInputs({
      categories: [
        ...categories,
        createScopeCategory(
          trimmedName,
          "Added manually by the user for this diagnostic.",
          "included",
          "Manual override"
        ),
      ],
      categorySelections: {
        ...categorySelections,
        [trimmedName]: "included",
      },
    });
    setCategoryListManuallyEdited(true);
    setNewCategoryName("");
  };

  const removeCategory = (categoryName: string) => {
    updateScopeInputs({
      categories: categories.filter((category) => category.name !== categoryName),
      categorySelections: Object.fromEntries(
        Object.entries(categorySelections).filter(([name]) => name !== categoryName)
      ) as CategoryScopeSelections,
    });
    setCategoryListManuallyEdited(true);
  };

  const toggleLever = (leverId: string) => {
    updateScopeInputs({
      selectedLeverIds: selectedLeverIds.includes(leverId)
        ? selectedLeverIds.filter((selectedLeverId) => selectedLeverId !== leverId)
        : [...selectedLeverIds, leverId],
    });
  };

  const currentCompetitorRecommendation = () =>
    generateCompetitorSuggestions({
      retailerName: selectedRetailer,
      structuredContext: clientContext.structuredContext,
      scopeInputs,
      uploadedClientData: clientContext.uploadedClientData,
      additionalClientContext: clientContext.additionalContext,
    });

  const replaceWithRecommendedCompetitors = () => {
    setCompetitors(currentCompetitorRecommendation());
    setCompetitorsManuallyEdited(false);
    setShowRegenerateConfirm(false);
  };

  const handleRegenerateCompetitors = () => {
    if (competitorsManuallyEdited) {
      setShowRegenerateConfirm(true);
      return;
    }

    replaceWithRecommendedCompetitors();
  };

  const markCompetitorsEdited = (nextCompetitors: RetailerCompetitor[]) => {
    setCompetitors(nextCompetitors);
    setCompetitorsManuallyEdited(true);
    setShowRegenerateConfirm(false);
  };

  const updateCompetitorName = (competitorId: string, name: string) => {
    markCompetitorsEdited(
      competitors.map((competitor) =>
        competitor.id === competitorId
          ? {
              ...competitor,
              name,
              source: "Manual override",
              reason: "User-edited competitor carried forward into the diagnostic.",
            }
          : competitor
      )
    );
  };

  const removeCompetitor = (competitorId: string) => {
    markCompetitorsEdited(
      competitors.filter((competitor) => competitor.id !== competitorId)
    );
  };

  const moveCompetitor = (competitorId: string, direction: -1 | 1) => {
    const currentIndex = competitors.findIndex(
      (competitor) => competitor.id === competitorId
    );
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= competitors.length) {
      return;
    }

    const reorderedCompetitors = [...competitors];
    const [competitorToMove] = reorderedCompetitors.splice(currentIndex, 1);
    reorderedCompetitors.splice(nextIndex, 0, competitorToMove);
    markCompetitorsEdited(reorderedCompetitors);
  };

  const addCompetitor = () => {
    const trimmedName = newCompetitorName.trim();
    if (!trimmedName) return;

    markCompetitorsEdited([
      ...competitors,
      {
        id: `manual-${Date.now()}`,
        name: trimmedName,
        format: scopeInputs.retailerFormat || clientContext.structuredContext.retailerFormat || "Retail",
        scale: "TBD",
        relationship: "Manual competitor",
        pricePosition: "TBD",
        reason: "Added manually by the user for this diagnostic.",
        source: "Manual override",
      },
    ]);
    setNewCompetitorName("");
  };

  return (
    <section className={`${sectionCard} space-y-4`}>
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-blue)]">
              Scope Summary
            </p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
              {formatCurrencyShort(addressableRevenue)} addressable revenue
            </h3>
            <p className="mt-1 text-sm font-semibold text-[var(--ui-blue)]">
              {scopedRevenuePct}% of total business
            </p>
            <div className="mt-3 grid gap-2 text-xs leading-5 text-gray-600 md:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
                <span className="font-semibold text-[var(--ui-text)]">
                  Included categories:
                </span>{" "}
                {includedCategories.length > 0
                  ? includedCategories.join(", ")
                  : "None selected"}
              </div>
              <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
                <span className="font-semibold text-[var(--ui-text)]">
                  Selected levers:
                </span>{" "}
                {selectedLeverLabels.length > 0
                  ? selectedLeverLabels.join(", ")
                  : "None selected"}
              </div>
            </div>
            {excludedCategories.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                Excluded from scope: {excludedCategories.join(", ")}.
              </p>
            )}
          </div>

          <label className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2 shadow-sm sm:w-auto">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              Total revenue
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <input
                value={annualRevenue}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateScopeInputs({ annualRevenue: e.target.value })
                }
                placeholder={
                  sourcedRetailerRevenue
                    ? formatCurrencyShort(sourcedRetailerRevenue)
                    : "Enter revenue"
                }
                className="w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
                aria-label="Total retailer revenue"
              />
              {hasRevenueOverride && (
                <button
                  type="button"
                  onClick={() => updateScopeInputs({ annualRevenue: "" })}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-semibold text-gray-600 transition hover:border-[var(--ui-blue)]"
                >
                  Use sourced
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              {hasRevenueOverride
                ? "Manual override used downstream"
                : sourcedRetailerRevenue
                  ? "Using sourced Retailer Overview revenue"
                  : "No sourced revenue available"}
            </p>
            <span className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
              % of total revenue
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                value={addressableRevenuePct}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateScopeInputs({ addressableRevenuePct: e.target.value })
                }
                className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-sm font-semibold text-gray-500">%</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              Effective total: {formatCurrencyShort(totalRevenue)}
            </p>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ui-navy)]">
                  Category selection / exclusion
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Mark categories as included or excluded to shape the scope summary.
                </p>
              </div>
              <span className="w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[var(--ui-blue)]">
                Suggested by AI
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Starting list uses retailer format, pricing model, scope signal, and available client context. Add or remove categories as needed.
            </p>

            <div className="mt-4 space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="grid gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--ui-text)]">
                        {category.name}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          category.source === "AI suggested"
                            ? "border-blue-100 bg-blue-50 text-[var(--ui-blue)]"
                            : "border-gray-200 bg-white text-gray-600"
                        }`}
                      >
                        {category.source}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-gray-500">
                      {category.reason}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    {(["included", "excluded"] as CategoryScopeStatus[]).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setCategoryScope(category.name, status)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold capitalize transition ${
                            categorySelections[category.name] === status
                              ? status === "included"
                                ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-blue)]"
                                : "border-gray-500 bg-gray-100 text-gray-700"
                              : "border-gray-200 bg-white text-gray-500 hover:border-[var(--ui-blue)]"
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCategory(category.name)}
                    className="w-fit rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-red-300 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 sm:flex-row">
              <input
                value={newCategoryName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setNewCategoryName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="Add a category"
                className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={addCategory}
                className="rounded-lg bg-[var(--ui-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Add category
              </button>
            </div>

            <div className="mt-4 grid gap-2 text-xs leading-5 text-gray-600 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="font-semibold text-[var(--ui-text)]">
                  Selected categories
                </p>
                <p className="mt-1">
                  {includedCategories.length > 0
                    ? includedCategories.join(", ")
                    : "None selected"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="font-semibold text-[var(--ui-text)]">
                  Excluded categories
                </p>
                <p className="mt-1">
                  {excludedCategories.length > 0
                    ? excludedCategories.join(", ")
                    : "None excluded"}
                </p>
              </div>
            </div>
          </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-[var(--ui-navy)]">
            Lever selection
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Toggle the pricing, promotions, and markdown levers that should be carried forward.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {scopeLeverGroups.map((group) => (
              <div key={group.group} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {group.group}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.levers.map((lever) => {
                    const isSelected = selectedLeverIds.includes(lever.id);

                    return (
                      <button
                        key={lever.id}
                        type="button"
                        onClick={() => toggleLever(lever.id)}
                        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-blue)]"
                            : "border-gray-200 bg-white text-gray-600 hover:border-[var(--ui-blue)]"
                        }`}
                      >
                        {lever.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Selected levers:{" "}
            <span className="font-semibold text-[var(--ui-text)]">
              {selectedLeverLabels.length > 0
                ? selectedLeverLabels.join(", ")
                : "None selected"}
            </span>
          </p>
        </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Retailer Competitors
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
              Recommended competitive set
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
              Suggested competitor set based on retailer format, pricing model, and available context. Review and edit as needed.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRegenerateCompetitors}
              className="rounded-lg border border-[var(--ui-blue)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ui-blue)] transition hover:bg-blue-50"
            >
              Regenerate
            </button>
            {competitorsManuallyEdited && (
              <button
                type="button"
                onClick={replaceWithRecommendedCompetitors}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[var(--ui-blue)]"
              >
                Reset to AI
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Recommendation logic:{" "}
          using {scopeInputs.retailerFormat || clientContext.structuredContext.retailerFormat || "retailer format"}, {clientContext.structuredContext.pricingModel || "pricing model"}, {clientContext.structuredContext.scopeSignal || "scope signal"}, and {clientContext.uploadedClientData.length > 0 ? "uploaded client files" : "available context notes"}.
        </p>

        {showRegenerateConfirm && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Manual edits are present. Regenerating will replace the current list.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={replaceWithRecommendedCompetitors}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white"
              >
                Replace list
              </button>
              <button
                type="button"
                onClick={() => setShowRegenerateConfirm(false)}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
              >
                Keep edits
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {competitors.map((competitor, index) => (
            <div
              key={competitor.id}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
            >
              <div className="grid gap-2 xl:grid-cols-[minmax(180px,0.85fr)_minmax(220px,1fr)_auto_auto] xl:items-center">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center">
                    <input
                      value={competitor.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateCompetitorName(competitor.id, e.target.value)
                      }
                      aria-label={`Competitor ${index + 1} name`}
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
                    />
                    <span
                      className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        competitor.source === "AI suggested"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      {competitor.source}
                    </span>
                </div>

                <p className="text-xs leading-5 text-gray-500">
                    {competitor.reason}
                </p>

                <div className="flex flex-wrap gap-1.5">
                    {[
                      competitor.format,
                      competitor.scale,
                      competitor.relationship,
                      competitor.pricePosition,
                    ].map((chip) => (
                      <span
                        key={`${competitor.id}-${chip}`}
                        className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600"
                      >
                        {chip}
                      </span>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1.5 xl:justify-end">
                  <button
                    type="button"
                    onClick={() => moveCompetitor(competitor.id, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[var(--ui-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCompetitor(competitor.id, 1)}
                    disabled={index === competitors.length - 1}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-[var(--ui-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCompetitor(competitor.id)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-red-300 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-2 sm:flex-row">
          <input
            value={newCompetitorName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setNewCompetitorName(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCompetitor();
              }
            }}
            placeholder="Add a competitor"
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={addCompetitor}
            className="rounded-lg bg-[var(--ui-blue)] px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Add competitor
          </button>
        </div>
      </div>

    </section>
  );
}

function RetailerOverviewSection({
  retailerProfile,
  competitors,
  handleSupplementalPdfUpload,
  supplementalPdfStatus,
  retailerProfileError,
}: {
  retailerProfile: RetailerProfile;
  competitors: RetailerCompetitor[];
  handleSupplementalPdfUpload: (files: FileList | null) => void;
  supplementalPdfStatus: SupplementalPdfStatus | null;
  retailerProfileError: string | null;
}) {
  const retailerName = retailerProfile.retailerName.trim() || "Retailer";
  const workingCapitalMetric = retailerProfile.profitability.find(
    (metric) => metric.label === "Working capital / revenue"
  );
  const [peerProfiles, setPeerProfiles] = useState<
    Record<string, RetailerProfile | null>
  >({});
  const [peerProfilesLoading, setPeerProfilesLoading] = useState(false);
  const peerNames = competitors.map((competitor) => competitor.name.trim()).filter(Boolean);
  const peerNamesKey = peerNames.join("|");

  useEffect(() => {
    let isActive = true;
    const uniquePeerNames = Array.from(
      new Set(peerNamesKey.split("|").filter(Boolean))
    );

    if (uniquePeerNames.length === 0) {
      setPeerProfiles({});
      setPeerProfilesLoading(false);
      return;
    }

    setPeerProfilesLoading(true);
    Promise.all(
      uniquePeerNames.map(async (peerName) => {
        try {
          return [peerName, await fetchRetailerData(peerName)] as const;
        } catch {
          return [peerName, null] as const;
        }
      })
    ).then((entries) => {
      if (!isActive) return;

      setPeerProfiles(Object.fromEntries(entries));
      setPeerProfilesLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [peerNamesKey]);
  const marketMetrics = retailerProfile.marketPosition.filter(
    (metric) => metric.label !== "TSR"
  );

  return (
    <div className="space-y-4">
      <section className={`${sectionCard} space-y-4`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Supplemental Data Upload
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--ui-navy)]">
              Add retailer fact pack context
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-gray-600">
              Upload retailer fact pack (e.g., McKinsey Value Intelligence PDF) to supplement external data
            </p>
          </div>

          {supplementalPdfStatus && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p className="font-semibold text-[var(--ui-text)]">
                {supplementalPdfStatus.status}
              </p>
              <p>{supplementalPdfStatus.fileName}</p>
            </div>
          )}
        </div>

        <label
          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-6 text-center transition hover:border-[var(--ui-blue)] hover:bg-white"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleSupplementalPdfUpload(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleSupplementalPdfUpload(e.target.files)
            }
          />
          <p className="font-medium text-[var(--ui-text)]">
            Drop PDF here or browse
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Optional. Extracted fields override external values only when present.
          </p>
        </label>
      </section>

      {retailerProfileError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
          <p className="font-semibold">External data fetch failed</p>
          <p className="mt-1">{retailerProfileError}</p>
        </section>
      )}

      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Financial Performance
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
            {retailerName} financial trajectory
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Best available sourced data. Missing external or uploaded values remain not available.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {retailerProfile.financials.map((series) => (
            <div key={series.label}>{renderMiniLineChart(series)}</div>
          ))}
          {renderWorkingCapitalCard(workingCapitalMetric)}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Market Position vs Peers
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            Company performance against selected peers
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Peer view anchored on{" "}
            {competitors.length > 0
              ? competitors.map((competitor) => competitor.name).join(", ")
              : "the available peer benchmark"}
            .
          </p>
        </div>

        <div className="space-y-3">
          {peerProfilesLoading && competitors.length > 0 && (
            <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-[var(--ui-blue)]">
              Fetching selected peer profiles...
            </p>
          )}
          {marketMetrics.map((metric) => (
            <div key={metric.label}>
              {renderPeerComparisonBar(
                metric,
                buildPeerBenchmark({
                  metric,
                  competitors,
                  peerProfiles,
                  isLoading: peerProfilesLoading,
                })
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-3`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Key Insights (Data-driven)
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            What the data suggests
          </h3>
        </div>

        <div className="space-y-2 text-sm leading-6 text-gray-600">
          {retailerProfile.insights.length > 0 ? (
            retailerProfile.insights.map((insight) => (
              <p key={insight}>• {insight}</p>
            ))
          ) : (
            <p>Not available</p>
          )}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            News & Headlines
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            Recent signals to monitor
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Recent sourced headlines tagged for pricing, promotions, cost, strategy, or operations.
          </p>
        </div>

        <ul className="space-y-2">
          {retailerProfile.headlines.length > 0 ? (
            retailerProfile.headlines.map((headline) => (
              <li
                key={`${headline.category}-${headline.title}`}
                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 sm:flex-row sm:items-center"
              >
                <span
                  className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${newsCategoryStyles[headline.category]}`}
                >
                  {headline.category}
                </span>
                {headline.url ? (
                  <a
                    href={headline.url}
                    target="_blank"
                    rel="noreferrer"
                    className="leading-5 text-[var(--ui-blue)] underline-offset-2 hover:underline"
                  >
                    • {headline.title}
                  </a>
                ) : (
                  <span className="leading-5">• {headline.title}</span>
                )}
                {(headline.date || headline.publisher) && (
                  <span className="text-xs text-gray-500">
                    {[
                      headline.publisher,
                      headline.date
                        ? new Date(headline.date).toLocaleDateString()
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
                {renderSourceBadge(headline.source)}
              </li>
            ))
          ) : (
            <li className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Not available
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function renderSourceBadge(source: RetailerProfileSource | null) {
  if (!source) {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
        Not available
      </span>
    );
  }

  return (
    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ui-blue)]">
      {source === "uploaded_pdf" ? "Uploaded PDF" : "External"}
    </span>
  );
}

function renderMiniLineChart(series: SourcedFinancialSeries) {
  if (series.values.length === 0) {
    return (
      <div className={subCard}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {series.label}
          </p>
          {renderSourceBadge(series.source)}
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
          Not available
        </p>
        <p className="mt-3 text-xs leading-5 text-gray-500">
          No sourced value found from external data or uploaded PDF.
        </p>
      </div>
    );
  }

  const values = series.values.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const chartPoints = series.values
    .map((point, index) => {
      const x =
        series.values.length === 1
          ? 50
          : (index / (series.values.length - 1)) * 100;
      const y = 42 - ((point.value - minValue) / valueRange) * 34;
      return `${x},${y}`;
    })
    .join(" ");
  const latestPoint = series.values[series.values.length - 1];
  const firstPoint = series.values[0];
  const change = latestPoint.value - firstPoint.value;
  const displayValue =
    series.unit === "currency"
      ? `$${latestPoint.value.toFixed(1)}B`
      : `${latestPoint.value.toFixed(1)}%`;
  const displayChange =
    series.unit === "currency"
      ? `${change >= 0 ? "+" : ""}$${change.toFixed(1)}B vs ${firstPoint.year}`
      : `${change >= 0 ? "+" : ""}${change.toFixed(1)} pts vs ${firstPoint.year}`;

  return (
    <div className={subCard}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
            {series.label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
            {displayValue}
          </p>
        </div>
        <div className="space-y-1 text-right">
          {renderSourceBadge(series.source)}
          <p
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              change >= 0
                ? "bg-blue-50 text-[var(--ui-blue)]"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {displayChange}
          </p>
        </div>
      </div>

      <svg
        viewBox="0 0 100 46"
        className="mt-4 h-20 w-full overflow-visible"
        role="img"
        aria-label={`${series.label} trend`}
      >
        <polyline
          points={chartPoints}
          fill="none"
          stroke="var(--ui-blue)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {series.values.map((point, index) => {
          const x =
            series.values.length === 1
              ? 50
              : (index / (series.values.length - 1)) * 100;
          const y = 42 - ((point.value - minValue) / valueRange) * 34;

          return (
            <circle
              key={`${point.year}-${point.value}`}
              cx={x}
              cy={y}
              r={2.4}
              fill="white"
              stroke="var(--ui-blue)"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      <div className="mt-2 flex justify-between text-[11px] font-medium text-gray-500">
        {series.values.map((point) => (
          <span key={point.year}>{point.year}</span>
        ))}
      </div>
    </div>
  );
}

function renderWorkingCapitalCard(
  metric: SourcedProfitabilityMetric | undefined
) {
  return (
    <div className={subCard}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Working Capital / Revenue
        </p>
        {renderSourceBadge(metric?.source || null)}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
        {metric?.value || "Not available"}
      </p>
      {metric?.benchmark && (
        <p className="mt-1 text-xs font-medium text-gray-600">
          {metric.benchmark}
        </p>
      )}
      {metric?.note && (
        <p className="mt-2 text-xs leading-5 text-gray-500">{metric.note}</p>
      )}
    </div>
  );
}

function renderPeerComparisonBar(
  metric: SourcedPeerComparisonMetric,
  peerBenchmark: PeerBenchmark
) {
  const hasCompanyValue = metric.company !== null;
  const hasPeerValue = peerBenchmark.benchmarkValue !== null;
  const maxValue = Math.max(
    metric.company || 0,
    peerBenchmark.benchmarkValue || 0,
    1
  );
  const companyWidth = hasCompanyValue
    ? `${Math.max(((metric.company || 0) / maxValue) * 100, 4)}%`
    : "0%";
  const peerWidth = hasPeerValue
    ? `${Math.max(((peerBenchmark.benchmarkValue || 0) / maxValue) * 100, 4)}%`
    : "0%";
  const formatValue = (value: number) =>
    metric.unit === "percent" ? `${value.toFixed(1)}%` : value.toFixed(1);
  const peerBenchmarkLabel = peerBenchmark.isSelectedSet
    ? "Selected peer median"
    : "Peer median";
  const usingFallbackBenchmark =
    peerBenchmark.isSelectedSet &&
    peerBenchmark.availableCount === 0 &&
    hasPeerValue;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ui-navy)]">
          {metric.label}
        </p>
        {renderSourceBadge(metric.source)}
      </div>

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--ui-blue)]">
            Company
          </span>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-[var(--ui-blue)]"
              style={{ width: companyWidth }}
            />
          </div>
          <span className="text-right font-semibold text-[var(--ui-text)]">
            {hasCompanyValue ? formatValue(metric.company || 0) : "N/A"}
          </span>
        </div>

        <div className="grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
          <span className="font-semibold text-gray-500">
            {peerBenchmarkLabel}
          </span>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-400"
              style={{ width: peerWidth }}
            />
          </div>
          <span className="text-right font-semibold text-[var(--ui-text)]">
            {hasPeerValue ? formatValue(peerBenchmark.benchmarkValue || 0) : "N/A"}
          </span>
        </div>
      </div>

      {peerBenchmark.isSelectedSet && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          <p className="text-xs font-medium text-gray-500">
            Benchmark from selected competitive set:{" "}
            {peerBenchmark.availableCount > 0
              ? `${peerBenchmark.availableCount}/${peerBenchmark.totalCount} peers with ${metric.label.toLowerCase()} data`
              : peerBenchmark.isLoading
                ? "loading peer values"
                : usingFallbackBenchmark
                  ? "no selected peers returned usable data; showing fallback benchmark"
                  : "no selected peers returned usable data"}
            .
          </p>
          <div className="flex flex-wrap gap-2">
            {peerBenchmark.details.map((peer) => (
              <span
                key={`${metric.label}-${peer.name}`}
                className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-600"
              >
                {peer.name}:{" "}
                {peer.value === null ? "Not available" : formatValue(peer.value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunitySection({
  opportunity,
  analysisMode,
  scopeInputs,
  clientContext,
}: {
  opportunity: Opportunity;
  analysisMode: AnalysisMode;
  scopeInputs: RetailerScopeInputs;
  clientContext: ClientContext;
}) {
  const initialLeverContributions: LeverContributions = {
    pricing: parseBpsValue(opportunity.pricing.marginUpliftBps),
    promotions: parseBpsValue(opportunity.promotions.marginUpliftBps),
    markdown: parseBpsValue(opportunity.markdown.marginUpliftBps),
  };
  const initialScopePct = parsePercentageInput(
    scopeInputs.addressableRevenuePct,
    defaultAddressableRevenuePct
  );
  const initialEprAdjustment = Math.round((3 - clientContext.eprAverageScore) * 12);
  const initialScopeAdjustment = Math.round((initialScopePct - defaultAddressableRevenuePct) * 0.4);
  const initialClientDataAdjustment =
    analysisMode === "hybrid" && clientContext.uploadedClientData.length > 0 ? 15 : 0;

  const [scenario, setScenario] = useState<Scenario>("Base");
  const [estimateComponents, setEstimateComponents] =
    useState<EstimateComponents>({
      baseBenchmarkAdjustment: 0,
      eprAdjustment: initialEprAdjustment,
      scopeAdjustment: initialScopeAdjustment,
      clientDataAdjustment: initialClientDataAdjustment,
    });
  const [leverContributions, setLeverContributions] =
    useState<LeverContributions>(initialLeverContributions);
  const [confidenceInputs, setConfidenceInputs] = useState<ConfidenceInputs>({
    overall: analysisMode === "hybrid" ? 72 : 60,
    benchmarkRelevance: 70,
    dataQuality: clientContext.uploadedClientData.length > 0 ? 76 : 48,
    assumptionStrength: 66,
  });
  const [assumptions, setAssumptions] = useState<AssumptionInputs>({
    elasticity: 100,
    promoIncrementality: 100,
    markdownRecovery: 100,
  });
  const [actions, setActions] = useState<ActionCard[]>([
    {
      id: "price-pack",
      title: "Rebalance price-pack architecture",
      lever: "Pricing",
      impactRange: "+15-30 bps",
      effort: "Medium",
      included: true,
      highlighted: true,
    },
    {
      id: "promo-frequency",
      title: "Reduce blanket promotional frequency",
      lever: "Promotions",
      impactRange: "+10-25 bps",
      effort: "Medium",
      included: true,
      highlighted: false,
    },
    {
      id: "promo-kvis",
      title: "Reallocate promotions away from non-KVIs",
      lever: "Promotions",
      impactRange: "+8-18 bps",
      effort: "Low",
      included: true,
      highlighted: false,
    },
    {
      id: "markdown-timing",
      title: "Improve markdown timing discipline",
      lever: "Markdown",
      impactRange: "+8-18 bps",
      effort: "Medium",
      included: true,
      highlighted: false,
    },
    {
      id: "pack-rationalization",
      title: "Rationalize pack assortment",
      lever: "Markdown",
      impactRange: "+5-12 bps",
      effort: "High",
      included: false,
      highlighted: false,
    },
  ]);

  const totalRevenue = parseCurrencyInput(
    scopeInputs.annualRevenue,
    defaultRetailerRevenue
  );
  const scopedRevenuePct = parsePercentageInput(
    scopeInputs.addressableRevenuePct,
    defaultAddressableRevenuePct
  );
  const addressableRevenue = totalRevenue * (scopedRevenuePct / 100);
  const includedCategories = scopeInputs.categories
    .filter((category) => scopeInputs.categorySelections[category.name] === "included")
    .map((category) => category.name);
  const selectedLeverFamilies = scopeLeverGroups
    .filter((group) =>
      group.levers.some((lever) => scopeInputs.selectedLeverIds.includes(lever.id))
    )
    .map((group) => group.group);
  const leverScopeFactors: LeverContributions = {
    pricing: selectedLeverFamilies.includes("Pricing") ? 1 : 0,
    promotions: selectedLeverFamilies.includes("Promotions") ? 1 : 0,
    markdown: selectedLeverFamilies.includes("Markdown") ? 1 : 0,
  };
  const scopedLeverContributions: LeverContributions = {
    pricing: Math.round(leverContributions.pricing * leverScopeFactors.pricing),
    promotions: Math.round(leverContributions.promotions * leverScopeFactors.promotions),
    markdown: Math.round(leverContributions.markdown * leverScopeFactors.markdown),
  };
  const baseBenchmarkBps =
    scopedLeverContributions.pricing +
    scopedLeverContributions.promotions +
    scopedLeverContributions.markdown +
    estimateComponents.baseBenchmarkAdjustment;
  const rawOpportunityBps =
    baseBenchmarkBps +
    estimateComponents.eprAdjustment +
    estimateComponents.scopeAdjustment +
    estimateComponents.clientDataAdjustment;
  const confidenceAverage =
    (confidenceInputs.overall +
      confidenceInputs.benchmarkRelevance +
      confidenceInputs.dataQuality +
      confidenceInputs.assumptionStrength) /
    400;
  const confidenceMultiplier = 0.85 + confidenceAverage * 0.3;
  const assumptionMultiplier =
    (assumptions.elasticity +
      assumptions.promoIncrementality +
      assumptions.markdownRecovery) /
    300;
  const totalOpportunityBps = Math.max(
    0,
    Math.round(rawOpportunityBps * confidenceMultiplier * assumptionMultiplier)
  );
  const revenueImpactPct = totalOpportunityBps / 100;
  const totalOpportunityDollars = addressableRevenue * (totalOpportunityBps / 10000);
  const confidenceLabel =
    confidenceInputs.overall >= 75
      ? "High"
      : confidenceInputs.overall >= 55
        ? "Medium"
        : "Low";

  const applyScenario = (nextScenario: Scenario) => {
    const scenarioMultiplier =
      nextScenario === "Conservative" ? 0.8 : nextScenario === "Aggressive" ? 1.2 : 1;

    setScenario(nextScenario);
    setLeverContributions({
      pricing: Math.round(initialLeverContributions.pricing * scenarioMultiplier),
      promotions: Math.round(initialLeverContributions.promotions * scenarioMultiplier),
      markdown: Math.round(initialLeverContributions.markdown * scenarioMultiplier),
    });
    setEstimateComponents({
      baseBenchmarkAdjustment:
        nextScenario === "Conservative" ? -10 : nextScenario === "Aggressive" ? 10 : 0,
      eprAdjustment:
        nextScenario === "Conservative"
          ? initialEprAdjustment - 10
          : nextScenario === "Aggressive"
            ? initialEprAdjustment + 8
            : initialEprAdjustment,
      scopeAdjustment:
        nextScenario === "Conservative"
          ? initialScopeAdjustment - 6
          : nextScenario === "Aggressive"
            ? initialScopeAdjustment + 6
            : initialScopeAdjustment,
      clientDataAdjustment:
        nextScenario === "Conservative"
          ? Math.max(0, initialClientDataAdjustment - 5)
          : nextScenario === "Aggressive"
            ? initialClientDataAdjustment + 10
            : initialClientDataAdjustment,
    });
    setConfidenceInputs({
      overall: nextScenario === "Conservative" ? 62 : nextScenario === "Aggressive" ? 78 : 72,
      benchmarkRelevance: nextScenario === "Conservative" ? 64 : nextScenario === "Aggressive" ? 76 : 70,
      dataQuality:
        nextScenario === "Conservative"
          ? 58
          : nextScenario === "Aggressive"
            ? 82
            : clientContext.uploadedClientData.length > 0
              ? 76
              : 48,
      assumptionStrength: nextScenario === "Conservative" ? 60 : nextScenario === "Aggressive" ? 74 : 66,
    });
    setAssumptions({
      elasticity: nextScenario === "Conservative" ? 92 : nextScenario === "Aggressive" ? 108 : 100,
      promoIncrementality:
        nextScenario === "Conservative" ? 90 : nextScenario === "Aggressive" ? 112 : 100,
      markdownRecovery:
        nextScenario === "Conservative" ? 92 : nextScenario === "Aggressive" ? 110 : 100,
    });
  };

  const toggleAction = (actionId: string, key: "included") => {
    setActions(
      actions.map((action) =>
        action.id === actionId ? { ...action, [key]: !action[key] } : action
      )
    );
  };

  const leverRows: {
    key: keyof LeverContributions;
    name: string;
    reason: string;
  }[] = [
    {
      key: "pricing",
      name: "Pricing",
      reason: `EPR gap: price architecture and KVI discipline score ${clientContext.eprScores.priceArchitectureKvis}/5, creating room for selective margin capture outside protected value items.`,
    },
    {
      key: "promotions",
      name: "Promotions",
      reason: `EPR gap: promotions effectiveness scores ${clientContext.eprScores.promotionsStrategyEffectiveness}/5; market signals point to heavier discounting and room to improve incrementality.`,
    },
    {
      key: "markdown",
      name: "Markdown",
      reason: `Retailer signal: markdown and inventory management scores ${clientContext.eprScores.markdownInventoryManagement}/5, suggesting timing and recovery leakage in seasonal or slow-moving inventory.`,
    },
  ];
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            label: "Revenue % / addressable impact",
            value: `${formatSignedPct(revenueImpactPct)} / ${formatCurrencyShort(totalOpportunityDollars)}`,
          },
          { label: "Margin bps", value: formatSignedBps(totalOpportunityBps) },
          {
            label: "Total opportunity",
            value: formatCurrencyShort(totalOpportunityDollars),
          },
        ].map((item) => (
          <div key={item.label} className={metricCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--ui-blue)]">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <p className="text-sm leading-6 text-gray-600">
        AI-generated estimate based on {formatCurrencyShort(addressableRevenue)} in scope (
        {scopedRevenuePct}% of business), across{" "}
        {includedCategories.length > 0
          ? `${includedCategories.slice(0, 3).join(", ")}${includedCategories.length > 3 ? " and other selected categories" : ""}`
          : "selected categories"}{" "}
        and {selectedLeverFamilies.length > 0 ? selectedLeverFamilies.join(", ") : "selected levers"}, assuming{" "}
        {clientContext.eprMaturityLabel.toLowerCase()} pricing maturity.
      </p>

      <section className={`${sectionCard} space-y-4 border-blue-100 bg-blue-50/40`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ui-blue)]">
            Key Drivers of Opportunity
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            Why this estimate is defensible
          </h2>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {leverRows.map((driver) => (
            <div key={driver.key} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[var(--ui-navy)]">{driver.name}</p>
                <p className="text-sm font-bold text-[var(--ui-blue)]">
                  {formatSignedBps(scopedLeverContributions[driver.key])}
                </p>
              </div>
              <p className="mt-3 text-sm leading-5 text-gray-600">{driver.reason}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
          Opportunity Breakdown
        </h2>

        <div className="grid gap-3 md:grid-cols-3">
          {leverRows.map((lever) => (
            <div key={lever.key} className={subCard}>
              <p className="text-sm font-semibold text-[var(--ui-navy)]">
                {lever.name}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-blue)]">
                {formatSignedBps(scopedLeverContributions[lever.key])}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {leverScopeFactors[lever.key] > 0 ? "Included in current diagnostic scope." : "Out of current diagnostic scope."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Confidence & Sensitivity
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
              {confidenceLabel} confidence estimate
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["Base", "Conservative", "Aggressive"] as Scenario[]).map(
              (scenarioOption) => (
                <button
                  key={scenarioOption}
                  type="button"
                  onClick={() => applyScenario(scenarioOption)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    scenario === scenarioOption
                      ? "border-[var(--ui-blue)] bg-blue-50 text-[var(--ui-blue)]"
                      : "border-gray-200 bg-white text-gray-600 hover:border-[var(--ui-blue)]"
                  }`}
                >
                  {scenarioOption}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
          <div className={subCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
              Confidence level
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-blue)]">
              {confidenceLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Scenario: {scenario}
            </p>
          </div>
          <div className={`${subCard} space-y-2 text-sm leading-6 text-gray-600`}>
            <p>• Benchmark-based estimate calibrated to selected levers and current EPR maturity.</p>
            <p>• No client elasticity curve is available, so demand response remains an uncertainty.</p>
            <p>• Promo incrementality and markdown recovery are assumed from diagnostic signals.</p>
          </div>
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
          Top Actions
        </h2>

        <div className="grid gap-3 lg:grid-cols-2">
          {actions.map((action, index) => (
            <div
              key={action.id}
              className={`rounded-xl border p-4 shadow-sm ${
                action.highlighted
                  ? "border-[var(--ui-blue)] bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--ui-navy)]">
                  {index + 1}. {action.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {action.lever} | Impact {action.impactRange} | Effort {action.effort}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleAction(action.id, "included")}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    action.included
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-100 text-gray-500"
                  }`}
                >
                  {action.included ? "Included in memo" : "Not in memo"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
