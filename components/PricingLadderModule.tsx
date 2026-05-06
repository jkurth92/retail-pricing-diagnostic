"use client";

import { useMemo, useState } from "react";

type CompetitorRow = {
  name: string;
  points: string[];
};

function buildLadder(item: string): CompetitorRow[] {
  const key = item.trim().toLowerCase();

  if (key.includes("milk")) {
    return [
      { name: "Client", points: ["$5.98/64oz", "$4.49/48oz", "$3.29/32oz"] },
      { name: "Competitor A", points: ["$6.29/64oz", "$4.59/48oz", "$3.39/32oz"] },
      { name: "Competitor B", points: ["$5.79/64oz", "$4.29/48oz", "$3.19/32oz", "$2.39/16oz"] },
      { name: "Competitor C", points: ["$6.19/64oz", "$4.69/48oz", "$3.49/32oz"] },
      { name: "Competitor D", points: ["$5.49/64oz", "$4.19/48oz", "$3.09/32oz"] },
    ];
  }

  if (key.includes("cereal")) {
    return [
      { name: "Client", points: ["$4.99/12oz", "$3.79/10oz", "$2.99/8oz"] },
      { name: "Competitor A", points: ["$5.49/12oz", "$4.09/10oz", "$3.29/8oz"] },
      { name: "Competitor B", points: ["$4.79/12oz", "$3.59/10oz", "$2.79/8oz", "$1.99/6oz"] },
      { name: "Competitor C", points: ["$5.69/12oz", "$4.19/10oz", "$3.49/8oz"] },
      { name: "Competitor D", points: ["$4.59/12oz", "$3.49/10oz", "$2.69/8oz"] },
    ];
  }

  if (key.includes("soup")) {
    return [
      { name: "Client", points: ["$2.49/10oz", "$2.19/8oz", "$1.79/6oz"] },
      { name: "Competitor A", points: ["$2.79/10oz", "$2.39/8oz", "$1.89/6oz"] },
      { name: "Competitor B", points: ["$2.29/10oz", "$1.99/8oz", "$1.59/6oz"] },
      { name: "Competitor C", points: ["$2.89/10oz", "$2.49/8oz", "$1.99/6oz"] },
      { name: "Competitor D", points: ["$2.19/10oz", "$1.89/8oz", "$1.49/6oz"] },
    ];
  }

  return [
    { name: "Client", points: ["$5.98/64oz", "$4.49/48oz", "$3.29/32oz"] },
    { name: "Competitor A", points: ["$7.99/64oz", "$5.59/48oz", "$4.09/32oz"] },
    { name: "Competitor B", points: ["$3.49/9oz", "$2.99/12oz", "$2.19/10oz", "$1.79/9oz", "$2.39/12oz"] },
    { name: "Competitor C", points: ["$2.48/10oz", "$2.32/10oz", "$1.98/10oz", "$1.97/10.8oz", "$5.98/52oz"] },
    { name: "Competitor D", points: ["$2.29/16oz", "$4.39/32oz", "$1.99/16oz"] },
  ];
}

export default function PricingLadderModule() {
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [generatedItem, setGeneratedItem] = useState("Example item");
  const [generatedCategory, setGeneratedCategory] = useState("Example category");

  const ladder = useMemo(() => buildLadder(generatedItem), [generatedItem]);

  const handleGenerate = () => {
    setGeneratedItem(item.trim() || "Example item");
    setGeneratedCategory(category.trim() || "Example category");
  };

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Pricing Ladder Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter an item to recreate a price-per-unit ladder across the retailer and competitors.
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
          Generate Ladder
        </button>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>
          <span className="font-medium text-black">Item:</span> {generatedItem}
        </p>
        <p>
          <span className="font-medium text-black">Category:</span> {generatedCategory}
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6 items-end overflow-x-auto">
        {ladder.map((competitor) => (
          <div key={competitor.name} className="space-y-3 min-w-[140px]">
            <p className="font-medium text-sm">{competitor.name}</p>
            <div className="h-72 border rounded-lg bg-gray-50 p-3 flex flex-col justify-end gap-2">
              {competitor.points.map((point) => (
                <div
                  key={point}
                  className="text-xs bg-white border rounded px-2 py-1 shadow-sm"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Assortment breadth varies materially by competitor</p>
            <p>• Client appears compressed relative to the market</p>
            <p>• Mid-tier pack options appear limited</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Diagnostic Output</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Ladder coverage: Narrow</p>
            <p>• Price-per-unit gaps: Inconsistent</p>
            <p>• Trade-up pathway: Weak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
