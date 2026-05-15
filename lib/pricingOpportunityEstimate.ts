import fs from "node:fs";
import path from "node:path";
import {
  getInternalBenchmarkRepository,
  getPricingPovStore,
  type ElasticityBenchmark,
  type InternalBenchmarkDataset,
  type PricingPovGuidanceItem,
} from "./internalDataStores";
import {
  normalizeClientUploads,
  type ClientUploadFilePayload,
  type ClientUploadNormalizationDiagnostics,
} from "./clientUploadNormalization";

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
  uploadedClientData?: unknown[];
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
  clientUploadFiles?: ClientUploadFilePayload[];
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
  packSizeText: string;
  kviFlag: boolean | null;
  geography: string | null;
};

type MatchBuildResult = {
  matches: NormalizedMatchedPair[];
  unmatchedCount: number;
  diagnostics: {
    clientRowCount: number;
    normalizedClientRowCount: number;
    benchmarkRowCount: number;
    normalizedBenchmarkRowCount: number;
    benchmarkDatasetCount: number;
    clientColumnsDetected: Partial<Record<FieldKey, string>>;
    benchmarkColumnsDetected: Partial<Record<FieldKey, string>>;
    fieldMapping: Record<FieldKey, { client: string | null; benchmark: string | null }>;
    sampleNormalizedClientRow: SafeNormalizedRecord | null;
    sampleNormalizedBenchmarkRow: SafeNormalizedRecord | null;
    sampleNormalizedClientRows: SafeNormalizedRecord[];
    sampleNormalizedBenchmarkRows: SafeNormalizedRecord[];
    matchTrace: MatchTraceRow[];
    zeroCoverageSummary: string | null;
    clientUploadNormalization: ClientUploadNormalizationDiagnostics | null;
    exactUpcMatches: number;
    exactSkuMatches: number;
    fuzzyMatches: number;
    unmatchedRows: number;
    emptyReason: string | null;
    zeroCoverageRootCause:
      | "missing_client_rows"
      | "missing_benchmark_rows"
      | "column_mismatch"
      | "overly_strict_matching"
      | "unsupported_file_parsing"
      | null;
  };
};

type SafeNormalizedRecord = {
  sku: string | null;
  upc: string | null;
  itemName: string;
  brand: string;
  category: string;
  price: number | null;
  unitPrice: number | null;
  packSize: number | null;
  normalizedMatchFields?: {
    sku: string | null;
    upc: string | null;
    itemName: string;
    brand: string;
    category: string;
    sizePack: string;
  };
  geography: string | null;
};

type CandidateTrace = {
  candidate: SafeNormalizedRecord | null;
  score: number;
  nameScore: number;
  brandScore: number;
  sizeScore: number;
  categoryScore: number;
  fieldsMatched: string[];
  fieldsNotMatched: string[];
  accepted: boolean;
  reason: string;
};

