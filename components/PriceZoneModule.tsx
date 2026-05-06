"use client";

import { useMemo, useState } from "react";

type ZoneRow = {
  zone: string;
  client: string;
  compA: string;
  compB: string;
  compC: string;
};

function buildZones(item1: string, item2: string, item3: string): ZoneRow[] {
  const inputs = [item1, item2, item3].map((x) => x.trim().toLowerCase());

  const isMilk = inputs.some((x) => x.includes("milk"));
  const isCereal = inputs.some((x) => x.includes("cereal"));
  const isSoup = inputs.some((x) => x.includes("soup"));

  if (isMilk) {
    return [
      { zone: "Zone 1", client: "$1.99", compA: "$2.09", compB: "$1.95", compC: "$2.12" },
      { zone: "Zone 2", client: "$2.05", compA: "$2.11", compB: "$2.00", compC: "$2.18" },
      { zone: "Zone 3", client: "$2.14", compA: "$2.20", compB: "$2.08", compC: "$2.24" },
    ];
  }

  if (isCereal) {
    return [
      { zone: "Zone 1", client: "$4.79", compA: "$4.99", compB: "$4.69", compC: "$5.09" },
      { zone: "Zone 2", client: "$4.89", compA: "$5.05", compB: "$4.79", compC: "$5.15" },
      { zone: "Zone 3", client: "$5.02", compA: "$5.11", compB: "$4.88", compC: "$5.20" },
    ];
  }

  if (isSoup) {
    return [
      { zone: "Zone 1", client: "$2.39", compA: "$2.49", compB: "$2.29", compC: "$2.55" },
      { zone: "Zone 2", client: "$2.44", compA: "$2.53", compB: "$2.34", compC: "$2.60" },
      { zone: "Zone 3", client: "$2.51", compA: "$2.58", compB: "$2.39", compC: "$2.64" },
    ];
  }

  return [
    { zone: "Zone 1", client: "$1.99", compA: "$2.09", compB: "$1.95", compC: "$2.12" },
    { zone: "Zone 2", client: "$2.05", compA: "$2.11", compB: "$2.00", compC: "$2.18" },
    { zone: "Zone 3", client: "$2.14", compA: "$2.20", compB: "$2.08", compC: "$2.24" },
  ];
}

export default function PriceZoneModule() {
  const [item1, setItem1] = useState("");
  const [item2, setItem2] = useState("");
  const [item3, setItem3] = useState("");

  const [generatedItems, setGeneratedItems] = useState([
    "Example item 1",
    "Example item 2",
    "Example item 3",
  ]);

  const rows = useMemo(
    () => buildZones(generatedItems[0], generatedItems[1], generatedItems[2]),
    [generatedItems]
  );

  const handleGenerate = () => {
    setGeneratedItems([
      item1.trim() || "Example item 1",
      item2.trim() || "Example item 2",
      item3.trim() || "Example item 3",
    ]);
  };

  return (
    <div className="border rounded-xl p-6 bg-white shadow-sm space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Price Zone Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter 3 items to compare price position across zones and competitors.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Item 1"
          value={item1}
          onChange={(e) => setItem1(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Item 2"
          value={item2}
          onChange={(e) => setItem2(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Item 3"
          value={item3}
          onChange={(e) => setItem3(e.target.value)}
        />
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-lg bg-black text-white px-4 py-2 text-sm"
        >
          Generate Zones
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <p>
          <span className="font-medium text-black">Item 1:</span> {generatedItems[0]}
        </p>
        <p>
          <span className="font-medium text-black">Item 2:</span> {generatedItems[1]}
        </p>
        <p>
          <span className="font-medium text-black">Item 3:</span> {generatedItems[2]}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[700px]">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Zone</th>
              <th className="py-2 pr-4">Client</th>
              <th className="py-2 pr-4">Competitor A</th>
              <th className="py-2 pr-4">Competitor B</th>
              <th className="py-2 pr-4">Competitor C</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((zone) => (
              <tr key={zone.zone} className="border-b last:border-b-0">
                <td className="py-3 pr-4 font-medium">{zone.zone}</td>
                <td className="py-3 pr-4">{zone.client}</td>
                <td className="py-3 pr-4">{zone.compA}</td>
                <td className="py-3 pr-4">{zone.compB}</td>
                <td className="py-3 pr-4">{zone.compC}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Zones show only modest differentiation</p>
            <p>• Client is consistently positioned near competitor averages</p>
            <p>• Local competitive intensity may not be fully reflected</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Diagnostic Output</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Zone maturity: Moderate</p>
            <p>• Price variation: Limited</p>
            <p>• Opportunity: Better local price separation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
