"use client";

import { type ChangeEvent, useState } from "react";
import PricingLadderModule from "@/components/PricingLadderModule";
import PriceZoneModule from "@/components/PriceZoneModule";
import PromoCalendarModule from "@/components/PromoCalendarModule";
import MarkdownModule from "@/components/MarkdownModule";
import { estimateOpportunity } from "./utils/opportunityEngine";

type Tab = "overview" | "pricing" | "promotions" | "markdown";
type OverviewTab = "prompts" | "retailer" | "opportunity";
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
type LeverData = {
  name: string;
  value: string;
  width: string;
};

const sectionCard =
  "brand-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm";
const subCard =
  "brand-subcard rounded-xl border border-gray-200 bg-white p-3 shadow-sm";
const metricCard =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm";

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

  const leverData = [
  {
    name: "Pricing",
    value: opportunity.pricing.marginUpliftBps,
    width: "35%",
  },
  {
    name: "Promotions",
    value: opportunity.promotions.marginUpliftBps,
    width: "55%",
  },
  {
    name: "Markdown",
    value: opportunity.markdown.marginUpliftBps,
    width: "20%",
  },
];

  const activeWorkflowStep =
    activeTab !== "overview"
      ? "Analysis"
      : activeOverviewTab === "retailer"
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
  isLoading ? (
    <section className="brand-card space-y-6 rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-[var(--ui-navy)]">
        Analyzing {selectedRetailer}...
      </h2>

      <div className="space-y-3 text-sm text-gray-600">
        <p>✓ Scraping pricing data</p>
        <p>✓ Building price ladder</p>
        <p>✓ Analyzing promo intensity</p>
        <p>✓ Evaluating markdown patterns</p>
        <p className="font-semibold text-[var(--ui-blue)]">→ Synthesizing results</p>
      </div>
    </section>
  ) : (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-3 shadow-sm">
        <div className="flex flex-wrap gap-5 border-b border-gray-200">
        {[
          ["prompts", "Prompts"],
          ["retailer", "Retailer Overview"],
          ["opportunity", "Opportunity Size"],
        ].map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setActiveOverviewTab(tabId as OverviewTab)}
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
        <RetailerOverviewSection
          selectedRetailer={selectedRetailer}
          analysisMode={analysisMode}
        />
      )}

      {activeOverviewTab === "opportunity" && (
        <OpportunitySection
          opportunity={opportunity}
          analysisMode={analysisMode}
          leverData={leverData}
        />
      )}
    </div>

  )

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

