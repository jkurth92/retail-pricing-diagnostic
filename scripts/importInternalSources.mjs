import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const pricingDocsDir = path.join(repoRoot, "Pricing docs");
const internalDataDir = path.join(repoRoot, "Internal Data");
const povOutputPath = path.join(repoRoot, "data", "internal", "pov", "pricingPov.json");
const benchmarkOutputPath = path.join(
  repoRoot,
  "data",
  "internal",
  "benchmarks",
  "internalBenchmarkRepository.json"
);

const supportedPovExtensions = new Set([
  ".pptx",
  ".xlsx",
  ".pdf",
  ".txt",
  ".md",
  ".csv",
  ".json",
]);
const supportedBenchmarkExtensions = new Set([".csv", ".json"]);

const guidanceTaxonomy = [
  {
    key: "kviGuidance",
    label: "KVI guidance",
    keywords: ["kvi", "known value", "key value", "traffic", "price perception"],
  },
  {
    key: "pricingThresholds",
    label: "Pricing thresholds",
    keywords: ["threshold", "corridor", "gap", "variance", "index", "bps", "percent"],
  },
  {
    key: "architecturePrinciples",
    label: "Architecture principles",
    keywords: ["architecture", "ladder", "good better best", "pack", "price point"],
  },
  {
    key: "zoningPrinciples",
    label: "Zoning principles",
    keywords: ["zone", "zoning", "localized", "local", "market", "geography"],
  },
  {
    key: "guardrails",
    label: "Guardrails",
    keywords: ["guardrail", "rule", "exception", "floor", "ceiling", "constraint"],
  },
  {
    key: "confidenceGuidance",
    label: "Confidence guidance",
    keywords: ["confidence", "quality", "sample", "coverage", "evidence", "reliability"],
  },
  {
    key: "recommendationLanguage",
    label: "Recommendation language",
    keywords: ["recommend", "opportunity", "action", "should", "prioritize", "next step"],
  },
];

const elasticityBenchmarks = [
  {
    segment: "KVIs",
    elasticityRange: [-2.5, -1.3],
    use: "Higher sensitivity items used to protect price perception and traffic.",
  },
  {
    segment: "Core basket",
    elasticityRange: [-1.6, -0.8],
    use: "Mainstream categories where moves should stay within tested corridors.",
  },
  {
    segment: "Long-tail / discretionary",
    elasticityRange: [-0.9, -0.3],
    use: "Lower sensitivity items that can absorb broader architecture moves.",
  },
];

const ensureParentDirectory = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkFiles(entryPath);
    return entry.isFile() ? [entryPath] : [];
  });
};

const decodeXmlEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

const cleanText = (value) =>
  decodeXmlEntities(value)
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, "")
    .trim();

const splitSentences = (text) =>
  cleanText(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24 && sentence.length <= 450);

const extractZipEntries = (filePath, entryPattern) => {
  const buffer = fs.readFileSync(filePath);
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) return [];

  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  const entries = [];
  let offset = centralDirectoryOffset;

  while (offset < centralDirectoryEnd && buffer.readUInt32LE(offset) === 0x02014b50) {
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (entryPattern.test(fileName) && buffer.readUInt32LE(localHeaderOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
      let entryBuffer = null;

      if (compressionMethod === 0) entryBuffer = compressed;
      if (compressionMethod === 8) entryBuffer = zlib.inflateRawSync(compressed);
      if (entryBuffer) entries.push(entryBuffer.toString("utf8"));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

const extractOfficeText = (filePath, extension) => {
  const entryPattern =
    extension === ".pptx"
      ? /^ppt\/(slides|notesSlides)\/.+\.xml$/i
      : /^xl\/(sharedStrings|worksheets)\/.+\.xml$/i;
  const xmlEntries = extractZipEntries(filePath, entryPattern);

  return xmlEntries
    .flatMap((xml) => {
      const textNodes = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>|<t[^>]*>([\s\S]*?)<\/t>/g)];
      if (textNodes.length > 0) {
        return textNodes.map((match) => cleanText(match[1] || match[2] || ""));
      }

      return [cleanText(xml.replace(/<[^>]+>/g, " "))];
    })
    .filter(Boolean)
    .join(". ");
};

const extractPdfText = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const binary = buffer.toString("latin1");
  const streamMatches = [...binary.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  const fragments = [];

  for (const match of streamMatches) {
    const stream = Buffer.from(match[1] || "", "latin1");
    let inflated = null;

    try {
      inflated = zlib.inflateSync(stream);
    } catch {
      try {
        inflated = zlib.inflateRawSync(stream);
      } catch {
        inflated = stream;
      }
    }

    const text = inflated.toString("latin1");
    fragments.push(
      ...[...text.matchAll(/\(([^()]*)\)\s*Tj/g)].map((textMatch) => textMatch[1] || ""),
      ...[...text.matchAll(/\[([\s\S]*?)\]\s*TJ/g)].map((arrayMatch) =>
        [...(arrayMatch[1] || "").matchAll(/\(([^()]*)\)/g)]
          .map((textMatch) => textMatch[1] || "")
          .join(" ")
      )
    );
  }

  return cleanText(fragments.join(" "));
};

const extractTextFromPovFile = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".pptx" || extension === ".xlsx") return extractOfficeText(filePath, extension);
  if (extension === ".pdf") return extractPdfText(filePath);
  return fs.readFileSync(filePath, "utf8");
};

