import fs from "node:fs";
import path from "node:path";
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
    drilldown: PricingDiagnosticDrilldown;
    matchDiagnostics: MatchBuildResult["diagnostics"];
  };
};

export type PricingDiagnosticDrilldown = {
  kvi: {
    pct_above_benchmark: number | null;
    avg_gap_pct: number | null;
    matched_kvi_count: number;
    match_confidence_pct: number | null;
    insight: string;
    top_gaps: {
      sku: string;
      item: string;
      client_price: number;
      benchmark_price: number;
      gap_pct: number;
      category: string;
      confidence_pct: number | null;
    }[];
  };
  architecture: {
    status: "available" | "insufficient_data";
    insight: string;
    examples: {
      title: string;
      category: string;
      issue_count: number;
      points: {
        label: string;
        pack_size: number;
        client_unit_price: number;
        benchmark_unit_price: number | null;
        client_price: number;
        benchmark_price: number;
      }[];
      issues: string[];
    }[];
  };
  zoning: {
    status: "available" | "insufficient_data";
    insight: string;
    confidence: PricingOpportunityConfidence;
    coverage_pct: number;
    rows: {
      zone: string;
      matched_skus: number;
      avg_gap_pct: number;
      pct_above_benchmark: number;
    }[];
  };
  opportunity_breakdown: {
    lever: "KVI" | "Price Architecture" | "Price Zoning";
    bps: number | null;
    rationale: string;
    benchmark_references: string[];
    context_adjustments: string[];
    confidence: PricingOpportunityConfidence;
  }[];
  recommended_actions: {
    title: string;
    finding: string;
    impact_range_bps: string;
    confidence: PricingOpportunityConfidence;
  }[];
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
  clientPricingRows?: unknown;
  clientRows?: unknown;
  clientUploadRows?: unknown;
  pricingRows?: unknown;
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

type FieldKey =
  | "upc"
  | "sku"
  | "item"
  | "category"
  | "brand"
  | "price"
  | "unitPrice"
  | "packSize"
  | "kvi"
  | "geography";

type NormalizedSourceRecord = {
  source: "client" | "benchmark";
  raw: Record<string, unknown>;
  upc: string | null;
  sku: string | null;
  itemName: string;
  category: string;
  brand: string;
  price: number | null;
  unitPrice: number | null;
  packSize: number | null;
  kviFlag: boolean | null;
  geography: string | null;
};

type MatchBuildResult = {
  matches: NormalizedMatchedPair[];
  unmatchedCount: number;
  diagnostics: {
    clientRowCount: number;
    benchmarkRowCount: number;
    benchmarkDatasetCount: number;
    clientColumnsDetected: Partial<Record<FieldKey, string>>;
    benchmarkColumnsDetected: Partial<Record<FieldKey, string>>;
    exactUpcMatches: number;
    exactSkuMatches: number;
    fuzzyMatches: number;
    unmatchedRows: number;
    emptyReason: string | null;
  };
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

const fieldAliases: Record<FieldKey, string[]> = {
  upc: ["upc", "gtin", "barcode", "ean", "universal product code"],
  sku: [
    "sku",
    "clientsku",
    "client sku",
    "itemid",
    "item id",
    "product sku",
    "product_sku",
    "walmart sku",
    "walmart item id",
  ],
  item: [
    "item",
    "item name",
    "product",
    "product name",
    "product_name",
    "description",
    "product_description",
    "title",
  ],
  category: ["category", "breadcrumb", "department", "class", "subcategory"],
  brand: ["brand", "product brand", "product_brand", "manufacturer"],
  price: [
    "price",
    "client price",
    "retailer price",
    "regular price",
    "regular_price",
    "sales price",
    "sales_price",
    "current price",
  ],
  unitPrice: ["unit price", "unit_price", "price per unit", "ppu"],
  packSize: [
    "pack size",
    "pack_size",
    "size",
    "product size",
    "product_size",
    "container size",
    "container_size",
    "ounces",
    "oz",
  ],
  kvi: ["kvi", "is kvi", "kvi flag", "known value item", "key value item"],
  geography: ["region", "state", "zone", "market", "store region", "store_region"],
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

const normalizeColumnName = (value: string) =>
  value.toLowerCase().replace(/[_-]+/g, " ").replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, " ").trim();

const detectColumns = (records: Record<string, unknown>[]) => {
  const detected: Partial<Record<FieldKey, string>> = {};
  const columns = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  const normalizedColumns = columns.map((column) => ({
    raw: column,
    normalized: normalizeColumnName(column),
  }));

  (Object.keys(fieldAliases) as FieldKey[]).forEach((field) => {
    const match = normalizedColumns.find((column) =>
      fieldAliases[field].some((alias) => column.normalized === normalizeColumnName(alias))
    );
    if (match) detected[field] = match.raw;
  });

  return detected;
};

const getMappedValue = (
  record: Record<string, unknown>,
  detectedColumns: Partial<Record<FieldKey, string>>,
  field: FieldKey
) => {
  const detectedColumn = detectedColumns[field];
  if (detectedColumn && record[detectedColumn] !== undefined) return record[detectedColumn];

  const normalizedEntries = Object.entries(record).map(([key, value]) => [
    normalizeColumnName(key),
    value,
  ] as const);
  const aliases = fieldAliases[field].map(normalizeColumnName);
  return normalizedEntries.find(([key]) => aliases.includes(key))?.[1] ?? null;
};

const normalizeIdentifier = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const rawValue = String(value).trim();
  if (!rawValue) return null;
  const numericValue = Number(rawValue);
  const normalized =
    /e\+/i.test(rawValue) && Number.isFinite(numericValue)
      ? numericValue.toFixed(0)
      : rawValue;
  const digits = normalized.replace(/\D/g, "");
  return digits || normalized.toLowerCase().replace(/[^a-z0-9]+/g, "");
};

const normalizeRecords = (
  rows: unknown[],
  source: NormalizedSourceRecord["source"],
  detectedColumns: Partial<Record<FieldKey, string>>
): NormalizedSourceRecord[] =>
  rows.map((row) => {
    const record = toRecord(row);
    const price = toNumber(getMappedValue(record, detectedColumns, "price"));
    const packSize = toNumber(getMappedValue(record, detectedColumns, "packSize"));
    const unitPrice =
      toNumber(getMappedValue(record, detectedColumns, "unitPrice")) ??
      (price !== null && packSize !== null && packSize > 0 ? price / packSize : null);

    return {
      source,
      raw: record,
      upc: normalizeIdentifier(getMappedValue(record, detectedColumns, "upc")),
      sku: normalizeIdentifier(getMappedValue(record, detectedColumns, "sku")),
      itemName: String(getMappedValue(record, detectedColumns, "item") ?? ""),
      category: String(getMappedValue(record, detectedColumns, "category") ?? ""),
      brand: String(getMappedValue(record, detectedColumns, "brand") ?? ""),
      price,
      unitPrice,
      packSize,
      kviFlag: toBooleanFlag(getMappedValue(record, detectedColumns, "kvi")),
      geography: (getMappedValue(record, detectedColumns, "geography") as string | null) ?? null,
    };
  });

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
};

