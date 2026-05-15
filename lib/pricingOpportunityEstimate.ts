import {
  getInternalBenchmarkRepository,
  getPricingPovStore,
  type ElasticityBenchmark,
  type InternalBenchmarkDataset,
  type PricingPovGuidanceItem,
} from "./internalDataStores";

export type PricingOpportunityConfidence = "high" | "medium" | "low";

export type PricingOpportunityEstimate = {
  pricing: {
    total_bps: number;
    total_dollar_impact: number | null;
    kvis_bps: number | null;
    architecture_bps: number | null;
    zoning_bps: number | null;
    confidence: PricingOpportunityConfidence;
    diagnostics: {
      matched_skus: number;
      unmatched_skus: number;
      match_coverage_pct: number;
      avg_price_gap_pct: number;
      pct_above_benchmark: number;
      kvi_candidates_count: number;
      architecture_issue_count: number;
      zoning_issue_count: number;
    };
    assumptions: string[];
    guardrails: string[];
    povReferences: string[];
    contextAdjustments: string[];
  };
};

type ScopeInput = {
  annualRevenue?: string | number | null;
  addressableRevenuePct?: string | number | null;
  retailerFormat?: string | null;
  selectedLeverIds?: string[];
};

type ClientContextInput = {
  eprAverageScore?: number | null;
  eprMaturityLabel?: string | null;
  additionalContext?: string | null;
  structuredContext?: {
    pricingModel?: string | null;
    retailerFormat?: string | null;
    scopeSignal?: string | null;
  } | null;
};

type CompetitorInput = {
  name?: string | null;
  format?: string | null;
  pricePosition?: string | null;
};

export type PricingOpportunityRequest = {
  matchedPricingOutput?: unknown;
  matchedPricingPairs?: unknown;
  pricingMatches?: unknown;
  matches?: unknown;
  unmatchedSkus?: unknown;
  unmatchedCount?: unknown;
  scopeInputs?: ScopeInput;
  clientContext?: ClientContextInput;
  competitors?: CompetitorInput[];
};

type NormalizedMatchedPair = {
  clientSku: string | null;
  walmartSku: string | null;
  itemName: string;
  category: string;
  brand: string;
  clientPrice: number | null;
  walmartPrice: number | null;
  clientUnitPrice: number | null;
  walmartUnitPrice: number | null;
  packSize: number | null;
  kviFlag: boolean | null;
  matchConfidence: number | null;
  geography: string | null;
};

type ContextModifiers = {
  kviThresholdPct: number;
  architectureThresholdPct: number;
  zoningThresholdPct: number;
  recoverabilityMultiplier: number;
  rationale: string[];
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const firstPresent = (
  record: Record<string, unknown>,
  keys: string[]
): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }

  return null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toBooleanFlag = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1", "kvi", "key value item"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "n", "0"].includes(normalized)) return false;

  return null;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = toRecord(value);
  for (const key of ["matched", "matches", "rows", "items", "pairs"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  return [];
};

const normalizeMatchedPair = (value: unknown): NormalizedMatchedPair => {
  const record = toRecord(value);
  const itemName = String(
    firstPresent(record, [
      "itemName",
      "name",
      "description",
      "clientDescription",
      "productName",
      "title",
    ]) ?? ""
  );
  const category = String(
    firstPresent(record, ["category", "clientCategory", "walmartCategory", "department"]) ?? ""
  );

  return {
    clientSku: firstPresent(record, ["clientSku", "sku", "clientItemId", "itemId"]) as
      | string
      | null,
    walmartSku: firstPresent(record, ["walmartSku", "benchmarkSku", "walmartItemId"]) as
      | string
      | null,
    itemName,
    category,
    brand: String(firstPresent(record, ["brand", "clientBrand", "walmartBrand"]) ?? ""),
    clientPrice: toNumber(firstPresent(record, ["clientPrice", "price", "retailerPrice"])),
    walmartPrice: toNumber(
      firstPresent(record, ["walmartPrice", "benchmarkPrice", "matchedWalmartPrice"])
    ),
    clientUnitPrice: toNumber(firstPresent(record, ["clientUnitPrice", "unitPrice"])),
    walmartUnitPrice: toNumber(
      firstPresent(record, ["walmartUnitPrice", "benchmarkUnitPrice"])
    ),
    packSize: toNumber(firstPresent(record, ["packSize", "size", "unitSize", "ounces", "oz"])),
    kviFlag: toBooleanFlag(firstPresent(record, ["kviFlag", "isKvi", "kvi", "knownValueItem"])),
    matchConfidence: toNumber(firstPresent(record, ["matchConfidence", "confidence", "score"])),
    geography:
      (firstPresent(record, ["region", "state", "zone", "market", "storeRegion"]) as string | null) ??
      null,
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const median = (values: number[]) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[midpoint - 1] || 0) + (sorted[midpoint] || 0)) / 2
    : sorted[midpoint] || null;
};