const classifyGuidance = (sentence) => {
  const normalized = sentence.toLowerCase();
  return guidanceTaxonomy
    .filter((category) => category.keywords.some((keyword) => normalized.includes(keyword)))
    .map((category) => category.key);
};

const buildPricingPovStore = () => {
  const files = walkFiles(pricingDocsDir);
  const supportedFiles = files.filter((filePath) =>
    supportedPovExtensions.has(path.extname(filePath).toLowerCase())
  );
  const unsupportedFiles = files.filter(
    (filePath) => !supportedPovExtensions.has(path.extname(filePath).toLowerCase())
  );
  const guidance = Object.fromEntries(guidanceTaxonomy.map((category) => [category.key, []]));

  for (const filePath of supportedFiles) {
    let text = "";
    try {
      text = extractTextFromPovFile(filePath);
    } catch (error) {
      console.warn(
        "[internal-import] Unable to parse POV file:",
        JSON.stringify({ file: path.basename(filePath), error: error.message })
      );
      continue;
    }

    for (const sentence of splitSentences(text)) {
      for (const categoryKey of classifyGuidance(sentence)) {
        if (guidance[categoryKey].length >= 75) continue;
        guidance[categoryKey].push({
          id: `${categoryKey}-${guidance[categoryKey].length + 1}`,
          sourceFile: path.basename(filePath),
          guidance: sentence,
        });
      }
    }
  }

  const guidanceCount = Object.values(guidance).reduce((total, items) => total + items.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    sourceDirectory: "Pricing docs/",
    supportedFileCount: supportedFiles.length,
    unsupportedFiles: unsupportedFiles.map((filePath) => path.basename(filePath)),
    categories: guidanceTaxonomy.map(({ key, label, keywords }) => ({
      key,
      label,
      keywords,
      count: guidance[key].length,
    })),
    guidanceCount,
    guidance,
  };
};

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
};

const parseNumeric = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const percentile = (values, pct) => {
  if (values.length === 0) return null;
  const sortedValues = [...values].sort((left, right) => left - right);
  const index = (sortedValues.length - 1) * pct;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  return sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (index - lower);
};

const roundNumber = (value, decimals = 2) =>
  value === null ? null : Number(value.toFixed(decimals));

const createAggregate = () => ({
  rowCount: 0,
  pricedCount: 0,
  inStockCount: 0,
  promotedCount: 0,
  priceValues: [],
  unitPriceValues: [],
  stateCounts: new Map(),
  brandCounts: new Map(),
});

const incrementMap = (map, key) => {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
};

