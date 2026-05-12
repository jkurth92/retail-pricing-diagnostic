"use client";

import { useMemo, useState } from "react";

type PromoWeek = {
  week: string;
  feature: boolean;
  display: boolean;
  priceOff: boolean;
  bogo: boolean;
  digital: boolean;
};

function buildPromoCalendar(item: string): PromoWeek[] {
  const key = item.trim().toLowerCase();

  if (key.includes("milk")) {
    return [
      { week: "W1", feature: true, display: false, priceOff: true, bogo: false, digital: true },
      { week: "W2", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W3", feature: true, display: true, priceOff: true, bogo: false, digital: true },
      { week: "W4", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W5", feature: true, display: false, priceOff: true, bogo: true, digital: true },
      { week: "W6", feature: false, display: false, priceOff: false, bogo: false, digital: false },
    ];
  }

  if (key.includes("cereal")) {
    return [
      { week: "W1", feature: true, display: true, priceOff: true, bogo: false, digital: true },
      { week: "W2", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W3", feature: true, display: false, priceOff: true, bogo: true, digital: true },
      { week: "W4", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W5", feature: true, display: true, priceOff: true, bogo: false, digital: true },
      { week: "W6", feature: false, display: false, priceOff: false, bogo: false, digital: false },
    ];
  }

  if (key.includes("soup")) {
    return [
      { week: "W1", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W2", feature: true, display: false, priceOff: true, bogo: false, digital: true },
      { week: "W3", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W4", feature: true, display: true, priceOff: true, bogo: false, digital: true },
      { week: "W5", feature: false, display: false, priceOff: false, bogo: false, digital: false },
      { week: "W6", feature: true, display: false, priceOff: true, bogo: true, digital: true },
    ];
  }

  return [
    { week: "W1", feature: true, display: false, priceOff: true, bogo: false, digital: true },
    { week: "W2", feature: false, display: false, priceOff: false, bogo: false, digital: false },
    { week: "W3", feature: true, display: true, priceOff: true, bogo: false, digital: true },
    { week: "W4", feature: false, display: false, priceOff: false, bogo: false, digital: false },
    { week: "W5", feature: true, display: false, priceOff: true, bogo: true, digital: true },
    { week: "W6", feature: false, display: false, priceOff: false, bogo: false, digital: false },
  ];
}

export default function PromoCalendarModule() {
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [generatedItem, setGeneratedItem] = useState("Example item");
  const [generatedCategory, setGeneratedCategory] = useState("Example category");

  const calendar = useMemo(() => buildPromoCalendar(generatedItem), [generatedItem]);

  const handleGenerate = () => {
    setGeneratedItem(item.trim() || "Example item");
    setGeneratedCategory(category.trim() || "Example category");
  };

  const summary = useMemo(() => {
    const totalWeeks = calendar.length;
    const promoWeeks = calendar.filter((w) => w.feature || w.display || w.priceOff || w.bogo || w.digital).length;
    const alwaysOn = promoWeeks / totalWeeks > 0.7;
    const featureCount = calendar.filter((w) => w.feature).length;
    const displayCount = calendar.filter((w) => w.display).length;

    return {
      promoDensity: `${promoWeeks}/${totalWeeks} weeks`,
      pattern: alwaysOn ? "High frequency / always-on" : "Event-driven / selective",
      featureCount,
      displayCount,
      liftSignal: featureCount + displayCount > 4 ? "Stronger incrementality" : "Mixed incrementality",
    };
  }, [calendar]);

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Promo Calendar & Lift Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter an item to visualize promo cadence, vehicle mix, and likely incrementality.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Item name"
          value={item}
          onChange={(e) => setItem(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm"
        >
          Generate Promo View
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <p>
          <span className="font-medium text-black">Item:</span> {generatedItem}
        </p>
        <p>
          <span className="font-medium text-black">Category:</span> {generatedCategory}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-6 gap-2 mb-2 text-xs font-medium text-gray-500">
            {calendar.map((week) => (
              <div key={week.week} className="text-center">
                {week.week}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {calendar.map((week) => (
              <div key={week.week} className="border rounded-lg p-2 bg-gray-50 space-y-2">
                <div className="text-center text-sm font-semibold">{week.week}</div>

                <div className="space-y-1 text-xs">
                  <div className={`px-2 py-1 rounded border ${week.feature ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Feature
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.display ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Display
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.priceOff ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Price-off
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.bogo ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    BOGO
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.digital ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Digital
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Promo cadence shows how frequent and clustered the events are</p>
            <p>• Feature + display tends to be stronger than blanket price-off</p>
            <p>• Heavy promo density can signal customer conditioning risk</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Diagnostic Output</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Promo density: {summary.promoDensity}</p>
            <p>• Pattern: {summary.pattern}</p>
            <p>• Lift signal: {summary.liftSignal}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
