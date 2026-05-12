"use client";

import { useMemo, useState } from "react";

type MarkdownWeek = {
  week: string;
  fullPrice: boolean;
  promoMarkdown: boolean;
  clearance: boolean;
  deepCut: boolean;
};

function buildMarkdownSchedule(item: string): MarkdownWeek[] {
  const key = item.trim().toLowerCase();

  if (key.includes("milk")) {
    return [
      { week: "W1", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W2", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W3", fullPrice: false, promoMarkdown: true, clearance: false, deepCut: false },
      { week: "W4", fullPrice: false, promoMarkdown: true, clearance: true, deepCut: false },
      { week: "W5", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
      { week: "W6", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
    ];
  }

  if (key.includes("cereal")) {
    return [
      { week: "W1", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W2", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W3", fullPrice: false, promoMarkdown: true, clearance: false, deepCut: false },
      { week: "W4", fullPrice: false, promoMarkdown: true, clearance: true, deepCut: false },
      { week: "W5", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
      { week: "W6", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
    ];
  }

  if (key.includes("soup")) {
    return [
      { week: "W1", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W2", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W3", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
      { week: "W4", fullPrice: false, promoMarkdown: true, clearance: false, deepCut: false },
      { week: "W5", fullPrice: false, promoMarkdown: true, clearance: true, deepCut: false },
      { week: "W6", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
    ];
  }

  return [
    { week: "W1", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
    { week: "W2", fullPrice: true, promoMarkdown: false, clearance: false, deepCut: false },
    { week: "W3", fullPrice: false, promoMarkdown: true, clearance: false, deepCut: false },
    { week: "W4", fullPrice: false, promoMarkdown: true, clearance: true, deepCut: false },
    { week: "W5", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
    { week: "W6", fullPrice: false, promoMarkdown: false, clearance: true, deepCut: true },
  ];
}

export default function MarkdownModule() {
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [generatedItem, setGeneratedItem] = useState("Example item");
  const [generatedCategory, setGeneratedCategory] = useState("Example category");

  const schedule = useMemo(() => buildMarkdownSchedule(generatedItem), [generatedItem]);

  const handleGenerate = () => {
    setGeneratedItem(item.trim() || "Example item");
    setGeneratedCategory(category.trim() || "Example category");
  };

  const summary = useMemo(() => {
    const markdownWeeks = schedule.filter((w) => w.promoMarkdown || w.clearance || w.deepCut).length;
    const lateClearance = schedule.slice(-2).some((w) => w.deepCut);
    return {
      markdownWeeks: `${markdownWeeks}/${schedule.length} weeks`,
      timing: lateClearance ? "Late markdown timing" : "Controlled markdown timing",
      depth: schedule.some((w) => w.deepCut) ? "Deep clearance present" : "No deep clearance",
    };
  }, [schedule]);

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Markdown Timing & Clearance Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter an item to visualize markdown timing, clearance pressure, and discount depth.
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
          Generate Markdown View
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
            {schedule.map((week) => (
              <div key={week.week} className="text-center">
                {week.week}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {schedule.map((week) => (
              <div key={week.week} className="border rounded-lg p-2 bg-gray-50 space-y-2">
                <div className="text-center text-sm font-semibold">{week.week}</div>

                <div className="space-y-1 text-xs">
                  <div className={`px-2 py-1 rounded border ${week.fullPrice ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Full Price
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.promoMarkdown ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Promo Markdown
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.clearance ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Clearance
                  </div>
                  <div className={`px-2 py-1 rounded border ${week.deepCut ? "bg-white" : "bg-gray-100 text-gray-400"}`}>
                    Deep Cut
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
            <p>• Late markdowns often force deeper clearance than necessary</p>
            <p>• Earlier intervention can protect margin and improve sell-through</p>
            <p>• Markdown patterns should vary by item lifecycle and pack size</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Diagnostic Output</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Markdown weeks: {summary.markdownWeeks}</p>
            <p>• Timing: {summary.timing}</p>
            <p>• Depth: {summary.depth}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