const summarizeTopCounts = (map, limit = 10) =>
  [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

const finalizeAggregate = (aggregate) => {
  const averagePrice =
    aggregate.priceValues.length > 0
      ? aggregate.priceValues.reduce((total, value) => total + value, 0) / aggregate.priceValues.length
      : null;
  const averageUnitPrice =
    aggregate.unitPriceValues.length > 0
      ? aggregate.unitPriceValues.reduce((total, value) => total + value, 0) /
        aggregate.unitPriceValues.length
      : null;

  return {
    rowCount: aggregate.rowCount,
    pricedCount: aggregate.pricedCount,
    inStockPct:
      aggregate.rowCount > 0 ? roundNumber((aggregate.inStockCount / aggregate.rowCount) * 100, 1) : null,
    promotedPct:
      aggregate.rowCount > 0
        ? roundNumber((aggregate.promotedCount / aggregate.rowCount) * 100, 1)
        : null,
    priceStats: {
      average: roundNumber(averagePrice),
      p25: roundNumber(percentile(aggregate.priceValues, 0.25)),
      median: roundNumber(percentile(aggregate.priceValues, 0.5)),
      p75: roundNumber(percentile(aggregate.priceValues, 0.75)),
    },
    unitPriceStats: {
      average: roundNumber(averageUnitPrice),
      median: roundNumber(percentile(aggregate.unitPriceValues, 0.5)),
    },
    topStates: summarizeTopCounts(aggregate.stateCounts, 8),
    topBrands: summarizeTopCounts(aggregate.brandCounts, 8),
  };
};

const normalizeBenchmarkCsv = (filePath) => {
  const rows = parseCsvRows(fs.readFileSync(filePath, "utf8"));
  if (rows.length === 0) return null;

  const headers = rows[0].map((header) => header.trim());
  const headerIndex = new Map(headers.map((header, index) => [header.toLowerCase(), index]));
  const getValue = (row, aliases) => {
    for (const alias of aliases) {
      const index = headerIndex.get(alias);
      if (index !== undefined) return row[index] || "";
    }
    return "";
  };

  const repository = {
    sourceFile: path.basename(filePath),
    rowCount: 0,
    benchmarkKind: path.basename(filePath).toLowerCase().includes("walmart")
      ? "walmart_scrape"
      : "benchmark_csv",
    retailer: "Unknown",
    categories: new Map(),
    aggregate: createAggregate(),
  };

  for (const row of rows.slice(1)) {
    const sourceName = getValue(row, ["source_name", "retailer", "source"]);
    const breadcrumb = getValue(row, ["breadcrumb", "category", "department"]);
    const category = breadcrumb
      ? breadcrumb
          .split(">")
          .slice(0, 3)
          .map((part) => part.trim())
          .filter(Boolean)
          .join(" > ")
      : "Uncategorized";
    const brand = getValue(row, ["product_brand", "brand"]);
    const state = getValue(row, ["state"]);
    const availability = getValue(row, ["availability_fulltext", "availability", "status"]).toLowerCase();
    const promotion = getValue(row, ["promotion_fulltext", "promotion_code", "promo"]).trim();
    const price = parseNumeric(getValue(row, ["price", "regular_price", "sales_price"]));
    const size = parseNumeric(getValue(row, ["container_size", "size"]));

    repository.rowCount += 1;
    if (sourceName && repository.retailer === "Unknown") repository.retailer = sourceName;

    const aggregate = repository.aggregate;
    const categoryAggregate = repository.categories.get(category) || createAggregate();

    for (const target of [aggregate, categoryAggregate]) {
      target.rowCount += 1;
      if (price !== null) {
        target.pricedCount += 1;
        target.priceValues.push(price);
        if (size !== null && size > 0) target.unitPriceValues.push(price / size);
      }
      if (availability.includes("in stock")) target.inStockCount += 1;
      if (promotion) target.promotedCount += 1;
      incrementMap(target.stateCounts, state);
      incrementMap(target.brandCounts, brand);
    }

    repository.categories.set(category, categoryAggregate);
  }

  return {
    sourceFile: repository.sourceFile,
    benchmarkKind: repository.benchmarkKind,
    retailer: repository.retailer,
    rowCount: repository.rowCount,
    aggregate: finalizeAggregate(repository.aggregate),
    categories: [...repository.categories.entries()]
      .sort((left, right) => right[1].rowCount - left[1].rowCount)
      .slice(0, 50)
      .map(([name, aggregate]) => ({
        name,
        ...finalizeAggregate(aggregate),
      })),
  };
};

const buildBenchmarkRepository = () => {
  const files = walkFiles(internalDataDir);
  const supportedFiles = files.filter((filePath) =>
    supportedBenchmarkExtensions.has(path.extname(filePath).toLowerCase())
  );
  const datasets = [];

  for (const filePath of supportedFiles) {
    if (path.extname(filePath).toLowerCase() === ".csv") {
      const dataset = normalizeBenchmarkCsv(filePath);
      if (dataset) datasets.push(dataset);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceDirectory: "Internal Data/",
    benchmarkFileCount: supportedFiles.length,
    datasets,
    elasticityBenchmarks,
  };
};

const main = () => {
  const pricingPovStore = buildPricingPovStore();
  const benchmarkRepository = buildBenchmarkRepository();

  ensureParentDirectory(povOutputPath);
  ensureParentDirectory(benchmarkOutputPath);
  fs.writeFileSync(povOutputPath, `${JSON.stringify(pricingPovStore, null, 2)}\n`);
  fs.writeFileSync(benchmarkOutputPath, `${JSON.stringify(benchmarkRepository, null, 2)}\n`);

  const readableBenchmarkStore = JSON.parse(fs.readFileSync(benchmarkOutputPath, "utf8"));
  const readablePovStore = JSON.parse(fs.readFileSync(povOutputPath, "utf8"));
  const pricingEngineCanReadStores =
    readableBenchmarkStore.benchmarkFileCount > 0 &&
    readableBenchmarkStore.datasets.length > 0 &&
    readablePovStore.guidanceCount > 0;

  console.log(
    "[internal-import] Import complete:",
    JSON.stringify(
      {
        benchmarkFileCount: benchmarkRepository.benchmarkFileCount,
        povGuidanceCount: pricingPovStore.guidanceCount,
        povSupportedFileCount: pricingPovStore.supportedFileCount,
        benchmarkDatasets: benchmarkRepository.datasets.length,
        pricingEngineCanReadStores,
      },
      null,
      2
    )
  );
};

main();
