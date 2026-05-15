import { NextResponse } from "next/server";
import {
  calculatePricingOpportunity,
  type PricingOpportunityRequest,
} from "@/lib/pricingOpportunityEstimate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: PricingOpportunityRequest;

  try {
    payload = (await request.json()) as PricingOpportunityRequest;
  } catch {
    console.warn("[opportunity-estimate] Invalid JSON request body.");
    return NextResponse.json(
      { error: "Invalid JSON request body for pricing opportunity estimate." },
      { status: 400 }
    );
  }

  const estimate = calculatePricingOpportunity(payload);
  const hasMatches = estimate.pricing.diagnostics.matched_skus > 0;

  if (!hasMatches) {
    const reason =
      estimate.pricing.matchDiagnostics.emptyReason ||
      "Matched pricing output is missing or too sparse for a data-backed pricing opportunity estimate.";

    return NextResponse.json(
      {
        error: reason,
        ...estimate,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(estimate);
}