function RetailerOverviewSection({
  selectedRetailer,
  analysisMode,
}: {
  selectedRetailer: string;
  analysisMode: AnalysisMode;
}) {
  return (
    <section className={`${sectionCard} space-y-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Retailer snapshot
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--ui-navy)]">
            {selectedRetailer}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 sm:grid-cols-3 md:min-w-[420px]">
          {[
            { label: "Retailer", value: selectedRetailer },
            { label: "Scope", value: "All categories" },
            {
              label: "Mode",
              value:
                analysisMode === "hybrid"
                  ? "External + client inputs"
                  : "External only",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
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

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Company profile
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Annual revenue", value: "—" },
            { label: "EBITDA margin", value: "—" },
            { label: "Store count", value: "—" },
            { label: "Format", value: "—" },
          ].map((item) => (
            <div key={item.label} className={subCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--ui-text)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Commercial context
          </p>
          <p className="text-xs text-gray-500">
            Commercial context derived from external-only signals unless client inputs are added.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: "Pricing posture", value: "Benchmark-led" },
            { label: "Promo intensity", value: "Moderate" },
            { label: "Markdown tendency", value: "Seasonal" },
            { label: "KVI concentration", value: "Focused" },
            {
              label: "Confidence",
              value: analysisMode === "hybrid" ? "Medium-high" : "Medium",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--ui-text)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {analysisMode === "hybrid" && (
          <p className="text-xs text-[var(--ui-blue)]">
            Hybrid mode: client inputs can refine the external signal read.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Recent signals
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-[var(--ui-text)]">
              Latest press release highlights
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <p>• Pricing architecture update pending source feed</p>
              <p>• Promotional calendar activity to be summarized</p>
              <p>• Store opening or remodel signals awaiting refresh</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-[var(--ui-text)]">
              Relevant headlines
            </p>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <p>• Pricing and promo headlines will populate here</p>
              <p>• Markdown, input cost, and margin pressure mentions</p>
              <p>• Leadership or operating model changes to monitor</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OpportunitySection({
  opportunity,
  analysisMode,
  leverData,
}: {
  opportunity: Opportunity;
  analysisMode: AnalysisMode;
  leverData: LeverData[];
}) {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: "Revenue %", value: opportunity.totalRevenueUpliftPct },
          { label: "Margin bps", value: opportunity.totalMarginUpliftBps },
          {
            label: "Total opportunity",
            value:
              analysisMode === "hybrid"
                ? "+135 bps"
                : opportunity.totalMarginUpliftBps,
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

      <section className={sectionCard}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Opportunity sizing breakdown</h2>

        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">
          <div className="flex justify-between px-4 py-3">
            <span>Base estimate (external data)</span>
            <span className="font-semibold text-[var(--ui-text)]">
              {opportunity.totalMarginUpliftBps}
            </span>
          </div>

          <div className="flex justify-between px-4 py-3">
            <span>Context adjustment</span>
            <span className="font-semibold text-[var(--ui-text)]">−20 bps</span>
          </div>

          <div className="flex justify-between px-4 py-3">
            <span>Client data adjustment</span>
            <span className="font-semibold text-[var(--ui-text)]">
              {analysisMode === "hybrid" ? "+15 bps" : "+0 bps"}
            </span>
          </div>

          <div className="flex justify-between bg-white px-4 py-3">
            <span className="font-semibold text-[var(--ui-text)]">Final estimate</span>
            <span className="font-bold text-[var(--ui-blue)]">
              {analysisMode === "hybrid"
                ? "+135 bps"
                : opportunity.totalMarginUpliftBps}
            </span>
          </div>
        </div>

        <div className="mt-3 text-sm font-medium text-gray-600">
          Confidence: {analysisMode === "hybrid" ? "Medium-High" : "Medium"}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Based on public signals, contextual inputs, and available client data
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">
          Total Estimated Value Opportunity
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { value: opportunity.totalRevenueUpliftPct, label: "Revenue Growth" },
            { value: opportunity.totalMarginUpliftBps, label: "Margin Expansion" },
            { value: "Flat–+1.0%", label: "Unit Impact" },
            { value: "Moderate", label: "Confidence" },
          ].map((item) => (
            <div key={item.label} className={subCard}>
              <p className="text-2xl font-bold tracking-tight text-[var(--ui-navy)]">{item.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${sectionCard} space-y-3`}>
          <p className="font-semibold text-[var(--ui-navy)]">Key drivers of opportunity</p>

          <div className="space-y-2 text-sm leading-6 text-gray-600">
            <p>
              • Pricing misalignment vs competitors{" "}
              <span className="font-semibold text-[var(--ui-blue)]">
                ({opportunity.pricing.marginUpliftBps})
              </span>
            </p>

            <p>
              • High promo intensity and depth{" "}
              <span className="font-semibold text-[var(--ui-blue)]">
                ({opportunity.promotions.marginUpliftBps})
              </span>
            </p>

            <p>
              • Elevated markdown activity vs peers{" "}
              <span className="font-semibold text-[var(--ui-blue)]">
                ({opportunity.markdown.marginUpliftBps})
              </span>
            </p>
          </div>
        </div>

        <div className={`${sectionCard} space-y-3`}>
          <p className="font-semibold text-[var(--ui-navy)]">Confidence & assumptions</p>
          <p className="text-sm font-medium text-gray-600">Confidence: Medium</p>
          <div className="space-y-1 text-sm leading-6 text-gray-600">
            <p>• Based on public signals only</p>
            <p>• No retailer internal elasticity data used</p>
            <p>• Estimates are directional and benchmark-based</p>
          </div>
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Value by Lever</h2>

        <div className="space-y-4">
          {leverData.map((lever) => (
            <div key={lever.name} className={subCard}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-[var(--ui-navy)]">{lever.name}</p>
                  <p className="text-sm text-gray-500">{lever.value}</p>
                </div>
              </div>

              <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--ui-blue)]"
                  style={{ width: lever.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-[var(--ui-navy)]">Top Actions</h2>

        <div className="space-y-3 text-sm">
          <div className={subCard}>1. Rebalance price-pack architecture</div>
          <div className={subCard}>2. Reduce blanket promotional frequency</div>
          <div className={subCard}>3. Reallocate promotions away from non-KVIs</div>
          <div className={subCard}>4. Improve markdown timing discipline</div>
          <div className={subCard}>5. Rationalize pack assortment</div>
        </div>
      </section>
    </div>
  );
}
