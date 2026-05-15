import fs from "node:fs";
import path from "node:path";

export type PricingPovCategoryKey =
  | "kviGuidance"
  | "pricingThresholds"
  | "architecturePrinciples"
  | "zoningPrinciples"
  | "guardrails"
  | "confidenceGuidance"
  | "recommendationLanguage";

export type PricingPovGuidanceItem = {
  id: string;
  sourceFile: string;
  guidance: string;
};

export type PricingPovStore = {
  generatedAt: string;
  sourceDirectory: string;
  supportedFileCount: number;
  unsupportedFiles: string[];
  categories: {
    key: PricingPovCategoryKey;
    label: string;
    keywords: string[];
    count: number;
  }[];
  guidanceCount: number;
  guidance: Record<PricingPovCategoryKey, PricingPovGuidanceItem[]>;
};

export type BenchmarkStats = {
  average: number | null;
  p25?: number | null;
  median: number | null;
  p75?: number | null;
};

export type BenchmarkAggregate = {
  rowCount: number;
  pricedCount: number;
  inStockPct: number | null;
  promotedPct: number | null;
  priceStats: BenchmarkStats;
  unitPriceStats: BenchmarkStats;
  topStates: { name: string; count: number }[];
  topBrands: { name: string; count: number }[];
};

export type InternalBenchmarkDataset = {
  sourceFile: string;
  benchmarkKind: "walmart_scrape" | "benchmark_csv" | string;
  retailer: string;
  rowCount: number;
  aggregate: BenchmarkAggregate;
  categories: (BenchmarkAggregate & { name: string })[];
};

export type ElasticityBenchmark = {
  segment: string;
  elasticityRange: [number, number];
  use: string;
};

export type InternalBenchmarkRepository = {
  generatedAt: string;
  sourceDirectory: string;
  benchmarkFileCount: number;
  datasets: InternalBenchmarkDataset[];
  elasticityBenchmarks: ElasticityBenchmark[];
};

const readJsonFile = <T>(relativePath: string, fallback: T): T => {
  const filePath = path.join(process.cwd(), relativePath);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    console.warn(
      "[pricing-engine] Internal store unavailable:",
      JSON.stringify({
        file: relativePath,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    );
    return fallback;
  }
};

export const getPricingPovStore = () =>
  readJsonFile<PricingPovStore>("data/internal/pov/pricingPov.json", {
    generatedAt: "",
    sourceDirectory: "Pricing docs/",
    supportedFileCount: 0,
    unsupportedFiles: [],
    categories: [],
    guidanceCount: 0,
    guidance: {
      kviGuidance: [],
      pricingThresholds: [],
      architecturePrinciples: [],
      zoningPrinciples: [],
      guardrails: [],
      confidenceGuidance: [],
      recommendationLanguage: [],
    },
  });

export const getInternalBenchmarkRepository = () =>
  readJsonFile<InternalBenchmarkRepository>(
    "data/internal/benchmarks/internalBenchmarkRepository.json",
    {
      generatedAt: "",
      sourceDirectory: "Internal Data/",
      benchmarkFileCount: 0,
      datasets: [],
      elasticityBenchmarks: [],
    }
  );
