export type MappingConfidence = "high" | "medium" | "low";

export type NormalizedClientField =
  | "normalizedSku"
  | "normalizedProductId"
  | "normalizedProductName"
  | "normalizedBrand"
  | "normalizedCategory"
  | "normalizedPrice"
  | "normalizedUnitPrice"
  | "normalizedPackSize"
  | "normalizedUpc"
  | "normalizedRegion"
  | "normalizedStore"
  | "normalizedKviFlag";

export type ClientUploadFilePayload = {
  name?: string | null;
  type?: string | null;
  rows?: unknown;
};

export type ClientUploadMappingProposal = {
  sourceColumn: string;
  normalizedField: NormalizedClientField | null;
  confidence: MappingConfidence;
  reason: string;
  applied: boolean;
};

export type NormalizedClientPricingRow = {
  normalizedSku: string | null;
  normalizedProductId: string | null;
  normalizedProductName: string | null;
  normalizedBrand: string | null;
  normalizedCategory: string | null;
  normalizedPrice: number | null;
  normalizedUnitPrice: number | null;
  normalizedPackSize: number | null;
  normalizedUpc: string | null;
  normalizedRegion: string | null;
  normalizedStore: string | null;
  normalizedKviFlag: boolean | null;
  rawSourceFile: string | null;
  rawFieldMap: Partial<Record<NormalizedClientField, string>>;
  rawSourceValues: Record<string, unknown>;
};

export type ClientUploadNormalizationDiagnostics = {
  uploadedFileCount: number;
  rawRowCount: number;
  normalizedRowCount: number;
  detectedColumns: Record<string, string[]>;
  proposedMappings: ClientUploadMappingProposal[];
  mappingConfidenceSummary: Record<MappingConfidence | "unmapped", number>;
  sampleNormalizedRow: NormalizedClientPricingRow | null;
  unmappedColumnCount: number;
  unmappedColumns: string[];
  validationError: string | null;
};

export type ClientUploadNormalizationResult = {
  rows: NormalizedClientPricingRow[];
  diagnostics: ClientUploadNormalizationDiagnostics;
};

const normalizedFieldSynonyms: Record<
  NormalizedClientField,
  { high: string[]; medium: string[] }
> = {
  normalizedSku: {
    high: ["sku", "client sku", "product sku", "item sku"],
    medium: ["item id", "item number", "product id", "product_id", "article"],
  },
  normalizedProductId: {
    high: ["product id", "product_id", "item id", "item_id", "client item id"],
    medium: ["sku", "item number", "article", "product number"],
  },
  normalizedProductName: {
    high: ["item name", "product name", "description", "product description"],
    medium: ["item", "product", "name", "title", "long description"],
  },
  normalizedBrand: {
    high: ["brand", "manufacturer"],
    medium: ["vendor brand", "product brand", "label"],
  },
  normalizedCategory: {
    high: ["category", "department", "aisle"],
    medium: ["class", "subcategory", "sub category", "breadcrumb", "taxonomy"],
  },
  normalizedPrice: {
    high: ["price", "retail price", "retail_price", "client price", "current price"],
    medium: ["regular price", "sales price", "shelf price", "base price"],
  },
  normalizedUnitPrice: {
    high: ["unit price", "unit_price", "price per unit", "ppu"],
    medium: ["price per oz", "price per ounce", "price per lb", "unit retail"],
  },
  normalizedPackSize: {
    high: ["pack size", "pack_size", "size", "container size", "container_size"],
    medium: ["ounces", "oz", "weight", "unit size", "count", "ct"],
  },
  normalizedUpc: {
    high: ["upc", "barcode", "gtin", "ean"],
    medium: ["universal product code", "consumer upc", "case upc"],
  },
  normalizedRegion: {
    high: ["region", "zone", "market"],
    medium: ["area", "division", "territory", "store region"],
  },
  normalizedStore: {
    high: ["store", "location", "store id", "store number"],
    medium: ["banner location", "site", "outlet"],
  },
  normalizedKviFlag: {
    high: ["kvi", "kvi flag", "key value item", "known value item"],
    medium: ["is kvi", "price sensitive item", "traffic driver"],
  },
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asRows = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value.map(toRecord);
  const record = toRecord(value);
  for (const key of ["rows", "items", "products", "pricingRows", "clientPricingRows"]) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).map(toRecord);
  }
  return [];
};

const normalizeColumnName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const toBooleanFlag = (value: unknown): boolean | null => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "y", "1", "kvi", "key value item"].includes(normalized)) return true;
  if (["false", "no", "n", "0"].includes(normalized)) return false;
  return null;
};

const inferColumnMapping = (sourceColumn: string): ClientUploadMappingProposal => {
  const normalizedColumn = normalizeColumnName(sourceColumn);

  for (const [field, synonyms] of Object.entries(normalizedFieldSynonyms) as [
    NormalizedClientField,
    { high: string[]; medium: string[] },
  ][]) {
    if (synonyms.high.map(normalizeColumnName).includes(normalizedColumn)) {
      return {
        sourceColumn,
        normalizedField: field,
        confidence: "high",
        reason: "common field synonym",
        applied: true,
      };
    }
  }

  for (const [field, synonyms] of Object.entries(normalizedFieldSynonyms) as [
    NormalizedClientField,
    { high: string[]; medium: string[] },
  ][]) {
    if (synonyms.medium.map(normalizeColumnName).includes(normalizedColumn)) {
      return {
        sourceColumn,
        normalizedField: field,
        confidence: "medium",
        reason: "possible field synonym; stored for review",
        applied: false,
      };
    }
  }

  return {
    sourceColumn,
    normalizedField: null,
    confidence: "low",
    reason: "no supported synonym matched",
    applied: false,
  };
};

