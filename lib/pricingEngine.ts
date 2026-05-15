import {
  getInternalBenchmarkRepository,
  getPricingPovStore,
  type InternalBenchmarkDataset,
  type PricingPovCategoryKey,
  type PricingPovGuidanceItem,
} from "./internalDataStores";

export type PricingEngineContext = {
  stores: {
    benchmarkFileCount: number;
    benchmarkDatasetCount: number;
    walmartBenchmarkAvailable: boolean;
    elasticityBenchmarkCount: number;
    pricingPovGuidanceCount: number;
    pricingPovSupportedFileCount: number;
  };
  analysisInputs: {
    kviAnalysis: PricingPovGuidanceItem[];
    priceArchitectureAnalysis: PricingPovGuidanceItem[];
    zoningAnalysis: PricingPovGuidanceItem[];
    thresholdInterpretation: PricingPovGuidanceItem[];
    confidenceAndGuardrails: PricingPovGuidanceItem[];
  };
  benchmarkSignals: {
    walmartCategoryCount: number;
    walmartRowCount: number;
    topBenchmarkCategories: {
      name: string;
      rowCount: number;
      inStockPct: number | null;
      promotedPct: number | null;
      medianPrice: number | null;
      medianUnitPrice: number | null;
    }[];
  };
};

const takeGuidance = (
  guidance: Record<PricingPovCategoryKey, PricingPovGuidanceItem[]>,
  keys: PricingPovCategoryKey[],
  limit = 12
) => keys.flatMap((key) => guidance[key]).slice(0, limit);

const getWalmartDataset = (datasets: InternalBenchmarkDataset[]) =>
  datasets.find(
    (dataset) =>
      dataset.benchmarkKind === "walmart_scrape" ||
      dataset.retailer.toLowerCase().includes("walmart")
  ) || null;

export const buildPricingEngineContext = (): PricingEngineContext => {
  const benchmarkRepository = getInternalBenchmarkRepository();
  const pricingPov = getPricingPovStore();
  const walmartDataset = getWalmartDataset(benchmarkRepository.datasets);

  return {
    stores: {
      benchmarkFileCount: benchmarkRepository.benchmarkFileCount,
      benchmarkDatasetCount: benchmarkRepository.datasets.length,
      walmartBenchmarkAvailable: Boolean(walmartDataset),
      elasticityBenchmarkCount: benchmarkRepository.elasticityBenchmarks.length,
      pricingPovGuidanceCount: pricingPov.guidanceCount,
      pricingPovSupportedFileCount: pricingPov.supportedFileCount,
    },
    analysisInputs: {
      kviAnalysis: takeGuidance(pricingPov.guidance, [
        "kviGuidance",
        "pricingThresholds",
        "confidenceGuidance",
      ]),
      priceArchitectureAnalysis: takeGuidance(pricingPov.guidance, [
        "architecturePrinciples",
        "pricingThresholds",
        "guardrails",
      ]),
      zoningAnalysis: takeGuidance(pricingPov.guidance, [
        "zoningPrinciples",
        "pricingThresholds",
        "confidenceGuidance",
      ]),
      thresholdInterpretation: takeGuidance(pricingPov.guidance, [
        "pricingThresholds",
        "guardrails",
        "recommendationLanguage",
      ]),
      confidenceAndGuardrails: takeGuidance(pricingPov.guidance, [
        "confidenceGuidance",
        "guardrails",
      ]),
    },
    benchmarkSignals: {
      walmartCategoryCount: walmartDataset?.categories.length ?? 0,
      walmartRowCount: walmartDataset?.rowCount ?? 0,
      topBenchmarkCategories:
        walmartDataset?.categories.slice(0, 12).map((category) => ({
          name: category.name,
          rowCount: category.rowCount,
          inStockPct: category.inStockPct,
          promotedPct: category.promotedPct,
          medianPrice: category.priceStats.median,
          medianUnitPrice: category.unitPriceStats.median,
        })) ?? [],
    },
  };
};

export const verifyPricingEngineStores = () => {
  const context = buildPricingEngineContext();

  return {
    benchmarkStoreReadable:
      context.stores.benchmarkFileCount > 0 && context.stores.benchmarkDatasetCount > 0,
    povStoreReadable: context.stores.pricingPovGuidanceCount > 0,
    engineReady:
      context.stores.walmartBenchmarkAvailable &&
      context.stores.elasticityBenchmarkCount > 0 &&
      context.stores.pricingPovGuidanceCount > 0,
    counts: context.stores,
  };
};
