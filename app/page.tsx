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
type DriverStatus = "highConfidence" | "needsReview";
type DriverStatuses = Record<keyof LeverContributions, DriverStatus>;
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
type RetailerNewsFeed = {
  summary: string;
  headlines: RetailerHeadline[];
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
type ProfitabilityMetric = {
  label: string;
  value: string;
  benchmark: string;
  note: string;
};
type PeerComparisonMetric = {
  label: string;
  company: number;
  peerMedian: number;
  unit: "percent";
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

const competitorTemplates: Record<string, RetailerCompetitor[]> = {
  grocery: [
    createCompetitor("Kroger", "Grocery", "National", "Direct competitor", "Mid-market", "Large grocery operator with comparable category and pricing dynamics."),
    createCompetitor("Albertsons", "Grocery", "National", "Direct competitor", "Mid-market", "Traditional grocer with similar promo and assortment decisions."),
    createCompetitor("Publix", "Grocery", "Regional", "Direct competitor", "Premium", "Regional grocer with strong fresh and service-led positioning."),
    createCompetitor("Aldi", "Discount grocery", "National", "Adjacent competitor", "Value", "Hard discounter that pressures opening price points."),
    createCompetitor("Walmart", "Mass / grocery", "National", "Adjacent competitor", "Value / EDLP", "Broad value retailer that anchors grocery price expectations."),
  ],
  mass: [
    createCompetitor("Walmart", "Mass", "National", "Direct competitor", "Value / EDLP", "National mass retailer with strong price leadership signals."),
    createCompetitor("Target", "Mass", "National", "Direct competitor", "Mid-market", "Mass merchant with comparable omnichannel and category breadth."),
    createCompetitor("Amazon", "Marketplace", "National", "Adjacent competitor", "Dynamic / value", "Digital benchmark for price transparency and convenience."),
    createCompetitor("Costco", "Club", "National", "Adjacent competitor", "Value", "Membership model that pressures basket-level value perception."),
  ],
  specialty: [
    createCompetitor("Best Buy", "Specialty", "National", "Direct competitor", "Mid-market", "Specialty retailer with category-led price architecture."),
    createCompetitor("Dick's Sporting Goods", "Specialty", "National", "Direct competitor", "Premium / mid-market", "Specialty peer with branded assortment and promo decisions."),
    createCompetitor("Amazon", "Marketplace", "National", "Adjacent competitor", "Dynamic / value", "Online price benchmark across specialty categories."),
    createCompetitor("Target", "Mass", "National", "Adjacent competitor", "Mid-market", "Mass merchant competing on select destination categories."),
  ],
  club: [
    createCompetitor("Costco", "Club", "National", "Direct competitor", "Value", "Membership club with strong basket-level value positioning."),
    createCompetitor("Sam's Club", "Club", "National", "Direct competitor", "Value", "Club peer with similar pack-size and member-price dynamics."),
    createCompetitor("BJ's Wholesale Club", "Club", "Regional", "Direct competitor", "Value", "Regional club operator with comparable membership economics."),
    createCompetitor("Walmart", "Mass", "National", "Adjacent competitor", "Value / EDLP", "Adjacent EDLP benchmark for trip consolidation."),
  ],
  other: [
    createCompetitor("Walmart", "Mass", "National", "Adjacent competitor", "Value / EDLP", "Broad national benchmark for value perception."),
    createCompetitor("Target", "Mass", "National", "Adjacent competitor", "Mid-market", "Scaled omnichannel retailer with broad category overlap."),
    createCompetitor("Amazon", "Marketplace", "National", "Adjacent competitor", "Dynamic / value", "Digital price transparency and convenience benchmark."),
    createCompetitor("Costco", "Club", "National", "Adjacent competitor", "Value", "Membership value benchmark for larger baskets."),
  ],
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
  const templateKey = inferCompetitorTemplateKey(
    formatSignal,
    additionalClientContext
  );
  const pricingModel = structuredContext.pricingModel || "current pricing model";
  const scopeSignal = structuredContext.scopeSignal || "diagnostic scope";
  const contextSignal =
    uploadedClientData.length > 0
      ? "uploaded client context"
      : additionalClientContext.trim()
        ? "client context notes"
        : "format-based placeholders";
  const retailerNameNormalized = retailerName.trim().toLowerCase();

  return (competitorTemplates[templateKey] || competitorTemplates.other)
    .filter(
      (competitor) =>
        competitor.name.trim().toLowerCase() !== retailerNameNormalized
    )
    .slice(0, 6)
    .map((competitor) => ({
      ...competitor,
      id: `${competitor.id}-${pricingModel}-${scopeSignal}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      reason: `Selected from ${formatSignal} format, ${pricingModel} pricing, ${scopeSignal.toLowerCase()} scope, and ${contextSignal}.`,
    }));
};

const newsCategoryStyles: Record<HeadlineCategory, string> = {
  Pricing: "border-blue-200 bg-blue-50 text-blue-700",
  Promotions: "border-purple-200 bg-purple-50 text-purple-700",
  "Cost / Margin": "border-amber-200 bg-amber-50 text-amber-700",
  Strategy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Operations: "border-gray-200 bg-gray-100 text-gray-700",
};

const getMockRetailerNews = (
  retailerName: string
): RetailerNewsFeed => ({
  summary:
    "Recent signals suggest increased promotional activity and margin pressure driven by cost inflation, competitive intensity, and sharper value messaging.",
  headlines: [
    {
      category: "Pricing",
      title: `${retailerName} tests targeted price increases on premium private-label categories`,
    },
    {
      category: "Promotions",
      title: `${retailerName} expands digital coupon events amid heavier weekly discounting`,
    },
    {
      category: "Cost / Margin",
      title: `${retailerName} flags freight and labor pressure as near-term margin headwinds`,
    },
    {
      category: "Operations",
      title: `${retailerName} rebalances stores with smaller-format openings and select closures`,
    },
    {
      category: "Strategy",
      title: `${retailerName} sharpens value messaging and speeds promo decision cycles`,
    },
  ],
});

const mockFinancialPerformance: FinancialSeries[] = [
  {
    label: "Revenue",
    unit: "currency",
    values: [
      { year: "FY20", value: 42.1 },
      { year: "FY21", value: 44.8 },
      { year: "FY22", value: 45.7 },
      { year: "FY23", value: 46.4 },
      { year: "FY24", value: 47.0 },
    ],
  },
  {
    label: "EBITDA",
    unit: "currency",
    values: [
      { year: "FY20", value: 4.8 },
      { year: "FY21", value: 5.0 },
      { year: "FY22", value: 4.7 },
      { year: "FY23", value: 4.5 },
      { year: "FY24", value: 4.3 },
    ],
  },
  {
    label: "Margin",
    unit: "percent",
    values: [
      { year: "FY20", value: 11.4 },
      { year: "FY21", value: 11.2 },
      { year: "FY22", value: 10.3 },
      { year: "FY23", value: 9.7 },
      { year: "FY24", value: 9.1 },
    ],
  },
];

const mockProfitabilityMetrics: ProfitabilityMetric[] = [
  {
    label: "ROIC",
    value: "8.6%",
    benchmark: "Peer median: 10.4%",
    note: "Below peer returns",
  },
  {
    label: "Working capital / revenue",
    value: "6.8%",
    benchmark: "Peer median: 5.1%",
    note: "More capital tied up",
  },
  {
    label: "COGS",
    value: "68.4%",
    benchmark: "FY20: 66.9%",
    note: "Cost pressure up",
  },
  {
    label: "SG&A",
    value: "22.5%",
    benchmark: "FY20: 21.7%",
    note: "Operating cost drag",
  },
];

const mockPeerComparisons: PeerComparisonMetric[] = [
  {
    label: "Revenue growth",
    company: 1.3,
    peerMedian: 3.1,
    unit: "percent",
  },
  {
    label: "Margin",
    company: 9.1,
    peerMedian: 10.8,
    unit: "percent",
  },
  {
    label: "TSR",
    company: 4.2,
    peerMedian: 8.7,
    unit: "percent",
  },
];

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
                Latest run: {isLoading ? "In progress" : "Ready"}
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
                    { label: "Status", value: isLoading ? "Running" : "Ready" },
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
                    <h2 className="text-xl font-semibold tracking-tight text-[var(--ui-navy)]">
                      Analyzing {selectedRetailer}...
                    </h2>

                    <div className="space-y-3 text-sm text-gray-600">
                      <p>✓ Scraping pricing data</p>
                      <p>✓ Building price ladder</p>
                      <p>✓ Analyzing promo intensity</p>
                      <p>✓ Evaluating markdown patterns</p>
                      <p className="font-semibold text-[var(--ui-blue)]">
                        → Synthesizing results
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
                        setIsLoading={setIsLoading}
                        setSelectedRetailer={setSelectedRetailer}
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
                        selectedRetailer={selectedRetailer}
                        competitors={retailerCompetitors}
                      />
                    )}

                    {activeOverviewTab === "opportunity" && (
                      <OpportunitySection
                        opportunity={opportunity}
                        analysisMode={analysisMode}
                        scopeInputs={retailerScopeInputs}
                        clientContext={clientContext}
                        competitors={retailerCompetitors}
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
  setIsLoading,
  setSelectedRetailer,
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
  setIsLoading: (value: boolean) => void;
  setSelectedRetailer: (value: string) => void;
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
                placeholder="Enter retailer name"
                className="w-80 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                disabled={!hasRequiredClientUpload}
                onClick={() => {
                  if (!hasRequiredClientUpload) return;

                  const name = retailerInput.trim() || "Retailer";
                  setIsLoading(true);
                  setSelectedRetailer(name);

                  setTimeout(() => {
                    setIsLoading(false);
                  }, 2000);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                  hasRequiredClientUpload
                    ? "bg-[var(--ui-blue)] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                {hasRequiredClientUpload
                  ? "Run Diagnostic"
                  : "Upload client data to run"}
              </button>
            </div>
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

  const totalRevenue = parseCurrencyInput(annualRevenue, defaultRetailerRevenue);
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
              Total revenue: {formatCurrencyShort(totalRevenue)}
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
  selectedRetailer,
  competitors,
}: {
  selectedRetailer: string;
  competitors: RetailerCompetitor[];
}) {
  const retailerName = selectedRetailer.trim() || "Retailer";
  const news = getMockRetailerNews(retailerName);

  return (
    <div className="space-y-4">
      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Financial Performance
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
            {retailerName} financial trajectory
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Mock 10-K style data showing revenue, EBITDA, and margin trends over time.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {mockFinancialPerformance.map((series) => (
            <div key={series.label}>{renderMiniLineChart(series)}</div>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Profitability & Efficiency
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            Returns, capital intensity, and cost structure
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mockProfitabilityMetrics.map((metric) => (
            <div key={metric.label} className={subCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ui-navy)]">
                {metric.value}
              </p>
              <p className="mt-1 text-xs font-medium text-gray-600">
                {metric.benchmark}
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                {metric.note}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Market Position vs Peers
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
            Company performance against peer median
          </h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Peer view anchored on{" "}
            {competitors.length > 0
              ? competitors.map((competitor) => competitor.name).join(", ")
              : "the selected competitor set"}
            .
          </p>
        </div>

        <div className="space-y-3">
          {mockPeerComparisons.map((metric) => (
            <div key={metric.label}>{renderPeerComparisonBar(metric)}</div>
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
          <p>
            • Revenue growth has slowed to roughly +1.3%, lagging the peer median of +3.1% and suggesting potential pricing, traffic, or assortment challenges.
          </p>
          <p>
            • EBITDA margin has declined from 11.4% to 9.1%, indicating sustained cost pressure, promotional intensity, or mix dilution.
          </p>
          <p>
            • ROIC trails peers by 180 bps while working capital intensity is higher, pointing to efficiency upside beyond headline price changes.
          </p>
          <p>
            • TSR is below the peer median, reinforcing the need for margin recovery and clearer growth drivers.
          </p>
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
            {news.summary}
          </p>
        </div>

        <ul className="space-y-2">
          {news.headlines.map((headline) => (
            <li
              key={`${headline.category}-${headline.title}`}
              className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 sm:flex-row sm:items-center"
            >
              <span
                className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-semibold ${newsCategoryStyles[headline.category]}`}
              >
                {headline.category}
              </span>
              <span className="leading-5">• {headline.title}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function renderMiniLineChart(series: FinancialSeries) {
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

function renderPeerComparisonBar(metric: PeerComparisonMetric) {
  const maxValue = Math.max(metric.company, metric.peerMedian, 1);
  const companyWidth = `${Math.max((metric.company / maxValue) * 100, 4)}%`;
  const peerWidth = `${Math.max((metric.peerMedian / maxValue) * 100, 4)}%`;
  const formatValue = (value: number) =>
    metric.unit === "percent" ? `${value.toFixed(1)}%` : value.toFixed(1);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ui-navy)]">
          {metric.label}
        </p>
        <p className="text-xs font-medium text-gray-500">
          Company vs peer median
        </p>
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
            {formatValue(metric.company)}
          </span>
        </div>

        <div className="grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
          <span className="font-semibold text-gray-500">Peer median</span>
          <div className="h-2 rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gray-400"
              style={{ width: peerWidth }}
            />
          </div>
          <span className="text-right font-semibold text-[var(--ui-text)]">
            {formatValue(metric.peerMedian)}
          </span>
        </div>
      </div>
    </div>
  );
}

function OpportunitySection({
  opportunity,
  analysisMode,
  scopeInputs,
  clientContext,
  competitors,
}: {
  opportunity: Opportunity;
  analysisMode: AnalysisMode;
  scopeInputs: RetailerScopeInputs;
  clientContext: ClientContext;
  competitors: RetailerCompetitor[];
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
  const [driverStatuses, setDriverStatuses] = useState<DriverStatuses>({
    pricing: "highConfidence",
    promotions: "needsReview",
    markdown: "needsReview",
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
  const selectedLeverLabels = scopeLeverGroups
    .flatMap((group) => group.levers)
    .filter((lever) => scopeInputs.selectedLeverIds.includes(lever.id))
    .map((lever) => lever.label);
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

  const updateEstimateComponent = (
    key: keyof EstimateComponents,
    value: number
  ) => {
    setEstimateComponents({
      ...estimateComponents,
      [key]: value,
    });
  };

  const updateLeverContribution = (
    key: keyof LeverContributions,
    value: number
  ) => {
    setLeverContributions({
      ...leverContributions,
      [key]: value,
    });
  };

  const updateConfidenceInput = (key: keyof ConfidenceInputs, value: number) => {
    setConfidenceInputs({
      ...confidenceInputs,
      [key]: value,
    });
  };

  const updateAssumption = (key: keyof AssumptionInputs, value: number) => {
    setAssumptions({
      ...assumptions,
      [key]: value,
    });
  };

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

  const moveAction = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= actions.length) return;

    const nextActions = [...actions];
    [nextActions[index], nextActions[nextIndex]] = [
      nextActions[nextIndex],
      nextActions[index],
    ];
    setActions(nextActions);
  };

  const toggleAction = (actionId: string, key: "included" | "highlighted") => {
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
  const maxLeverBps = Math.max(
    120,
    leverContributions.pricing,
    leverContributions.promotions,
    leverContributions.markdown
  );
  const estimateRows = [
    {
      key: "baseBenchmarkAdjustment" as const,
      label: "Base benchmark estimate",
      contribution: baseBenchmarkBps,
      min: -40,
      max: 40,
      value: estimateComponents.baseBenchmarkAdjustment,
      explanation:
        "Starts from the in-scope lever benchmark, then lets you trim or stretch the base view.",
    },
    {
      key: "eprAdjustment" as const,
      label: "EPR / maturity adjustment",
      contribution: estimateComponents.eprAdjustment,
      min: -40,
      max: 40,
      value: estimateComponents.eprAdjustment,
      explanation:
        "Reflects how pricing maturity changes achievability versus the benchmark.",
    },
    {
      key: "scopeAdjustment" as const,
      label: "Scope adjustment",
      contribution: estimateComponents.scopeAdjustment,
      min: -30,
      max: 30,
      value: estimateComponents.scopeAdjustment,
      explanation:
        "Adjusts for the size and shape of categories and levers included in scope.",
    },
    {
      key: "clientDataAdjustment" as const,
      label: "Client data adjustment",
      contribution: estimateComponents.clientDataAdjustment,
      min: -20,
      max: 35,
      value: estimateComponents.clientDataAdjustment,
      explanation:
        "Adds or reduces value based on client uploads and specificity of internal inputs.",
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
              Confidence & Assumptions
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
              Editable confidence model
            </h2>
          </div>
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-[var(--ui-navy)]">
            {confidenceLabel} confidence
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {[
            ["overall", "Overall confidence"],
            ["benchmarkRelevance", "Benchmark relevance"],
            ["dataQuality", "Data quality"],
            ["assumptionStrength", "Assumption strength"],
          ].map(([key, label]) => (
            <label key={key} className={subCard}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-[var(--ui-navy)]">
                  {label}
                </span>
                <span className="text-sm font-bold text-[var(--ui-blue)]">
                  {confidenceInputs[key as keyof ConfidenceInputs]}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={confidenceInputs[key as keyof ConfidenceInputs]}
                onChange={(event) =>
                  updateConfidenceInput(
                    key as keyof ConfidenceInputs,
                    Number(event.target.value)
                  )
                }
                className="mt-3 w-full accent-[var(--ui-blue)]"
              />
            </label>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {[
            ["elasticity", "Elasticity"],
            ["promoIncrementality", "Promo incrementality"],
            ["markdownRecovery", "Markdown recovery"],
          ].map(([key, label]) => (
            <label key={key} className={subCard}>
              <span className="text-sm font-semibold text-[var(--ui-navy)]">
                {label}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="80"
                  max="120"
                  value={assumptions[key as keyof AssumptionInputs]}
                  onChange={(event) =>
                    updateAssumption(
                      key as keyof AssumptionInputs,
                      clampNumber(Number(event.target.value), 80, 120)
                    )
                  }
                  className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-sm text-gray-500">% of base</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className={`${sectionCard} space-y-4`}>
        <h2 className="text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
          Top Actions
        </h2>

        <div className="grid gap-3 lg:grid-cols-2">
          {actions.map((action, index) => {
            const leverKey = action.lever.toLowerCase() as keyof LeverContributions;
            const estimatedImpact = Math.round(scopedLeverContributions[leverKey] * 0.35);

            return (
              <div
                key={action.id}
                className={`rounded-xl border p-4 shadow-sm ${
                  action.highlighted
                    ? "border-[var(--ui-blue)] bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ui-navy)]">
                      {index + 1}. {action.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {action.lever} | Impact {formatSignedBps(estimatedImpact)} | Effort {action.effort}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveAction(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveAction(index, 1)}
                      disabled={index === actions.length - 1}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 disabled:opacity-40"
                    >
                      Down
                    </button>
                  </div>
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
                  <button
                    type="button"
                    onClick={() => toggleAction(action.id, "highlighted")}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      action.highlighted
                        ? "border-blue-200 bg-white text-[var(--ui-blue)]"
                        : "border-gray-200 bg-gray-50 text-gray-600"
                    }`}
                  >
                    {action.highlighted ? "Priority" : "Mark priority"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