const dedupeAppliedMappings = (proposals: ClientUploadMappingProposal[]) => {
  const appliedFields = new Set<NormalizedClientField>();
  return proposals.map((proposal) => {
    if (!proposal.applied || !proposal.normalizedField) return proposal;
    if (appliedFields.has(proposal.normalizedField)) {
      return {
        ...proposal,
        confidence: "medium" as const,
        reason: "duplicate candidate for normalized field; stored for review",
        applied: false,
      };
    }
    appliedFields.add(proposal.normalizedField);
    return proposal;
  });
};

const normalizeRow = (
  row: Record<string, unknown>,
  sourceFile: string | null,
  appliedMappings: ClientUploadMappingProposal[]
): NormalizedClientPricingRow => {
  const rawFieldMap = appliedMappings.reduce<Partial<Record<NormalizedClientField, string>>>(
    (mapping, proposal) => {
      if (proposal.applied && proposal.normalizedField) {
        mapping[proposal.normalizedField] = proposal.sourceColumn;
      }
      return mapping;
    },
    {}
  );
  const valueFor = (field: NormalizedClientField) => {
    const sourceColumn = rawFieldMap[field];
    return sourceColumn ? row[sourceColumn] : null;
  };

  return {
    normalizedSku: toStringValue(valueFor("normalizedSku")),
    normalizedProductId: toStringValue(valueFor("normalizedProductId")),
    normalizedProductName: toStringValue(valueFor("normalizedProductName")),
    normalizedBrand: toStringValue(valueFor("normalizedBrand")),
    normalizedCategory: toStringValue(valueFor("normalizedCategory")),
    normalizedPrice: toNumber(valueFor("normalizedPrice")),
    normalizedUnitPrice: toNumber(valueFor("normalizedUnitPrice")),
    normalizedPackSize: toNumber(valueFor("normalizedPackSize")),
    normalizedUpc: toStringValue(valueFor("normalizedUpc")),
    normalizedRegion: toStringValue(valueFor("normalizedRegion")),
    normalizedStore: toStringValue(valueFor("normalizedStore")),
    normalizedKviFlag: toBooleanFlag(valueFor("normalizedKviFlag")),
    rawSourceFile: sourceFile,
    rawFieldMap,
    rawSourceValues: row,
  };
};

export const normalizeClientUploads = (
  uploadFiles: ClientUploadFilePayload[],
  fallbackRows: unknown[] = []
): ClientUploadNormalizationResult => {
  const files = uploadFiles.length > 0 ? uploadFiles : [{ name: null, rows: fallbackRows }];
  const detectedColumns: Record<string, string[]> = {};
  const allRowsWithSource = files.flatMap((file) => {
    const rows = asRows(file.rows);
    const sourceFile = file.name || "client-upload";
    detectedColumns[sourceFile] = Array.from(
      new Set(rows.flatMap((row) => Object.keys(row)))
    );
    return rows.map((row) => ({ row, sourceFile }));
  });
  const allColumns = Array.from(
    new Set(allRowsWithSource.flatMap(({ row }) => Object.keys(row)))
  );
  const proposedMappings = dedupeAppliedMappings(allColumns.map(inferColumnMapping));
  const appliedMappings = proposedMappings.filter((proposal) => proposal.applied);
  const rows = allRowsWithSource
    .map(({ row, sourceFile }) => normalizeRow(row, sourceFile, appliedMappings))
    .filter(
      (row) =>
        row.normalizedPrice !== null &&
        (row.normalizedUpc ||
          row.normalizedSku ||
          row.normalizedProductId ||
          row.normalizedProductName)
    );
  const unmappedColumns = proposedMappings
    .filter((proposal) => !proposal.applied)
    .map((proposal) => proposal.sourceColumn);
  const mappingConfidenceSummary = proposedMappings.reduce<
    Record<MappingConfidence | "unmapped", number>
  >(
    (summary, proposal) => {
      summary[proposal.confidence] += 1;
      if (!proposal.applied) summary.unmapped += 1;
      return summary;
    },
    { high: 0, medium: 0, low: 0, unmapped: 0 }
  );
  const hasRequiredMapping = appliedMappings.some(
    (proposal) => proposal.normalizedField === "normalizedPrice"
  ) && appliedMappings.some((proposal) =>
    [
      "normalizedUpc",
      "normalizedSku",
      "normalizedProductId",
      "normalizedProductName",
    ].includes(proposal.normalizedField || "")
  );
  const validationError =
    allRowsWithSource.length === 0
      ? "No tabular client rows were available for normalization."
      : !hasRequiredMapping
        ? "Client upload is missing high-confidence mappings for price plus UPC, SKU, product id, or product name."
        : rows.length === 0
          ? "Client upload columns mapped, but no rows contained explicit price and product identifiers."
          : null;

  return {
    rows,
    diagnostics: {
      uploadedFileCount: uploadFiles.length,
      rawRowCount: allRowsWithSource.length,
      normalizedRowCount: rows.length,
      detectedColumns,
      proposedMappings,
      mappingConfidenceSummary,
      sampleNormalizedRow: rows[0] || null,
      unmappedColumnCount: unmappedColumns.length,
      unmappedColumns,
      validationError,
    },
  };
};