type MatchTraceRow = {
  client: SafeNormalizedRecord | null;
  exactUpcCandidate: SafeNormalizedRecord | null;
  exactSkuCandidate: SafeNormalizedRecord | null;
  candidatesConsidered: CandidateTrace[];
  acceptedCandidate: CandidateTrace | null;
  finalDecision: string;
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
    "normalizedSku",
    "normalized sku",
    "normalizedProductId",
    "normalized product id",
    "clientSku",
    "clientsku",
    "client sku",
    "clientItemId",
    "itemid",
    "item id",
    "product sku",
    "product_sku",
    "walmart sku",
    "walmart item id",
  ],
  item: [
    "item",
    "normalizedProductName",
    "normalized product name",
    "itemName",
    "itemname",
    "item name",
    "product",
    "productName",
    "product name",
    "product_name",
    "description",
    "product_description",
    "title",
  ],
  category: ["category", "normalizedCategory", "normalized category", "clientCategory", "client category", "breadcrumb", "department", "class", "subcategory"],
  brand: ["brand", "normalizedBrand", "normalized brand", "clientBrand", "client brand", "product brand", "product_brand", "manufacturer"],
  price: [
    "price",
    "normalizedPrice",
    "normalized price",
    "clientPrice",
    "clientprice",
    "client price",
    "retailerPrice",
    "retailerprice",
    "retailer price",
    "regular price",
    "regular_price",
    "sales price",
    "sales_price",
    "current price",
  ],
  unitPrice: ["normalizedUnitPrice", "normalized unit price", "unitPrice", "unitprice", "unit price", "unit_price", "price per unit", "ppu"],
  packSize: [
    "normalizedPackSize",
    "normalized pack size",
    "packSize",
    "packsize",
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
  kvi: ["normalizedKviFlag", "normalized kvi flag", "kvi", "kviFlag", "kviflag", "is kvi", "kvi flag", "known value item", "key value item"],
  geography: ["normalizedRegion", "normalized region", "normalizedStore", "normalized store", "region", "state", "zone", "market", "store", "store region", "store_region"],
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

const normalizeNumberToken = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && Number.isInteger(numericValue)
    ? String(numericValue)
    : value;
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/(\d+(?:\.\d+)?)([a-z]+)/g, "$1 $2")
    .replace(/([a-z]+)(\d+(?:\.\d+)?)/g, "$1 $2")
    .replace(/\bfluid\s*ounces?\b/g, "fl oz")
    .replace(/\bfl\.?\s*ounces?\b/g, "fl oz")
    .replace(/\bfl\.?\s*oz\.?\b/g, "fl oz")
    .replace(/\bounces?\b/g, "oz")
    .replace(/\boz\.?\b/g, "oz")
    .replace(/\bpounds?\b/g, "lb")
    .replace(/\blbs?\b/g, "lb")
    .replace(/\bcounts?\b/g, "ct")
    .replace(/\bct\.?\b/g, "ct")
    .replace(/[^a-z0-9.]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((token) => (/^\d+\.\d+$/.test(token) ? normalizeNumberToken(token) : token))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const normalizedTokens = (value: string, minLength = 1) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= minLength);

const SIZE_UNIT_TOKENS = new Set(["oz", "lb", "ct", "fl"]);

const sizeSignature = (
  row: Pick<NormalizedSourceRecord, "itemName" | "packSize" | "packSizeText">
) => {
  const tokens = normalizedTokens(
    `${row.itemName} ${row.packSizeText} ${row.packSize !== null ? row.packSize : ""}`
  );
  const sizeTokens = tokens.filter((token, index) => {
    const nextToken = tokens[index + 1];
    const previousToken = tokens[index - 1];
    return (
      SIZE_UNIT_TOKENS.has(token) ||
      (/^\d+(?:\.\d+)?$/.test(token) && nextToken && SIZE_UNIT_TOKENS.has(nextToken)) ||
      (previousToken && /^\d+(?:\.\d+)?$/.test(previousToken) && SIZE_UNIT_TOKENS.has(token))
    );
  });

  return sizeTokens.join(" ");
};

const tokenOverlapScore = (left: string, right: string, minLength = 1) => {
  const leftTokens = new Set(normalizedTokens(left, minLength));
  const rightTokens = new Set(normalizedTokens(right, minLength));
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
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
  if (
    detectedColumn &&
    record[detectedColumn] !== undefined &&
    record[detectedColumn] !== null &&
    record[detectedColumn] !== ""
  ) {
    return record[detectedColumn];
  }

  const normalizedEntries = Object.entries(record).map(([key, value]) => [
    normalizeColumnName(key),
    value,
  ] as const);
  const aliases = fieldAliases[field].map(normalizeColumnName);
  return (
    normalizedEntries.find(
      ([key, value]) =>
        aliases.includes(key) && value !== undefined && value !== null && value !== ""
    )?.[1] ?? null
  );
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
    const rawPackSize = getMappedValue(record, detectedColumns, "packSize");
    const packSize = toNumber(rawPackSize);
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
      packSizeText: String(rawPackSize ?? ""),
      kviFlag: toBooleanFlag(getMappedValue(record, detectedColumns, "kvi")),
      geography: (getMappedValue(record, detectedColumns, "geography") as string | null) ?? null,
    };
  });

const safeNormalizedRecord = (
  row: NormalizedSourceRecord | null | undefined
): SafeNormalizedRecord | null =>
  row
    ? {
        sku: row.sku,
        upc: row.upc,
        itemName: row.itemName,
        brand: row.brand,
        category: row.category,
        price: row.price,
        unitPrice: row.unitPrice,
        packSize: row.packSize,
        normalizedMatchFields: {
          sku: row.sku,
          upc: row.upc,
          itemName: normalizeText(row.itemName),
          brand: normalizeText(row.brand),
          category: normalizeText(row.category),
          sizePack: sizeSignature(row),
        },
        geography: row.geography,
      }
    : null;