const csvRowsToRecords = (rows: string[][]) => {
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
  );
};

let benchmarkRecordCache: { records: Record<string, unknown>[]; columns: string[] } | null = null;

const loadBenchmarkRecords = () => {
  if (benchmarkRecordCache) return benchmarkRecordCache;

  const candidatePaths = [
    path.join(process.cwd(), "Internal Data", "Walmart Scape.csv"),
    path.join(process.cwd(), "Walmart Scape.csv"),
  ];
  const csvPath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath));
  if (!csvPath) {
    benchmarkRecordCache = { records: [], columns: [] };
    return benchmarkRecordCache;
  }

  const csvRows = parseCsvRows(fs.readFileSync(csvPath, "utf8"));
  benchmarkRecordCache = {
    records: csvRowsToRecords(csvRows),
    columns: csvRows[0] ?? [],
  };
  return benchmarkRecordCache;
};

const tokenSet = (value: string) =>
  new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3)
  );

const similarityScore = (left: string, right: string) => {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

const toMatchedPair = (
  client: NormalizedSourceRecord,
  benchmark: NormalizedSourceRecord,
  matchConfidence: number
): NormalizedMatchedPair => ({
  clientSku: client.sku,
  walmartSku: benchmark.sku,
  itemName: client.itemName || benchmark.itemName,
  category: client.category || benchmark.category,
  brand: client.brand || benchmark.brand,
  clientPrice: client.price,
  walmartPrice: benchmark.price,
  clientUnitPrice: client.unitPrice,
  walmartUnitPrice: benchmark.unitPrice,
  packSize: client.packSize ?? benchmark.packSize,
  kviFlag: client.kviFlag,
  matchConfidence,
  geography: client.geography,
});

const buildMatchesFromSourceRows = (
  clientRows: unknown[],
  benchmarkDatasetCount: number
): MatchBuildResult => {
  const clientRecords = clientRows.map(toRecord);
  const benchmarkLoad = loadBenchmarkRecords();
  const benchmarkRecords = benchmarkLoad.records;
  const clientColumnsDetected = detectColumns(clientRecords);
  const benchmarkColumnsDetected = detectColumns(benchmarkRecords.slice(0, 100));
  const normalizedClientRows = normalizeRecords(clientRows, "client", clientColumnsDetected).filter(
    (row) => row.price !== null && (row.upc || row.sku || row.itemName)
  );
  const normalizedBenchmarkRows = normalizeRecords(
    benchmarkRecords,
    "benchmark",
    benchmarkColumnsDetected
  ).filter((row) => row.price !== null && (row.upc || row.sku || row.itemName));
  const diagnostics: MatchBuildResult["diagnostics"] = {
    clientRowCount: clientRows.length,
    benchmarkRowCount: benchmarkRecords.length,
    benchmarkDatasetCount,
    clientColumnsDetected,
    benchmarkColumnsDetected,
    exactUpcMatches: 0,
    exactSkuMatches: 0,
    fuzzyMatches: 0,
    unmatchedRows: 0,
    emptyReason: null,
  };

  if (clientRows.length === 0) {
    diagnostics.emptyReason =
      "Client pricing upload rows are missing. The current request contains no client row payload for the matcher.";
    return { matches: [], unmatchedCount: 0, diagnostics };
  }
  if (benchmarkRecords.length === 0) {
    diagnostics.emptyReason =
      "Walmart benchmark source rows are missing. The internal CSV could not be loaded server-side.";
    diagnostics.unmatchedRows = clientRows.length;
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }

  const upcIndex = new Map<string, NormalizedSourceRecord>();
  const skuIndex = new Map<string, NormalizedSourceRecord>();
  const tokenIndex = new Map<string, NormalizedSourceRecord[]>();

  normalizedBenchmarkRows.forEach((row) => {
    if (row.upc && !upcIndex.has(row.upc)) upcIndex.set(row.upc, row);
    if (row.sku && !skuIndex.has(row.sku)) skuIndex.set(row.sku, row);
    const tokens = [...tokenSet(`${row.brand} ${row.itemName}`)].slice(0, 4);
    tokens.forEach((token) => {
      tokenIndex.set(token, [...(tokenIndex.get(token) || []), row]);
    });
  });

  const matches: NormalizedMatchedPair[] = [];
  normalizedClientRows.forEach((client) => {
    if (client.upc && upcIndex.has(client.upc)) {
      diagnostics.exactUpcMatches += 1;
      matches.push(toMatchedPair(client, upcIndex.get(client.upc) as NormalizedSourceRecord, 1));
      return;
    }

    if (client.sku && skuIndex.has(client.sku)) {
      diagnostics.exactSkuMatches += 1;
      matches.push(toMatchedPair(client, skuIndex.get(client.sku) as NormalizedSourceRecord, 0.95));
      return;
    }

    const candidateTokens = [...tokenSet(`${client.brand} ${client.itemName}`)].slice(0, 4);
    const candidates = Array.from(
      new Set(candidateTokens.flatMap((token) => tokenIndex.get(token) || []))
    ).slice(0, 250);
    const bestCandidate = candidates
      .map((candidate) => ({
        candidate,
        score:
          similarityScore(`${client.brand} ${client.itemName}`, `${candidate.brand} ${candidate.itemName}`) +
          (client.category && candidate.category
            ? similarityScore(client.category, candidate.category) * 0.25
            : 0),
      }))
      .sort((left, right) => right.score - left.score)[0];

    if (bestCandidate && bestCandidate.score >= 0.5) {
      diagnostics.fuzzyMatches += 1;
      matches.push(toMatchedPair(client, bestCandidate.candidate, clamp(bestCandidate.score, 0.5, 0.9)));
      return;
    }

    diagnostics.unmatchedRows += 1;
  });

  return {
    matches,
    unmatchedCount: diagnostics.unmatchedRows,
    diagnostics,
  };
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

const average = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0) / values.length;

const confidenceToPct = (confidence: number | null) => {
  if (confidence === null) return null;
  return round(confidence <= 1 ? confidence * 100 : confidence, 0);
};

const emptyDrilldown = (
  insight: string,
  confidence: PricingOpportunityConfidence,
  povReferences: string[],
  contextAdjustments: string[]
): PricingDiagnosticDrilldown => ({
  kvi: {
    pct_above_benchmark: null,
    avg_gap_pct: null,
    matched_kvi_count: 0,
    match_confidence_pct: null,
    insight,
    top_gaps: [],
  },
  architecture: {
    status: "insufficient_data",
    insight: "Matched pricing rows need pack or size data before ladder diagnostics can be calculated.",
    examples: [],
  },
  zoning: {
    status: "insufficient_data",
    insight:
      "Matched pricing rows do not include enough geography to calculate zone-level pricing diagnostics.",
    confidence,
    coverage_pct: 0,
    rows: [],
  },
  opportunity_breakdown: [
    {
      lever: "KVI",
      bps: null,
      rationale: "KVI opportunity is not estimated until matched KVI pricing evidence is available.",
      benchmark_references: povReferences.slice(0, 2),
      context_adjustments: contextAdjustments,
      confidence,
    },
    {
      lever: "Price Architecture",
      bps: null,
      rationale:
        "Architecture opportunity is not estimated until matched rows include enough pack or tier relationships.",
      benchmark_references: povReferences.slice(0, 2),
      context_adjustments: contextAdjustments,
      confidence,
    },
    {
      lever: "Price Zoning",
      bps: null,
      rationale: "Zoning opportunity is not estimated without geography in the matched pricing data.",
      benchmark_references: povReferences.slice(0, 2),
      context_adjustments: contextAdjustments,
      confidence,
    },
  ],
  recommended_actions: [],
});

export const calculatePricingOpportunity = (
  request: PricingOpportunityRequest
): PricingOpportunityEstimate => {
  const benchmarkRepository = getInternalBenchmarkRepository();
  const povStore = getPricingPovStore();
  const walmartDataset = getWalmartDataset(benchmarkRepository.datasets);
  const clientSourceRows = asArray(
    request.clientPricingRows ??
      request.clientRows ??
      request.clientUploadRows ??
      request.pricingRows
  );
  const rawMatches = asArray(
    request.matchedPricingOutput ??
      request.matchedPricingPairs ??
      request.pricingMatches ??
      request.matches
  );
  const preMatchedPairs = rawMatches
    .map(normalizeMatchedPair)
    .filter(
      (pair) =>
        pair.clientPrice !== null &&
        pair.clientPrice > 0 &&
        pair.walmartPrice !== null &&
        pair.walmartPrice > 0
    );
  const builtMatchResult =
    preMatchedPairs.length === 0
      ? buildMatchesFromSourceRows(clientSourceRows, benchmarkRepository.datasets.length)
      : null;
  const matchedPairs = preMatchedPairs.length > 0 ? preMatchedPairs : builtMatchResult?.matches ?? [];
  const unmatchedSkus = Array.isArray(request.unmatchedSkus)
    ? request.unmatchedSkus.length
    : toNumber(request.unmatchedCount) ?? builtMatchResult?.unmatchedCount ?? 0;
  const fallbackMatchDiagnostics: MatchBuildResult["diagnostics"] = {
    clientRowCount: clientSourceRows.length || preMatchedPairs.length,
    benchmarkRowCount: walmartDataset?.rowCount ?? 0,
    benchmarkDatasetCount: benchmarkRepository.datasets.length,
    clientColumnsDetected: {},
    benchmarkColumnsDetected: {},
    exactUpcMatches: 0,
    exactSkuMatches: 0,
    fuzzyMatches: preMatchedPairs.length,
    unmatchedRows: unmatchedSkus,
    emptyReason:
      clientSourceRows.length === 0 && preMatchedPairs.length === 0
        ? "Client pricing upload rows are missing. The route received neither matched pairs nor raw client pricing rows."
        : null,
  };
  const matchDiagnostics = builtMatchResult?.diagnostics ?? fallbackMatchDiagnostics;
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
      clientRowCount: matchDiagnostics.clientRowCount,
      benchmarkRowCount: matchDiagnostics.benchmarkRowCount,
      rawMatchedRecords: rawMatches.length,
      usableMatchedRecords: matchedPairs.length,
      unmatchedSkus,
      benchmarkAvailable: Boolean(walmartDataset),
      benchmarkDatasetCount: benchmarkRepository.datasets.length,
      elasticityBenchmarkCount: benchmarkRepository.elasticityBenchmarks.length,
      povGuidanceAvailable: povStore.guidanceCount > 0,
      contextModifierAvailable: Boolean(request.clientContext || request.scopeInputs),
      clientColumnsDetected: matchDiagnostics.clientColumnsDetected,
      benchmarkColumnsDetected: matchDiagnostics.benchmarkColumnsDetected,
      exactUpcMatches: matchDiagnostics.exactUpcMatches,
      exactSkuMatches: matchDiagnostics.exactSkuMatches,
      fuzzyMatches: matchDiagnostics.fuzzyMatches,
      unmatchedRows: matchDiagnostics.unmatchedRows,
      emptyReason: matchDiagnostics.emptyReason,
      missingRequiredInputs: matchedPairs.length === 0 ? ["matchedPricingPairs"] : [],
    })
  );

  if (matchedPairs.length === 0) {
    const povReferences = guidanceReferences(
      [
        ...povStore.guidance.kviGuidance,
        ...povStore.guidance.architecturePrinciples,
        ...povStore.guidance.zoningPrinciples,
      ],
      4
    );

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
        povReferences,
        contextAdjustments: contextModifiers.rationale,
        drilldown: emptyDrilldown(
          matchDiagnostics.emptyReason ||
            "KVI diagnostics require matched client-to-Walmart pricing rows with observed prices.",
          "low",
          povReferences,
          contextModifiers.rationale
        ),
        matchDiagnostics,
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
  const kviGapRows = kviCandidates.map((pair) => {
    const gapPct = (((pair.clientPrice || 0) - (pair.walmartPrice || 0)) /
      (pair.walmartPrice || 1)) *
      100;

    return {
      pair,
      gapPct,
    };
  });
  const avgKviGapPct = average(kviGapRows.map((row) => row.gapPct));
  const pctKvisAboveBenchmark =
    kviGapRows.length === 0
      ? null
      : (kviGapRows.filter((row) => row.gapPct > 0).length / kviGapRows.length) * 100;
  const avgKviMatchConfidence = average(
    kviCandidates.flatMap((pair) =>
      pair.matchConfidence === null ? [] : [confidenceToPct(pair.matchConfidence) || 0]
    )
  );
  const topKviGaps = kviGapRows
    .sort((left, right) => Math.abs(right.gapPct) - Math.abs(left.gapPct))
    .slice(0, 8)
    .map(({ pair, gapPct }) => ({
      sku: pair.clientSku || pair.walmartSku || "Matched item",
      item: pair.itemName || pair.clientSku || "Matched item",
      client_price: round(pair.clientPrice || 0, 2),
      benchmark_price: round(pair.walmartPrice || 0, 2),
      gap_pct: round(gapPct, 1),
      category: pair.category || "Uncategorized",
      confidence_pct: confidenceToPct(pair.matchConfidence),
    }));
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
  const architectureExamples: PricingDiagnosticDrilldown["architecture"]["examples"] = [];
  architectureGroups.forEach((pairs, groupKey) => {
    if (pairs.length < 3) return;
    architectureEligibleGroups += 1;
    const sortedPairs = [...pairs].sort(
      (left, right) => (left.packSize || 0) - (right.packSize || 0)
    );
    let groupIssueCount = 0;
    const groupIssues: string[] = [];

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
        groupIssueCount += 1;
        groupIssues.push(
          `Pack ${current.packSize} has higher unit price than the smaller pack beyond the ${contextModifiers.architectureThresholdPct.toFixed(1)}% threshold.`
        );
      }
    }

    if (architectureExamples.length < 4) {
      architectureExamples.push({
        title: groupKey || "Matched ladder",
        category: sortedPairs[0]?.category || "Matched category",
        issue_count: groupIssueCount,
        points: sortedPairs.slice(0, 6).map((pair) => ({
          label: pair.itemName || pair.clientSku || "Matched item",
          pack_size: pair.packSize || 0,
          client_unit_price: round(pair.clientUnitPrice || 0, 2),
          benchmark_unit_price:
            pair.walmartUnitPrice === null ? null : round(pair.walmartUnitPrice, 2),
          client_price: round(pair.clientPrice || 0, 2),
          benchmark_price: round(pair.walmartPrice || 0, 2),
        })),
        issues:
          groupIssues.length > 0
            ? groupIssues.slice(0, 3)
            : ["No obvious ladder compression detected in this example."],
      });
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

  const zoningRows = Array.from(geographyGroups.entries())
    .map(([zone, gaps]) => ({
      zone,
      matched_skus: gaps.length,
      avg_gap_pct: round(average(gaps) || 0, 1),
      pct_above_benchmark: round(
        (gaps.filter((gap) => gap > 0).length / Math.max(gaps.length, 1)) * 100,
        1
      ),
    }))
    .sort((left, right) => right.matched_skus - left.matched_skus);

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
  const povReferences = guidanceReferences(
    [
      ...povStore.guidance.kviGuidance,
      ...povStore.guidance.pricingThresholds,
      ...povStore.guidance.architecturePrinciples,
      ...povStore.guidance.zoningPrinciples,
      ...povStore.guidance.guardrails,
    ],
    6
  );
  const kviInsight =
    kviCandidates.length === 0
      ? "No KVI diagnostics are shown because KVI status is missing and conservative KVI heuristics did not produce confident candidates."
      : `${kviCandidates.length} matched KVI candidate${kviCandidates.length === 1 ? "" : "s"} show an average ${round(avgKviGapPct || 0, 1)}% gap, interpreted against POV thresholds and elasticity only where category matches exist.`;
  const architectureInsight =
    architectureEligibleGroups === 0
      ? "Insufficient pack or size relationships exist in matched pricing rows to calculate ladder diagnostics."
      : `${architectureIssueCount} ladder issue${architectureIssueCount === 1 ? "" : "s"} found across ${architectureEligibleGroups} eligible pack or tier group${architectureEligibleGroups === 1 ? "" : "s"}.`;
  const zoningInsight =
    zoningRows.length < 2
      ? "Insufficient zoning data: matched pricing rows need at least two geographies before zone diagnostics are calculated."
      : `${zoningRows.length} geographies are available; observed regional gap spread is ${round(zoningSpread, 1)}%.`;
  const recommendedActions: PricingDiagnosticDrilldown["recommended_actions"] = [
    ...(kvisBps && kvisBps > 0
      ? [
          {
            title: "Rebalance KVI pricing",
            finding: `${round(Math.abs(avgKviGapPct || 0), 1)}% average KVI gap across matched KVI candidates.`,
            impact_range_bps: `+${Math.max(1, Math.round(kvisBps * 0.6))}-${kvisBps} bps`,
            confidence,
          },
        ]
      : []),
    ...(architectureBps && architectureBps > 0
      ? [
          {
            title: "Rebuild pack-price architecture",
            finding: `${architectureIssueCount} compressed or inconsistent ladder issue${architectureIssueCount === 1 ? "" : "s"} detected.`,
            impact_range_bps: `+${Math.max(1, Math.round(architectureBps * 0.6))}-${architectureBps} bps`,
            confidence,
          },
        ]
      : []),
    ...(zoningBps && zoningBps > 0
      ? [
          {
            title: "Improve zoning differentiation",
            finding: `${round(zoningSpread, 1)}% geographic price-gap spread across available zones.`,
            impact_range_bps: `+${Math.max(1, Math.round(zoningBps * 0.6))}-${zoningBps} bps`,
            confidence,
          },
        ]
      : []),
  ];

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
      povReferences,
      contextAdjustments: contextModifiers.rationale,
      drilldown: {
        kvi: {
          pct_above_benchmark:
            pctKvisAboveBenchmark === null ? null : round(pctKvisAboveBenchmark, 1),
          avg_gap_pct: avgKviGapPct === null ? null : round(avgKviGapPct, 1),
          matched_kvi_count: kviCandidates.length,
          match_confidence_pct:
            avgKviMatchConfidence === null ? null : round(avgKviMatchConfidence, 0),
          insight: kviInsight,
          top_gaps: topKviGaps,
        },
        architecture: {
          status: architectureEligibleGroups === 0 ? "insufficient_data" : "available",
          insight: architectureInsight,
          examples: architectureExamples,
        },
        zoning: {
          status: zoningRows.length < 2 ? "insufficient_data" : "available",
          insight: zoningInsight,
          confidence,
          coverage_pct: round(
            (matchedPairs.filter((pair) => pair.geography).length / matchedPairs.length) *
              100,
            1
          ),
          rows: zoningRows,
        },
        opportunity_breakdown: [
          {
            lever: "KVI",
            bps: kvisBps,
            rationale:
              kvisBps === null
                ? "KVI opportunity is not scored without confident KVI candidates."
                : "KVI bps reflect matched-item gaps versus benchmark, POV thresholds, elasticity modifiers where category matches exist, and context recoverability.",
            benchmark_references: povReferences.slice(0, 2),
            context_adjustments: contextModifiers.rationale,
            confidence,
          },
          {
            lever: "Price Architecture",
            bps: architectureBps,
            rationale:
              architectureBps === null
                ? "Architecture opportunity is not scored because pack or size relationships are too sparse."
                : "Architecture bps reflect observed unit-price ladder issues capped to a conservative benchmark range.",
            benchmark_references: povReferences.slice(2, 4),
            context_adjustments: contextModifiers.rationale,
            confidence,
          },
          {
            lever: "Price Zoning",
            bps: zoningBps,
            rationale:
              zoningBps === null
                ? "Zoning opportunity is not scored because geography is unavailable or too sparse."
                : "Zoning bps reflect geographic price-gap spread against POV thresholds and context modifiers.",
            benchmark_references: povReferences.slice(3, 5),
            context_adjustments: contextModifiers.rationale,
            confidence,
          },
        ],
        recommended_actions: recommendedActions,
      },
      matchDiagnostics,
    },
  };
};
