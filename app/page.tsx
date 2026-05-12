"use client";

import { type ChangeEvent, useState } from "react";
import PricingLadderModule from "@/components/PricingLadderModule";
import PriceZoneModule from "@/components/PriceZoneModule";
import PromoCalendarModule from "@/components/PromoCalendarModule";
import MarkdownModule from "@/components/MarkdownModule";
import { estimateOpportunity } from "./utils/opportunityEngine";

type Tab = "overview" | "pricing" | "promotions" | "markdown";

const sectionCard =
  "brand-card p-6";
const subCard =
  "brand-subcard p-4";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [retailerInput, setRetailerInput] = useState("");
  const [selectedRetailer, setSelectedRetailer] = useState("Retailer");
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<
  "too_low" | "about_right" | "too_high" | ""
>("");

const [feedbackLever, setFeedbackLever] = useState<
  "pricing" | "promotions" | "markdown" | ""
>("");

const [feedbackNotes, setFeedbackNotes] = useState("");
  const [contextInputs, setContextInputs] = useState({
    pricing: "",
    promo: "",
    markdown: "",
  });
  const [analysisMode, setAnalysisMode] = useState<"external" | "hybrid">(
    "external"
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    setUploadedFiles(Array.from(files));
    setAnalysisMode("hybrid");
  };

  const clearFiles = () => {
    setUploadedFiles([]);
    setAnalysisMode("external");
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

  return (
    <div className="min-h-screen bg-[var(--ui-bg)] p-10 max-w-[1200px] mx-auto space-y-10 text-[var(--ui-text)]">
      <header className="space-y-2">
  <h1 className="brand-heading text-4xl font-semibold tracking-tight">
  Retail Pricing Diagnostic
</h1>
<p className="text-sm text-gray-500 mt-1">
  {selectedRetailer} · All categories
</p>
  <p className="text-sm text-gray-500">
    Analyze pricing, promotions, and markdown opportunity using public signals.
  </p>
</header>

<div className="flex gap-2 border-b">
  {[
    ["overview", "Overview"],
    ["pricing", "Pricing"],
    ["promotions", "Promotions"],
    ["markdown", "Markdown"],
  ].map(([tabId, label]) => (
    <button
      key={tabId}
      onClick={() => setActiveTab(tabId as Tab)}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        activeTab === tabId
          ? "brand-tab-active"
          : "brand-tab hover:text-[var(--ui-navy)]"
      }`}
    >
      {label}
    </button>
  ))}
</div>

     {activeTab === "overview" && (
  isLoading ? (
    <section className="brand-card p-10 space-y-6">
      <h2 className="text-xl font-semibold">
        Analyzing {selectedRetailer}...
      </h2>

      <div className="space-y-3 text-sm text-gray-600">
        <p>✓ Scraping pricing data</p>
        <p>✓ Building price ladder</p>
        <p>✓ Analyzing promo intensity</p>
        <p>✓ Evaluating markdown patterns</p>
        <p className="font-medium text-black">→ Synthesizing results</p>
      </div>
    </section>
  ) : (
    <div className="space-y-10">
      <section className="brand-card p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Retailer input
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                value={retailerInput}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRetailerInput(e.target.value)
                }
                placeholder="Enter retailer name"
                className="w-80 rounded-lg border border-[var(--ui-border)] bg-white px-4 py-2 text-sm text-[var(--ui-text)] outline-none focus:border-[var(--ui-blue)]"
              />

              <button
                type="button"
                onClick={() => {
                  const name = retailerInput.trim() || "Retailer";
                  setIsLoading(true);
                  setSelectedRetailer(name);

                  setTimeout(() => {
                    setIsLoading(false);
                  }, 2000);
                }}
                className="rounded-lg bg-[var(--ui-blue)] px-4 py-2 text-sm font-medium text-white"
              >
                Run Diagnostic
              </button>

              <div className="flex items-center gap-1 rounded-full border border-[var(--ui-border)] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAnalysisMode("external")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    analysisMode === "external"
                      ? "bg-[var(--ui-blue)] text-white"
                      : "text-gray-600"
                  }`}
                >
                  External
                </button>

                <button
                  type="button"
                  onClick={() => setAnalysisMode("hybrid")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    analysisMode === "hybrid"
                      ? "bg-[var(--ui-blue)] text-white"
                      : "text-gray-600"
                  }`}
                >
                  Add context
                </button>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            Looking across all categories
          </div>
        </div>
      </section>

      {analysisMode === "hybrid" && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="brand-card p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Client context
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Tell us what you already know about the retailer to refine sizing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--ui-text)]">
                  Pricing context
                </label>
                <textarea
                  value={contextInputs.pricing}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setContextInputs({ ...contextInputs, pricing: e.target.value })
                  }
                  placeholder="e.g. retailer is typically value-led, has a tight KVI set, limited premium tiers"
                  className="mt-1 w-full rounded-lg border border-[var(--ui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--ui-blue)]"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--ui-text)]">
                  Promo context
                </label>
                <textarea
                  value={contextInputs.promo}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setContextInputs({ ...contextInputs, promo: e.target.value })
                  }
                  placeholder="e.g. promotions are frequent, feature/display is the main vehicle, deep discounting is common"
                  className="mt-1 w-full rounded-lg border border-[var(--ui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--ui-blue)]"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--ui-text)]">
                  Markdown context
                </label>
                <textarea
                  value={contextInputs.markdown}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setContextInputs({ ...contextInputs, markdown: e.target.value })
                  }
                  placeholder="e.g. clearance tends to happen late, excess markdowns appear in seasonal categories"
                  className="mt-1 w-full rounded-lg border border-[var(--ui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--ui-blue)]"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="brand-card p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Client upload
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Optional. Use client data to refine the public-data estimate.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--ui-border)] bg-white px-6 py-8 text-center transition hover:border-[var(--ui-blue)] hover:bg-[var(--ui-surface-alt)]">
              <input
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf,.ppt,.pptx"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleFileUpload(e.target.files)
                }
              />
              <p className="font-medium text-[var(--ui-text)]">
                Drop files here or browse
              </p>
              <p className="mt-1 text-xs text-gray-500">
                CSV, Excel, PDF, PowerPoint
              </p>
            </label>

            {uploadedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-[var(--ui-text)]">
                  Uploaded files
                </div>

                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-white px-4 py-3 text-sm"
                    >
                      <span>{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
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
        </section>
      )}

      <section className="brand-card p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Retailer snapshot
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
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
              <div key={item.label} className="rounded-lg border border-[var(--ui-border)] bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
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
          <p className="text-xs uppercase tracking-wide text-gray-500">
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
                <p className="text-xs uppercase tracking-wide text-gray-500">
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
            <p className="text-xs uppercase tracking-wide text-gray-500">
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
              <div key={item.label} className="rounded-lg border border-[var(--ui-border)] bg-white px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
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
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Recent signals
          </p>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--ui-border)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--ui-text)]">
                Latest press release highlights
              </p>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <p>• Pricing architecture update pending source feed</p>
                <p>• Promotional calendar activity to be summarized</p>
                <p>• Store opening or remodel signals awaiting refresh</p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--ui-border)] bg-white p-4">
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

      <section className={sectionCard}>
        <h2 className="text-xl font-semibold mb-4">Opportunity sizing breakdown</h2>

        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Base estimate (external data)</span>
            <span className="font-medium text-black">
              {opportunity.totalMarginUpliftBps}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Context adjustment</span>
            <span className="font-medium text-black">−20 bps</span>
          </div>

          <div className="flex justify-between">
            <span>Client data adjustment</span>
            <span className="font-medium text-black">
              {analysisMode === "hybrid" ? "+15 bps" : "+0 bps"}
            </span>
          </div>

          <div className="border-t pt-3 flex justify-between">
            <span className="font-medium text-black">Final estimate</span>
            <span className="font-semibold text-[var(--ui-navy)]">
              {analysisMode === "hybrid"
                ? "+135 bps"
                : opportunity.totalMarginUpliftBps}
            </span>
          </div>
        </div>

        <div className="pt-2 text-sm text-gray-600">
          Confidence: {analysisMode === "hybrid" ? "Medium-High" : "Medium"}
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Based on public signals, contextual inputs, and available client data
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="text-xl font-semibold mb-6">
          Total Estimated Value Opportunity
        </h2>

        <div className="grid grid-cols-4 gap-6">
          {[
            { value: opportunity.totalRevenueUpliftPct, label: "Revenue Growth" },
            { value: opportunity.totalMarginUpliftBps, label: "Margin Expansion" },
            { value: "Flat–+1.0%", label: "Unit Impact" },
            { value: "Moderate", label: "Confidence" },
          ].map((item) => (
            <div key={item.label} className={subCard}>
              <p className="text-2xl font-bold tracking-tight">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="brand-card p-6 space-y-3">
          <p className="font-medium text-black">Key drivers of opportunity</p>

          <div className="space-y-2 text-sm text-gray-600">
            <p>
              • Pricing misalignment vs competitors{" "}
              <span className="text-black font-medium">
                ({opportunity.pricing.marginUpliftBps})
              </span>
            </p>

            <p>
              • High promo intensity and depth{" "}
              <span className="text-black font-medium">
                ({opportunity.promotions.marginUpliftBps})
              </span>
            </p>

            <p>
              • Elevated markdown activity vs peers{" "}
              <span className="text-black font-medium">
                ({opportunity.markdown.marginUpliftBps})
              </span>
            </p>
          </div>
        </div>

        <div className="brand-card p-6 space-y-3">
          <p className="font-medium text-black">Confidence & assumptions</p>
          <p className="text-sm text-gray-600">Confidence: Medium</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>• Based on public signals only</p>
            <p>• No retailer internal elasticity data used</p>
            <p>• Estimates are directional and benchmark-based</p>
          </div>
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="text-xl font-semibold mb-4">Feedback on estimate</h2>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-[var(--ui-text)] mb-2">
              Does this opportunity size feel right?
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFeedbackRating("too_low")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackRating === "too_low"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                Too low
              </button>

              <button
                type="button"
                onClick={() => setFeedbackRating("about_right")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackRating === "about_right"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                About right
              </button>

              <button
                type="button"
                onClick={() => setFeedbackRating("too_high")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackRating === "too_high"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                Too high
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-[var(--ui-text)] mb-2">
              Which lever feels most uncertain?
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFeedbackLever("pricing")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackLever === "pricing"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                Pricing
              </button>

              <button
                type="button"
                onClick={() => setFeedbackLever("promotions")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackLever === "promotions"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                Promotions
              </button>

              <button
                type="button"
                onClick={() => setFeedbackLever("markdown")}
                className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                  feedbackLever === "markdown"
                    ? "border-[var(--ui-blue)] bg-[rgba(34,81,255,0.08)] text-[var(--ui-blue)]"
                    : "border-[var(--ui-border)] bg-white text-gray-600"
                }`}
              >
                Markdown
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[var(--ui-text)]">
              Notes
            </label>
            <textarea
              value={feedbackNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setFeedbackNotes(e.target.value)
              }
              placeholder="Add any comments on what feels high, low, or missing."
              className="mt-1 w-full rounded-lg border border-[var(--ui-border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--ui-blue)]"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              This feedback will be used to refine the opportunity estimate.
            </p>

            <button
              type="button"
              className="rounded-lg bg-[var(--ui-blue)] px-4 py-2 text-sm font-medium text-white"
            >
              Save feedback
            </button>
          </div>
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="text-xl font-semibold mb-4">Value by Lever</h2>

        <div className="space-y-4">
          {leverData.map((lever) => (
            <div key={lever.name} className={subCard}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">{lever.name}</p>
                  <p className="text-sm text-gray-500">{lever.value}</p>
                </div>
              </div>

              <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-black"
                  style={{ width: lever.width }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCard}>
        <h2 className="text-xl font-semibold mb-4">Top Actions</h2>

        <div className="space-y-3 text-sm">
          <div className={subCard}>1. Rebalance price-pack architecture</div>
          <div className={subCard}>2. Reduce blanket promotional frequency</div>
          <div className={subCard}>3. Reallocate promotions away from non-KVIs</div>
          <div className={subCard}>4. Improve markdown timing discipline</div>
          <div className={subCard}>5. Rationalize pack assortment</div>
        </div>
      </section>
    </div>
  
  )
  
)}

      {activeTab === "pricing" && (
        <div className="space-y-6">
          <section className={sectionCard}>
            <h2 className="text-xl font-semibold">Pricing</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose price position, KVI structure, price-pack architecture, and pricing ladder gaps.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Current State</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Position: Mid-tier</p>
                <p>Ladder: Compressed</p>
                <p>Competitiveness: Mixed</p>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Opportunity</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Revenue: +0.5%–1.5%</p>
                <p>Margin: +15–40 bps</p>
                <p>Unit Impact: Flat to +0.5%</p>
              </div>
            </section>
          </div>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-3">KVI Structure</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>KVIs priced competitively</p>
              <p>Over-investment in some categories</p>
              <p>Under-monetization of non-KVIs</p>
            </div>
          </section>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-3">Price-Pack Architecture</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Missing mid-tier packs</p>
              <p>Inconsistent price-per-unit scaling</p>
              <p>Limited trade-up pathways</p>
            </div>
          </section>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-4">Embedded Analysis</h3>
            <div className="space-y-8">
              <PricingLadderModule />
              <PriceZoneModule />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Introduce mid-tier packs</div>
                <div className={subCard}>Normalize price-per-unit logic</div>
                <div className={subCard}>Improve zone differentiation</div>
                <div className={subCard}>Increase non-KVI price capture</div>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Data Requests</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Elasticities by category</p>
                <p>• Price zones and rules</p>
                <p>• Pack-level sales mix</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-6">
          <section className={sectionCard}>
            <h2 className="text-xl font-semibold">Promotions</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose promo intensity, incrementality, vehicle mix, and KVI alignment.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Current State</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Promo intensity: High</p>
                <p>Discount depth: Moderate to deep</p>
                <p>Dependency: High</p>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Opportunity</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Revenue: +0.8%–2.0%</p>
                <p>Margin: +25–70 bps</p>
                <p>Unit Impact: Flat to +0.8%</p>
              </div>
            </section>
          </div>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-3">KVI Alignment</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>KVIs over-promoted</p>
              <p>Non-KVIs under-monetized</p>
              <p>Promo mix should be more selective</p>
            </div>
          </section>

          <section className={sectionCard}>
            <PromoCalendarModule />
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Reduce promo frequency</div>
                <div className={subCard}>Shift to event-based promotions</div>
                <div className={subCard}>Protect KVI pricing</div>
                <div className={subCard}>Use multi-buy to drive trade-up</div>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Data Requests</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Incremental promo lift data</p>
                <p>• Promo calendar</p>
                <p>• Vehicle-level performance</p>
                <p>• Vendor funding structure</p>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === "markdown" && (
        <div className="space-y-6">
          <section className={sectionCard}>
            <h2 className="text-xl font-semibold">Markdown</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose markdown timing, discount depth, sell-through, and inventory efficiency.
            </p>
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Current State</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Sell-through: Mixed</p>
                <p>Timing: Late</p>
                <p>Discount depth: Deep</p>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Opportunity</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Revenue: +0.2%–0.8%</p>
                <p>Margin: +10–35 bps</p>
                <p>Inventory: Improved turns</p>
              </div>
            </section>
          </div>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-3">KVI Interaction</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Occasional markdowns on KVIs</p>
              <p>Risk to price perception</p>
              <p>Need more discipline on what gets cleared and when</p>
            </div>
          </section>

          <section className={sectionCard}>
            <h3 className="font-semibold text-lg mb-3">Price-Pack Impact</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>Large packs driving markdown risk</p>
              <p>Too many slow-moving SKUs</p>
              <p>Pack rationalization could reduce clearance pressure</p>
            </div>
          </section>

          <section className={sectionCard}>
            <MarkdownModule />
          </section>

          <div className="grid grid-cols-2 gap-6">
            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className={subCard}>Earlier targeted markdowns</div>
                <div className={subCard}>Reduce deep clearance discounting</div>
                <div className={subCard}>Rationalize pack assortment</div>
              </div>
            </section>

            <section className={sectionCard}>
              <h3 className="font-semibold text-lg mb-3">Data Requests</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Inventory aging</p>
                <p>• Sell-through by SKU</p>
                <p>• Markdown policies</p>
                <p>• Clearance timing by pack</p>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