const buildFieldMapping = (
  clientColumnsDetected: Partial<Record<FieldKey, string>>,
  benchmarkColumnsDetected: Partial<Record<FieldKey, string>>
) =>
  (Object.keys(fieldAliases) as FieldKey[]).reduce<
    Record<FieldKey, { client: string | null; benchmark: string | null }>
  >((mapping, field) => {
    mapping[field] = {
      client: clientColumnsDetected[field] ?? null,
      benchmark: benchmarkColumnsDetected[field] ?? null,
    };
    return mapping;
  }, {} as Record<FieldKey, { client: string | null; benchmark: string | null }>);

const hasMinimumMatchFields = (columns: Partial<Record<FieldKey, string>>) =>
  Boolean(columns.price && (columns.upc || columns.sku || columns.item));

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
    normalizedTokens(value, 2).filter(
      (token) => token.length >= 3 || SIZE_UNIT_TOKENS.has(token) || /^\d+$/.test(token)
    )
  );

const similarityScore = (left: string, right: string) => {
  return tokenOverlapScore(left, right, 2);
};

const fieldMatchState = (score: number, field: string, matched: string[], notMatched: string[]) => {
  if (score >= 0.8) {
    matched.push(field);
  } else {
    notMatched.push(field);
  }
};

const scoreCandidate = (
  client: NormalizedSourceRecord,
  candidate: NormalizedSourceRecord
): CandidateTrace => {
  const nameScore = similarityScore(client.itemName, candidate.itemName);
  const brandScore = client.brand && candidate.brand ? similarityScore(client.brand, candidate.brand) : 0;
  const sizeScore = sizeSignature(client) && sizeSignature(candidate)
    ? similarityScore(sizeSignature(client), sizeSignature(candidate))
    : 0;
  const categoryScore =
    client.category && candidate.category ? similarityScore(client.category, candidate.category) : 0;
  const score =
    nameScore * 0.55 +
    brandScore * 0.25 +
    sizeScore * 0.1 +
    categoryScore * 0.1;
  const bothBrandsPresent = Boolean(client.brand && candidate.brand);
  const fieldsMatched: string[] = [];
  const fieldsNotMatched: string[] = [];

  fieldMatchState(nameScore, "itemName", fieldsMatched, fieldsNotMatched);
  fieldMatchState(brandScore, "brand", fieldsMatched, fieldsNotMatched);
  if (sizeSignature(client) || sizeSignature(candidate)) {
    fieldMatchState(sizeScore, "sizePack", fieldsMatched, fieldsNotMatched);
  }
  if (client.category || candidate.category) {
    fieldMatchState(categoryScore, "category", fieldsMatched, fieldsNotMatched);
  }

  const strongFuzzyMatch =
    score >= 0.55 &&
    nameScore >= 0.6 &&
    (bothBrandsPresent ? brandScore >= 0.5 : score >= 0.65);
  const conservativeFallback =
    score >= 0.45 && nameScore >= 0.75 && bothBrandsPresent && brandScore >= 0.75;
  const accepted = strongFuzzyMatch || conservativeFallback;
  const reason = accepted
    ? strongFuzzyMatch
      ? "accepted: fuzzy score meets threshold with sufficient name and brand agreement"
      : "accepted: conservative fallback with strong name and brand agreement"
    : `rejected: score ${round(score, 2)} below threshold or insufficient name/brand agreement`;

  return {
    candidate: safeNormalizedRecord(candidate),
    score: round(score, 3),
    nameScore: round(nameScore, 3),
    brandScore: round(brandScore, 3),
    sizeScore: round(sizeScore, 3),
    categoryScore: round(categoryScore, 3),
    fieldsMatched,
    fieldsNotMatched,
    accepted,
    reason,
  };
};