const getWalmartDataset = (datasets: InternalBenchmarkDataset[]) =>
  datasets.find(
    (dataset) =>
      dataset.benchmarkKind === "walmart_scrape" ||
      dataset.retailer.toLowerCase().includes("walmart")
  ) || null;

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const categoryMatchesBenchmark = (
  category: string,
  walmartDataset: InternalBenchmarkDataset | null
) => {
  if (!walmartDataset || !category.trim()) return false;
  const normalizedCategory = normalizeText(category);
  return walmartDataset.categories.some((benchmarkCategory) => {
    const normalizedBenchmarkCategory = normalizeText(benchmarkCategory.name);
    return (
      normalizedBenchmarkCategory.includes(normalizedCategory) ||
      normalizedCategory.includes(normalizedBenchmarkCategory.split(" ")[0] || "")
    );
  });
};

const findElasticityBenchmark = (
  category: string,
  elasticityBenchmarks: ElasticityBenchmark[]
) => {
  const normalizedCategory = normalizeText(category);
  if (!normalizedCategory) return null;

  return (
    elasticityBenchmarks.find((benchmark) => {
      const normalizedSegment = normalizeText(benchmark.segment);
      return (
        normalizedCategory.includes(normalizedSegment) ||
        normalizedSegment
          .split(" ")
          .some((token) => token.length > 3 && normalizedCategory.includes(token))
      );
    }) || null
  );
};

const isConservativeKviHeuristic = (pair: NormalizedMatchedPair) => {
  const signal = normalizeText(`${pair.itemName} ${pair.category}`);
  return /\b(milk|egg|eggs|bread|butter|cereal|banana|diaper|detergent|toothpaste|paper towel|pet food|coffee)\b/.test(
    signal
  );
};

const calculateContextModifiers = (
  scopeInputs: ScopeInput | undefined,
  clientContext: ClientContextInput | undefined,
  competitors: CompetitorInput[] | undefined
): ContextModifiers => {
  const pricingModel = normalizeText(clientContext?.structuredContext?.pricingModel || "");
  const retailerFormat = normalizeText(
    scopeInputs?.retailerFormat || clientContext?.structuredContext?.retailerFormat || ""
  );
  const strategicContext = normalizeText(clientContext?.additionalContext || "");
  const competitorSignals = normalizeText(
    (competitors || [])
      .map((competitor) => `${competitor.name || ""} ${competitor.pricePosition || ""}`)
      .join(" ")
  );
  const eprScore =
    typeof clientContext?.eprAverageScore === "number"
      ? clientContext.eprAverageScore
      : null;

  let kviThresholdPct = 3;
  let architectureThresholdPct = 4;
  let zoningThresholdPct = 3;
  let recoverabilityMultiplier = 1;
  const rationale: string[] = [];

  if (pricingModel.includes("edlp")) {
    kviThresholdPct = 2;
    zoningThresholdPct = 2.5;
    recoverabilityMultiplier *= 0.95;
    rationale.push("EDLP posture tightens acceptable KVI and zone gaps.");
  }
  if (pricingModel.includes("high low") || pricingModel.includes("premium")) {
    kviThresholdPct = 4.5;
    architectureThresholdPct = 5;
    recoverabilityMultiplier *= 0.9;
    rationale.push("High-low or premium posture relaxes some price-gap thresholds.");
  }
  if (pricingModel.includes("hybrid")) {
    kviThresholdPct = 3.5;
    rationale.push("Hybrid posture keeps KVI thresholds near benchmark norms.");
  }
  if (eprScore !== null && eprScore < 2.75) {
    recoverabilityMultiplier *= 1.15;
    rationale.push("Lower EPR maturity increases recoverability of supported pricing gaps.");
  } else if (eprScore !== null && eprScore >= 4.25) {
    recoverabilityMultiplier *= 0.75;
    rationale.push("Advanced EPR maturity reduces recoverable opportunity from observed gaps.");
  }
  if (retailerFormat.includes("club")) {
    architectureThresholdPct += 1;
    rationale.push("Club format requires extra caution on pack-size architecture reads.");
  }
  if (competitorSignals.includes("walmart") || competitorSignals.includes("value")) {
    kviThresholdPct = Math.max(2, kviThresholdPct - 0.5);
    rationale.push("Value-oriented competitive set tightens KVI gap interpretation.");
  }
  if (strategicContext.includes("regional") || strategicContext.includes("market")) {
    zoningThresholdPct = Math.max(2, zoningThresholdPct - 0.5);
    rationale.push("Strategic context includes local or regional pricing signals.");
  }

  return {
    kviThresholdPct,
    architectureThresholdPct,
    zoningThresholdPct,
    recoverabilityMultiplier: clamp(recoverabilityMultiplier, 0.65, 1.25),
    rationale,
  };
};

