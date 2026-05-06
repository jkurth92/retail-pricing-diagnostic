"use client";

import { useState } from "react";

type Tab = "overview" | "pricing" | "promotions" | "markdown";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const leverData = [
    {
      name: "Pricing",
      value: "+0.5%–1.5% rev | +15–40 bps",
      width: "35%",
    },
    {
      name: "Promotions",
      value: "+0.8%–2.0% rev | +25–70 bps",
      width: "55%",
    },
    {
      name: "Markdown",
      value: "+0.2%–0.8% rev | +10–35 bps",
      width: "20%",
    },
  ];

  return (
    <div className="p-10 max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Retail Pricing Diagnostic</h1>
        <p className="text-sm text-gray-500 mt-2">
          Analyze pricing, promotions, and markdown opportunity using public signals.
        </p>
      </div>

      <div className="flex gap-2 border-b">
        {[
          ["overview", "Overview"],
          ["pricing", "Pricing"],
          ["promotions", "Promotions"],
          ["markdown", "Markdown"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as Tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === key
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold mb-6">Executive Summary</h2>

            <div className="grid grid-cols-3 gap-6">
              {[
                {
                  title: "Pricing",
                  subtitle: "Moderate opportunity",
                  issue: "Weak price-pack ladder",
                },
                {
                  title: "Promotions",
                  subtitle: "High dependency",
                  issue: "Over-discounting",
                },
                {
                  title: "Markdown",
                  subtitle: "Inefficient clearance",
                  issue: "Late markdown timing",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="border rounded-xl p-5 shadow-sm hover:shadow-md transition bg-white"
                >
                  <h3 className="font-semibold text-lg">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.subtitle}</p>
                  <p className="text-xs mt-3 text-gray-500">
                    Key issue: {card.issue}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-6">
              Total Estimated Value Opportunity
            </h2>

            <div className="grid grid-cols-4 gap-6">
              {[
                { value: "+2.0%–4.5%", label: "Revenue Growth" },
                { value: "+75–180 bps", label: "Margin Expansion" },
                { value: "Flat–+1.0%", label: "Unit Impact" },
                { value: "Moderate", label: "Confidence" },
              ].map((item) => (
                <div key={item.label} className="border rounded-xl p-5 shadow-sm bg-white">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Value by Lever</h2>

            <div className="space-y-4">
              {leverData.map((lever) => (
                <div key={lever.name} className="border rounded-xl p-5 bg-white shadow-sm">
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
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Top Actions</h2>

            <div className="space-y-3 text-sm">
              <div className="p-3 border rounded-lg bg-white">
                1. Rebalance price-pack architecture
              </div>
              <div className="p-3 border rounded-lg bg-white">
                2. Reduce blanket promotional frequency
              </div>
              <div className="p-3 border rounded-lg bg-white">
                3. Reallocate promotions away from non-KVIs
              </div>
              <div className="p-3 border rounded-lg bg-white">
                4. Improve markdown timing discipline
              </div>
              <div className="p-3 border rounded-lg bg-white">
                5. Rationalize pack assortment
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="space-y-6">
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold">Pricing</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose price position, KVI structure, price-pack architecture, and pricing ladder gaps.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Current State</h3>
              <p className="text-sm text-gray-600">Position: Mid-tier</p>
              <p className="text-sm text-gray-600">Ladder: Compressed</p>
              <p className="text-sm text-gray-600">Competitiveness: Mixed</p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Opportunity</h3>
              <p className="text-sm text-gray-600">Revenue: +0.5%–1.5%</p>
              <p className="text-sm text-gray-600">Margin: +15–40 bps</p>
              <p className="text-sm text-gray-600">Unit Impact: Flat to +0.5%</p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">KVI Structure</h3>
            <p className="text-sm text-gray-600">KVIs priced competitively</p>
            <p className="text-sm text-gray-600">Over-investment in some categories</p>
            <p className="text-sm text-gray-600">Under-monetization of non-KVIs</p>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Price-Pack Architecture</h3>
            <p className="text-sm text-gray-600">Missing mid-tier packs</p>
            <p className="text-sm text-gray-600">Inconsistent price-per-unit scaling</p>
            <p className="text-sm text-gray-600">Limited trade-up pathways</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Embedded Analysis</h3>
              <div className="border rounded-lg p-4 text-sm text-gray-500">
                Pricing ladder module placeholder
              </div>
              <div className="border rounded-lg p-4 text-sm text-gray-500">
                Price zone module placeholder
              </div>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded-lg">Introduce mid-tier packs</div>
                <div className="p-3 border rounded-lg">Normalize price-per-unit logic</div>
                <div className="p-3 border rounded-lg">Improve zone differentiation</div>
                <div className="p-3 border rounded-lg">Increase non-KVI price capture</div>
              </div>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Data Requests</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Elasticities by category</p>
              <p>• Price zones and rules</p>
              <p>• Pack-level sales mix</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "promotions" && (
        <div className="space-y-6">
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold">Promotions</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose promo intensity, incrementality, vehicle mix, and KVI alignment.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Current State</h3>
              <p className="text-sm text-gray-600">Promo intensity: High</p>
              <p className="text-sm text-gray-600">Discount depth: Moderate to deep</p>
              <p className="text-sm text-gray-600">Dependency: High</p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Opportunity</h3>
              <p className="text-sm text-gray-600">Revenue: +0.8%–2.0%</p>
              <p className="text-sm text-gray-600">Margin: +25–70 bps</p>
              <p className="text-sm text-gray-600">Unit Impact: Flat to +0.8%</p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">KVI Alignment</h3>
            <p className="text-sm text-gray-600">KVIs over-promoted</p>
            <p className="text-sm text-gray-600">Non-KVIs under-monetized</p>
            <p className="text-sm text-gray-600">Promo mix should be more selective</p>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Promo Calendar & Lift Insights</h3>
            <p className="text-sm text-gray-600">High frequency and overlapping events</p>
            <p className="text-sm text-gray-600">Diminishing returns at high discount depth</p>
            <p className="text-sm text-gray-600">Some promotions appear non-incremental</p>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Promo Vehicle Diagnostics</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Feature + display most effective</p>
              <p>• Blanket discounts underperform</p>
              <p>• Multi-buy may support trade-up better than % off</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded-lg">Reduce promo frequency</div>
                <div className="p-3 border rounded-lg">Shift to event-based promotions</div>
                <div className="p-3 border rounded-lg">Protect KVI pricing</div>
                <div className="p-3 border rounded-lg">Use multi-buy to drive trade-up</div>
              </div>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Data Requests</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Incremental promo lift data</p>
                <p>• Promo calendar</p>
                <p>• Vehicle-level performance</p>
                <p>• Vendor funding structure</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "markdown" && (
        <div className="space-y-6">
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold">Markdown</h2>
            <p className="text-sm text-gray-600 mt-2">
              Diagnose markdown timing, discount depth, sell-through, and inventory efficiency.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Current State</h3>
              <p className="text-sm text-gray-600">Sell-through: Mixed</p>
              <p className="text-sm text-gray-600">Timing: Late</p>
              <p className="text-sm text-gray-600">Discount depth: Deep</p>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Opportunity</h3>
              <p className="text-sm text-gray-600">Revenue: +0.2%–0.8%</p>
              <p className="text-sm text-gray-600">Margin: +10–35 bps</p>
              <p className="text-sm text-gray-600">Inventory: Improved turns</p>
            </div>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">KVI Interaction</h3>
            <p className="text-sm text-gray-600">Occasional markdowns on KVIs</p>
            <p className="text-sm text-gray-600">Risk to price perception</p>
            <p className="text-sm text-gray-600">Need more discipline on what gets cleared and when</p>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Price-Pack Impact</h3>
            <p className="text-sm text-gray-600">Large packs driving markdown risk</p>
            <p className="text-sm text-gray-600">Too many slow-moving SKUs</p>
            <p className="text-sm text-gray-600">Pack rationalization could reduce clearance pressure</p>
          </div>

          <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
            <h3 className="font-semibold text-lg">Markdown Pattern Insights</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Late markdown intervention</p>
              <p>• Heavy end-of-life discounting</p>
              <p>• Deep clearance likely creating margin leakage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Recommendations</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded-lg">Earlier targeted markdowns</div>
                <div className="p-3 border rounded-lg">Reduce deep clearance discounting</div>
                <div className="p-3 border rounded-lg">Rationalize pack assortment</div>
              </div>
            </div>

            <div className="border rounded-xl p-6 bg-white shadow-sm space-y-3">
              <h3 className="font-semibold text-lg">Data Requests</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Inventory aging</p>
                <p>• Sell-through by SKU</p>
                <p>• Markdown policies</p>
                <p>• Clearance timing by pack</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
