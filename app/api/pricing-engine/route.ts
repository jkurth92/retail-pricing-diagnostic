import { NextResponse } from "next/server";
import { buildPricingEngineContext, verifyPricingEngineStores } from "@/lib/pricingEngine";

export const dynamic = "force-dynamic";

export async function GET() {
  const verification = verifyPricingEngineStores();
  const context = buildPricingEngineContext();

  return NextResponse.json({
    verification,
    stores: context.stores,
    benchmarkSignals: {
      walmartCategoryCount: context.benchmarkSignals.walmartCategoryCount,
      walmartRowCount: context.benchmarkSignals.walmartRowCount,
    },
    guidanceCoverage: Object.fromEntries(
      Object.entries(context.analysisInputs).map(([key, value]) => [key, value.length])
    ),
  });
}