const summarizeZeroCoverageRootCause = (
  trace: MatchTraceRow[],
  diagnostics: MatchBuildResult["diagnostics"]
) => {
  if (diagnostics.exactUpcMatches === 0 && diagnostics.exactSkuMatches === 0) {
    const anyClientIds = trace.some((row) => row.client?.upc || row.client?.sku);
    if (!anyClientIds) return "missing UPC / SKU fields";
  }

  const candidateScores = trace.flatMap((row) => row.candidatesConsidered);
  if (candidateScores.length === 0) return "client naming mismatch";

  const bestName = Math.max(...candidateScores.map((candidate) => candidate.nameScore));
  const bestBrand = Math.max(...candidateScores.map((candidate) => candidate.brandScore));
  const bestSize = Math.max(...candidateScores.map((candidate) => candidate.sizeScore));
  const bestCategory = Math.max(...candidateScores.map((candidate) => candidate.categoryScore));
  const bestScore = Math.max(...candidateScores.map((candidate) => candidate.score));

  if (bestName < 0.45) return "client naming mismatch";
  if (bestBrand < 0.45) return "benchmark naming mismatch";
  if (bestSize < 0.45 && candidateScores.some((candidate) => candidate.fieldsNotMatched.includes("sizePack"))) {
    return "size/unit mismatch";
  }
  if (
    bestCategory < 0.45 &&
    candidateScores.some((candidate) => candidate.fieldsNotMatched.includes("category"))
  ) {
    return "category mismatch";
  }
  if (bestScore >= 0.45) return "overly strict threshold";
  return diagnostics.zeroCoverageRootCause ?? "overly strict threshold";
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
  benchmarkDatasetCount: number,
  uploadedClientFileCount: number,
  clientUploadNormalization: ClientUploadNormalizationDiagnostics | null = null
): MatchBuildResult => {
  const clientRecords = clientRows.map(toRecord);
  const benchmarkLoad = loadBenchmarkRecords();
  const benchmarkRecords = benchmarkLoad.records;
  const clientColumnsDetected = detectColumns(clientRecords);
  const benchmarkColumnsDetected = detectColumns(benchmarkRecords.slice(0, 100));
  const fieldMapping = buildFieldMapping(clientColumnsDetected, benchmarkColumnsDetected);
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
    normalizedClientRowCount: normalizedClientRows.length,
    benchmarkRowCount: benchmarkRecords.length,
    normalizedBenchmarkRowCount: normalizedBenchmarkRows.length,
    benchmarkDatasetCount,
    clientColumnsDetected,
    benchmarkColumnsDetected,
    fieldMapping,
    sampleNormalizedClientRow: safeNormalizedRecord(normalizedClientRows[0]),
    sampleNormalizedBenchmarkRow: safeNormalizedRecord(normalizedBenchmarkRows[0]),
    sampleNormalizedClientRows: normalizedClientRows.slice(0, 5).map(safeNormalizedRecord).filter(Boolean),
    sampleNormalizedBenchmarkRows: normalizedBenchmarkRows
      .slice(0, 5)
      .map(safeNormalizedRecord)
      .filter(Boolean),
    matchTrace: [],
    zeroCoverageSummary: null,
    clientUploadNormalization,
    exactUpcMatches: 0,
    exactSkuMatches: 0,
    fuzzyMatches: 0,
    unmatchedRows: 0,
    emptyReason: null,
    zeroCoverageRootCause: null,
  };
  const logMatcherTraceDiagnostics = () => {
    console.info(
      "[opportunity-estimate] Matcher sample normalized inputs:",
      JSON.stringify({
        clientRows: diagnostics.sampleNormalizedClientRows,
        walmartBenchmarkRows: diagnostics.sampleNormalizedBenchmarkRows,
      })
    );
    console.info(
      "[opportunity-estimate] Matcher candidate trace:",
      JSON.stringify({
        tracedClientRows: diagnostics.matchTrace.length,
        trace: diagnostics.matchTrace,
        zeroCoverageSummary: diagnostics.zeroCoverageSummary,
      })
    );
  };

  if (clientRows.length === 0) {
    diagnostics.zeroCoverageRootCause =
      uploadedClientFileCount > 0 ? "unsupported_file_parsing" : "missing_client_rows";
    diagnostics.zeroCoverageSummary =
      clientUploadNormalization?.validationError || uploadedClientFileCount > 0
        ? "missing UPC / SKU fields"
        : "missing client rows";
    diagnostics.emptyReason =
      clientUploadNormalization?.validationError ||
      (uploadedClientFileCount > 0
        ? "Client upload metadata is present, but parsed client pricing rows are missing. File parsing is not producing row-level pricing data for the matcher."
        : "Client pricing upload rows are missing. The current request contains no client row payload for the matcher.");
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: 0, diagnostics };
  }
  if (benchmarkRecords.length === 0) {
    diagnostics.zeroCoverageRootCause = "missing_benchmark_rows";
    diagnostics.zeroCoverageSummary = "missing benchmark rows";
    diagnostics.emptyReason =
      "Walmart benchmark source rows are missing. The internal CSV could not be loaded server-side.";
    diagnostics.unmatchedRows = clientRows.length;
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }
  if (!hasMinimumMatchFields(clientColumnsDetected)) {
    diagnostics.zeroCoverageRootCause = "column_mismatch";
    diagnostics.zeroCoverageSummary = "missing UPC / SKU fields";
    diagnostics.emptyReason =
      "Client pricing columns do not map to the minimum required fields: price plus UPC, SKU, or product name.";
    diagnostics.unmatchedRows = clientRows.length;
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }
  if (!hasMinimumMatchFields(benchmarkColumnsDetected)) {
    diagnostics.zeroCoverageRootCause = "column_mismatch";
    diagnostics.zeroCoverageSummary = "missing UPC / SKU fields";
    diagnostics.emptyReason =
      "Walmart benchmark columns do not map to the minimum required fields: price plus UPC, SKU, or product name.";
    diagnostics.unmatchedRows = clientRows.length;
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }
  if (normalizedClientRows.length === 0) {
    diagnostics.zeroCoverageRootCause = "column_mismatch";
    diagnostics.zeroCoverageSummary = "client naming mismatch";
    diagnostics.emptyReason =
      "Client rows were present, but none normalized into usable pricing records after field mapping.";
    diagnostics.unmatchedRows = clientRows.length;
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }
  if (normalizedBenchmarkRows.length === 0) {
    diagnostics.zeroCoverageRootCause = "column_mismatch";
    diagnostics.zeroCoverageSummary = "benchmark naming mismatch";
    diagnostics.emptyReason =
      "Walmart benchmark rows were present, but none normalized into usable pricing records after field mapping.";
    diagnostics.unmatchedRows = clientRows.length;
    logMatcherTraceDiagnostics();
    return { matches: [], unmatchedCount: clientRows.length, diagnostics };
  }

  const upcIndex = new Map<string, NormalizedSourceRecord>();
  const skuIndex = new Map<string, NormalizedSourceRecord>();
  const tokenIndex = new Map<string, NormalizedSourceRecord[]>();

  normalizedBenchmarkRows.forEach((row) => {
    if (row.upc && !upcIndex.has(row.upc)) upcIndex.set(row.upc, row);
    if (row.sku && !skuIndex.has(row.sku)) skuIndex.set(row.sku, row);
    const tokens = [...tokenSet(`${row.brand} ${row.itemName} ${row.category} ${sizeSignature(row)}`)].slice(0, 8);
    tokens.forEach((token) => {
      tokenIndex.set(token, [...(tokenIndex.get(token) || []), row]);
    });
  });

  const matches: NormalizedMatchedPair[] = [];
  normalizedClientRows.forEach((client, rowIndex) => {
    const traceRow: MatchTraceRow | null =
      rowIndex < 5
        ? {
            client: safeNormalizedRecord(client),
            exactUpcCandidate:
              client.upc && upcIndex.has(client.upc)
                ? safeNormalizedRecord(upcIndex.get(client.upc))
                : null,
            exactSkuCandidate:
              client.sku && skuIndex.has(client.sku)
                ? safeNormalizedRecord(skuIndex.get(client.sku))
                : null,
            candidatesConsidered: [],
            acceptedCandidate: null,
            finalDecision: "",
          }
        : null;

    if (client.upc && upcIndex.has(client.upc)) {
      diagnostics.exactUpcMatches += 1;
      matches.push(toMatchedPair(client, upcIndex.get(client.upc) as NormalizedSourceRecord, 1));
      if (traceRow) {
        traceRow.finalDecision = "accepted: exact UPC match";
        diagnostics.matchTrace.push(traceRow);
      }
      return;
    }

    if (client.sku && skuIndex.has(client.sku)) {
      diagnostics.exactSkuMatches += 1;
      matches.push(toMatchedPair(client, skuIndex.get(client.sku) as NormalizedSourceRecord, 0.95));
      if (traceRow) {
        traceRow.finalDecision = "accepted: exact SKU/product id match";
        diagnostics.matchTrace.push(traceRow);
      }
      return;
    }

    const candidateTokens = [...tokenSet(`${client.brand} ${client.itemName} ${client.category} ${sizeSignature(client)}`)].slice(
      0,
      8
    );
    const candidates = Array.from(
      new Set(candidateTokens.flatMap((token) => tokenIndex.get(token) || []))
    ).slice(0, 250);
    const scoredCandidates = candidates
      .map((candidate) => ({
        candidate,
        trace: scoreCandidate(client, candidate),
      }))
      .sort((left, right) => right.trace.score - left.trace.score);
    const bestCandidate = scoredCandidates[0];

    if (traceRow) {
      traceRow.candidatesConsidered = scoredCandidates.slice(0, 8).map(({ trace }) => trace);
    }

    if (bestCandidate?.trace.accepted) {
      diagnostics.fuzzyMatches += 1;
      matches.push(
        toMatchedPair(client, bestCandidate.candidate, clamp(bestCandidate.trace.score, 0.45, 0.9))
      );
      if (traceRow) {
        traceRow.acceptedCandidate = bestCandidate.trace;
        traceRow.finalDecision = bestCandidate.trace.reason;
        diagnostics.matchTrace.push(traceRow);
      }
      return;
    }

    diagnostics.unmatchedRows += 1;
    if (traceRow) {
      traceRow.finalDecision =
        bestCandidate?.trace.reason ||
        "rejected: no benchmark candidates shared normalized name, brand, category, or size tokens";
      diagnostics.matchTrace.push(traceRow);
    }
  });

  if (matches.length === 0) {
    diagnostics.zeroCoverageRootCause = "overly_strict_matching";
    diagnostics.zeroCoverageSummary = summarizeZeroCoverageRootCause(diagnostics.matchTrace, diagnostics);
    diagnostics.emptyReason =
      `Client and benchmark rows normalized successfully, but no UPC, SKU, or fuzzy product matches met the current thresholds. Likely root cause: ${diagnostics.zeroCoverageSummary}.`;
  }

  logMatcherTraceDiagnostics();

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
  const rawClientSourceRows = asArray(
    request.clientPricingRows ??
      request.clientRows ??
      request.clientUploadRows ??
      request.pricingRows
  );
  const clientUploadNormalization =
    request.clientUploadFiles || rawClientSourceRows.length > 0
      ? normalizeClientUploads(request.clientUploadFiles || [], rawClientSourceRows)
      : null;
  const clientSourceRows =
    clientUploadNormalization !== null ? clientUploadNormalization.rows : rawClientSourceRows;
  const uploadedClientFileCount = Math.max(
    Array.isArray(request.clientContext?.uploadedClientData)
      ? request.clientContext.uploadedClientData.length
      : 0,
    Array.isArray(request.clientUploadFiles) ? request.clientUploadFiles.length : 0
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
      ? buildMatchesFromSourceRows(
          clientSourceRows,
          benchmarkRepository.datasets.length,
          uploadedClientFileCount,
          clientUploadNormalization?.diagnostics ?? null
        )
      : null;
  const matchedPairs = preMatchedPairs.length > 0 ? preMatchedPairs : builtMatchResult?.matches ?? [];
  const unmatchedSkus = Array.isArray(request.unmatchedSkus)
    ? request.unmatchedSkus.length
    : toNumber(request.unmatchedCount) ?? builtMatchResult?.unmatchedCount ?? 0;
  const fallbackMatchDiagnostics: MatchBuildResult["diagnostics"] = {
    clientRowCount: clientSourceRows.length || preMatchedPairs.length,
    normalizedClientRowCount: clientSourceRows.length || preMatchedPairs.length,
    benchmarkRowCount: walmartDataset?.rowCount ?? 0,
    normalizedBenchmarkRowCount: walmartDataset?.rowCount ?? 0,
    benchmarkDatasetCount: benchmarkRepository.datasets.length,
    clientColumnsDetected: {},
    benchmarkColumnsDetected: {},
    fieldMapping: buildFieldMapping({}, {}),
    sampleNormalizedClientRow:
      preMatchedPairs.length > 0
        ? {
            sku: preMatchedPairs[0].clientSku,
            upc: null,
            itemName: preMatchedPairs[0].itemName,
            brand: preMatchedPairs[0].brand,
            category: preMatchedPairs[0].category,
            price: preMatchedPairs[0].clientPrice,
            unitPrice: preMatchedPairs[0].clientUnitPrice,
            packSize: preMatchedPairs[0].packSize,
            geography: preMatchedPairs[0].geography,
          }
        : null,
    sampleNormalizedBenchmarkRow:
      preMatchedPairs.length > 0
        ? {
            sku: preMatchedPairs[0].walmartSku,
            upc: null,
            itemName: preMatchedPairs[0].itemName,
            brand: preMatchedPairs[0].brand,
            category: preMatchedPairs[0].category,
            price: preMatchedPairs[0].walmartPrice,
            unitPrice: preMatchedPairs[0].walmartUnitPrice,
            packSize: preMatchedPairs[0].packSize,
            geography: null,
          }
        : null,
    sampleNormalizedClientRows: [],
    sampleNormalizedBenchmarkRows: [],
    matchTrace: [],
    zeroCoverageSummary:
      clientSourceRows.length === 0 && preMatchedPairs.length === 0
        ? uploadedClientFileCount > 0
          ? "missing UPC / SKU fields"
          : "missing client rows"
        : null,
    clientUploadNormalization: clientUploadNormalization?.diagnostics ?? null,
    exactUpcMatches: 0,
    exactSkuMatches: 0,
    fuzzyMatches: preMatchedPairs.length,
    unmatchedRows: unmatchedSkus,
    emptyReason:
      clientSourceRows.length === 0 && preMatchedPairs.length === 0
        ? uploadedClientFileCount > 0
          ? "Client upload metadata is present, but parsed client pricing rows are missing. File parsing is not producing row-level pricing data for the matcher."
          : "Client pricing upload rows are missing. The route received neither matched pairs nor raw client pricing rows."
        : null,
    zeroCoverageRootCause:
      clientSourceRows.length === 0 && preMatchedPairs.length === 0
        ? uploadedClientFileCount > 0
          ? "unsupported_file_parsing"
          : "missing_client_rows"
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
    "[opportunity-estimate] Client input diagnostics:",
    JSON.stringify({
      clientRowCount: matchDiagnostics.clientRowCount,
      normalizedClientRowCount: matchDiagnostics.normalizedClientRowCount,
      detectedClientColumns: matchDiagnostics.clientColumnsDetected,
      sampleNormalizedClientRow: matchDiagnostics.sampleNormalizedClientRow,
      uploadedClientFileCount,
      uploadNormalization: matchDiagnostics.clientUploadNormalization,
      rowsPassedIntoMatcher: clientSourceRows.length > 0,
    })
  );
  console.info(
    "[opportunity-estimate] Benchmark input diagnostics:",
    JSON.stringify({
      benchmarkDatasetCount: matchDiagnostics.benchmarkDatasetCount,
      benchmarkRowCount: matchDiagnostics.benchmarkRowCount,
      normalizedBenchmarkRowCount: matchDiagnostics.normalizedBenchmarkRowCount,
      detectedBenchmarkColumns: matchDiagnostics.benchmarkColumnsDetected,
      sampleNormalizedBenchmarkRow: matchDiagnostics.sampleNormalizedBenchmarkRow,
      benchmarkAvailable: Boolean(walmartDataset),
    })
  );
  console.info(
    "[opportunity-estimate] Matching output diagnostics:",
    JSON.stringify({
      fieldMapping: matchDiagnostics.fieldMapping,
      rawMatchedRecords: rawMatches.length,
      clientSourceRowsPassed: clientSourceRows.length,
      usableMatchedRecords: matchedPairs.length,
      unmatchedSkus,
      elasticityBenchmarkCount: benchmarkRepository.elasticityBenchmarks.length,
      povGuidanceAvailable: povStore.guidanceCount > 0,
      contextModifierAvailable: Boolean(request.clientContext || request.scopeInputs),
      exactUpcMatches: matchDiagnostics.exactUpcMatches,
      exactSkuMatches: matchDiagnostics.exactSkuMatches,
      fuzzyMatches: matchDiagnostics.fuzzyMatches,
      unmatchedRows: matchDiagnostics.unmatchedRows,
      zeroCoverageRootCause: matchDiagnostics.zeroCoverageRootCause,
      zeroCoverageSummary: matchDiagnostics.zeroCoverageSummary,
      zeroCoverageReason: matchDiagnostics.emptyReason,
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