const getRevenueBase = (scopeInputs: ScopeInput | undefined) => {
  const annualRevenue = toNumber(scopeInputs?.annualRevenue);
  if (!annualRevenue || annualRevenue <= 0) return null;
  const addressableRevenuePct = clamp(
    toNumber(scopeInputs?.addressableRevenuePct) ?? 100,
    0,
    100
  );
  return annualRevenue * (addressableRevenuePct / 100);
};

const guidanceReferences = (items: PricingPovGuidanceItem[], limit: number) =>
  items.slice(0, limit).map((item) => `${item.sourceFile}: ${item.guidance.slice(0, 180)}`);

export const calculatePricingOpportunity = (
  request: PricingOpportunityRequest
): PricingOpportunityEstimate => {
  const benchmarkRepository = getInternalBenchmarkRepository();
  const povStore = getPricingPovStore();
  const walmartDataset = getWalmartDataset(benchmarkRepository.datasets);
  const rawMatches = asArray(
    request.matchedPricingOutput ??
      request.matchedPricingPairs ??
      request.pricingMatches ??
      request.matches
  );
  const matchedPairs = rawMatches
    .map(normalizeMatchedPair)
    .filter(
      (pair) =>
        pair.clientPrice !== null &&
        pair.clientPrice > 0 &&
        pair.walmartPrice !== null &&
        pair.walmartPrice > 0
    );
  const unmatchedSkus = Array.isArray(request.unmatchedSkus)
    ? request.unmatchedSkus.length
    : toNumber(request.unmatchedCount) ?? 0;
  const contextModifiers = calculateContextModifiers(
    request.scopeInputs,
    request.clientContext,
    request.competitors
  );
  const guardrails = [
    "Promotions and markdown are excluded from this pricing-only estimate.",
    "Only matched rows with observed client and Walmart prices are scored.",
    "KVI status is used only when explicit or supported by conservative item heuristics.",
    "Zoning is zero/null unless geography exists in the matched pricing data.",
    "Benchmark caps limit the influence of noisy item-level gaps.",
  ];

  console.info(
    "[opportunity-estimate] Pricing route inputs:",
    JSON.stringify({
      rawMatchedRecords: rawMatches.length,
      usableMatchedRecords: matchedPairs.length,
      unmatchedSkus,
      benchmarkAvailable: Boolean(walmartDataset),
      benchmarkDatasetCount: benchmarkRepository.datasets.length,
      elasticityBenchmarkCount: benchmarkRepository.elasticityBenchmarks.length,
      povGuidanceAvailable: povStore.guidanceCount > 0,
      contextModifierAvailable: Boolean(request.clientContext || request.scopeInputs),
      missingRequiredInputs: matchedPairs.length === 0 ? ["matchedPricingPairs"] : [],
    })
  );

  if (matchedPairs.length === 0) {
    return {
      pricing: {
        total_bps: 0,
        total_dollar_impact: null,
        kvis_bps: null,
        architecture_bps: null,
        zoning_bps: null,
        confidence: "low",
        diagnostics: {
          matched_skus: 0,
          unmatched_skus: unmatchedSkus,
          match_coverage_pct: 0,
          avg_price_gap_pct: 0,
          pct_above_benchmark: 0,
          kvi_candidates_count: 0,
          architecture_issue_count: 0,
          zoning_issue_count: 0,
        },
        assumptions: [
          "Matched pricing output is missing or has no rows with both client and Walmart prices.",
        ],
        guardrails,
        povReferences: guidanceReferences(
          [
            ...povStore.guidance.kviGuidance,
            ...povStore.guidance.architecturePrinciples,
            ...povStore.guidance.zoningPrinciples,
          ],
          4
        ),
        contextAdjustments: contextModifiers.rationale,
      },
    };
  }

  const priceGaps = matchedPairs.map((pair) =>
    ((pair.clientPrice || 0) - (pair.walmartPrice || 0)) / (pair.walmartPrice || 1)
  );
  const avgPriceGapPct = round(
    (priceGaps.reduce((total, gap) => total + gap, 0) / priceGaps.length) * 100,
    1
  );
  const pctAboveBenchmark = round(
    (priceGaps.filter((gap) => gap > 0).length / priceGaps.length) * 100,
    1
  );
  const matchCoveragePct = round(
    (matchedPairs.length / Math.max(matchedPairs.length + unmatchedSkus, 1)) * 100,
    1
  );

  const kviCandidates = matchedPairs.filter((pair) => {
    if (pair.kviFlag === true) return true;
    if (pair.kviFlag === false) return false;
    if (pair.matchConfidence !== null && pair.matchConfidence < 0.7) return false;
    return isConservativeKviHeuristic(pair);
  });
  const kviMeaningfulGaps = kviCandidates
    .map((pair) => {
      const walmartPrice = pair.walmartPrice || 0;
      const clientPrice = pair.clientPrice || 0;
      const gapPct = ((clientPrice - walmartPrice) / walmartPrice) * 100;
      const categoryMatch = categoryMatchesBenchmark(pair.category, walmartDataset);
      const elasticityBenchmark = categoryMatch
        ? findElasticityBenchmark(pair.category, benchmarkRepository.elasticityBenchmarks)
        : null;
      const elasticityModifier = elasticityBenchmark
        ? clamp(
            1 + (Math.abs(elasticityBenchmark.elasticityRange[0]) - 1.5) * 0.05,
            0.9,
            1.1
          )
        : 1;

      return {
        pair,
        gapPct,
        categoryMatch,
        elasticityModifier,
        meaningful: Math.abs(gapPct) >= contextModifiers.kviThresholdPct,
      };
    })
    .filter((item) => item.meaningful);
  const kviUnderBenchmark = kviMeaningfulGaps.filter((item) => item.gapPct < 0);
  const kviWeightedGap =
    kviUnderBenchmark.length === 0
      ? 0
      : kviUnderBenchmark.reduce(
          (total, item) =>
            total +
            Math.min(
              Math.abs(item.gapPct) - contextModifiers.kviThresholdPct,
              8
            ) *
              item.elasticityModifier,
          0
        ) / kviCandidates.length;
  const kvisBps =
    kviCandidates.length === 0
      ? null
      : Math.round(
          clamp(kviWeightedGap * 2.8 * contextModifiers.recoverabilityMultiplier, 0, 35)
        );

  const architectureGroups = new Map<string, NormalizedMatchedPair[]>();
  matchedPairs.forEach((pair) => {
    const groupKey = normalizeText(`${pair.category} ${pair.brand || ""}`);
    if (!groupKey || pair.clientUnitPrice === null || pair.packSize === null) return;
    architectureGroups.set(groupKey, [...(architectureGroups.get(groupKey) || []), pair]);
  });
  let architectureIssueCount = 0;
  let architectureEligibleGroups = 0;
  architectureGroups.forEach((pairs) => {
    if (pairs.length < 3) return;
    architectureEligibleGroups += 1;
    const sortedPairs = [...pairs].sort(
      (left, right) => (left.packSize || 0) - (right.packSize || 0)
    );

    for (let index = 1; index < sortedPairs.length; index += 1) {
      const previous = sortedPairs[index - 1];
      const current = sortedPairs[index];
      if (
        previous.clientUnitPrice !== null &&
        current.clientUnitPrice !== null &&
        current.clientUnitPrice >
          previous.clientUnitPrice * (1 + contextModifiers.architectureThresholdPct / 100)
      ) {
        architectureIssueCount += 1;
      }
    }
  });
  const architectureBps =
    architectureEligibleGroups === 0
      ? null
      : Math.round(
          clamp(
            (architectureIssueCount / Math.max(architectureEligibleGroups, 1)) *
              8 *
              contextModifiers.recoverabilityMultiplier,
            0,
            40
          )
        );

  const geographyGroups = new Map<string, number[]>();
  matchedPairs.forEach((pair) => {
    if (!pair.geography) return;
    const walmartPrice = pair.walmartPrice || 0;
    if (walmartPrice <= 0 || pair.clientPrice === null) return;
    geographyGroups.set(pair.geography, [
      ...(geographyGroups.get(pair.geography) || []),
      ((pair.clientPrice - walmartPrice) / walmartPrice) * 100,
    ]);
  });
  const regionalGapMedians = Array.from(geographyGroups.values())
    .map((values) => median(values))
    .filter((value): value is number => value !== null);
  const zoningSpread =
    regionalGapMedians.length >= 2
      ? Math.max(...regionalGapMedians) - Math.min(...regionalGapMedians)
      : 0;
  const zoningIssueCount =
    regionalGapMedians.length >= 2 && zoningSpread >= contextModifiers.zoningThresholdPct
      ? regionalGapMedians.length
      : 0;
  const zoningBps =
    regionalGapMedians.length < 2
      ? null
      : Math.round(
          clamp(
            (zoningSpread - contextModifiers.zoningThresholdPct) *
              3 *
              contextModifiers.recoverabilityMultiplier,
            0,
            25
          )
        );

  const selectedPricingLevers = request.scopeInputs?.selectedLeverIds || [];
  const kviContribution =
    selectedPricingLevers.length === 0 || selectedPricingLevers.includes("kvis")
      ? kvisBps ?? 0
      : 0;
  const architectureContribution =
    selectedPricingLevers.length === 0 ||
    selectedPricingLevers.includes("price-architecture")
      ? architectureBps ?? 0
      : 0;
  const zoningContribution =
    selectedPricingLevers.length === 0 || selectedPricingLevers.includes("price-zoning")
      ? zoningBps ?? 0
      : 0;
  const totalBps = Math.round(
    clamp(kviContribution + architectureContribution + zoningContribution, 0, 85)
  );
  const revenueBase = getRevenueBase(request.scopeInputs);
  const totalDollarImpact =
    revenueBase === null ? null : Math.round(revenueBase * (totalBps / 10000));
  const confidence: PricingOpportunityConfidence =
    matchedPairs.length >= 50 && matchCoveragePct >= 70 && walmartDataset
      ? "high"
      : matchedPairs.length >= 15 && matchCoveragePct >= 45 && walmartDataset
        ? "medium"
        : "low";

  return {
    pricing: {
      total_bps: totalBps,
      total_dollar_impact: totalDollarImpact,
      kvis_bps: kvisBps,
      architecture_bps: architectureBps,
      zoning_bps: zoningBps,
      confidence,
      diagnostics: {
        matched_skus: matchedPairs.length,
        unmatched_skus: unmatchedSkus,
        match_coverage_pct: matchCoveragePct,
        avg_price_gap_pct: avgPriceGapPct,
        pct_above_benchmark: pctAboveBenchmark,
        kvi_candidates_count: kviCandidates.length,
        architecture_issue_count: architectureIssueCount,
        zoning_issue_count: zoningIssueCount,
      },
      assumptions: [
        `Meaningful KVI gap threshold: ${contextModifiers.kviThresholdPct.toFixed(1)}%.`,
        `Meaningful architecture threshold: ${contextModifiers.architectureThresholdPct.toFixed(1)}%.`,
        regionalGapMedians.length < 2
          ? "Zoning is not scored because matched pricing data does not include at least two geographies."
          : `Meaningful zoning spread threshold: ${contextModifiers.zoningThresholdPct.toFixed(1)}%.`,
        "Elasticity benchmarks modify recoverability only when a category match is found.",
      ],
      guardrails,
      povReferences: guidanceReferences(
        [
          ...povStore.guidance.kviGuidance,
          ...povStore.guidance.pricingThresholds,
          ...povStore.guidance.architecturePrinciples,
          ...povStore.guidance.zoningPrinciples,
          ...povStore.guidance.guardrails,
        ],
        6
      ),
      contextAdjustments: contextModifiers.rationale,
    },
  };
};
