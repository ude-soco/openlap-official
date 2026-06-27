// Generated (prototype) dataset (Phase 4D).
//
// IMPORTANT — two distinct concepts live in this folder:
//   1. EXAMPLE FORMAT preview  (example-dataset.js)  — read-only, never saved,
//      illustrative only.
//   2. GENERATED dataset       (this file)           — user-triggered, becomes
//      REAL editable rows in dataset.rows, saved/autosaved like any other data.
//
// This module only BUILDS rows (pure functions). The act of putting them into
// state is done by the caller, in response to an explicit "Generate dataset"
// click — nothing here is inserted silently.
//
// The generator is deterministic (no randomness, no AI/LLM): same columns →
// same rows, so behavior is predictable and easy to review.

import { v4 as uuidv4 } from "uuid";
import { DataTypes } from "../../../utils/data/config.js";

// Default number of generated rows. Six gives a believable table without being
// noisy, and every value pool below has at least six entries.
export const DEFAULT_GENERATED_ROW_COUNT = 6;

// ---------------------------------------------------------------------------
// Semantic value pools — matched against the column NAME (keyword matching).
// Ordered most-specific first; the first matching entry wins. Prefer
// educational / learning-analytics terms over generic ones. Keep this mapping
// centralized and documented.
// ---------------------------------------------------------------------------
const SEMANTIC_POOLS = [
  { keywords: ["gender", "sex"], values: ["Male", "Female", "Diverse", "Female", "Male", "Diverse"] },
  { keywords: ["age"], values: [18, 22, 27, 31, 36, 42] },
  { keywords: ["score", "grade", "points", "mark"], values: [62, 74, 81, 88, 93, 67] },
  { keywords: ["attendance"], values: [60, 72, 85, 91, 96, 78] },
  { keywords: ["course", "subject", "module"], values: ["Mathematics", "Physics", "Biology", "English", "Computer Science", "History"] },
  { keywords: ["department", "faculty"], values: ["Medicine", "Computer Science", "Psychology", "Education", "Engineering", "Business"] },
  { keywords: ["country"], values: ["Germany", "France", "Italy", "Spain", "Netherlands", "Sweden"] },
  { keywords: ["semester"], values: [1, 2, 3, 4, 5, 6] },
  { keywords: ["satisfaction", "rating", "level"], values: ["Low", "Medium", "High", "Very High", "Medium", "High"] },
  { keywords: ["status"], values: ["Completed", "In progress", "Not started", "Completed", "In progress", "Completed"] },
  { keywords: ["time", "duration"], values: [15, 30, 45, 60, 90, 120] },
  { keywords: ["attempt", "tries"], values: [1, 2, 1, 3, 2, 1] },
  { keywords: ["teacher", "instructor"], values: ["Dr. Smith", "Prof. Miller", "Dr. Ahmed", "Dr. Chen", "Prof. Brown", "Dr. Weber"] },
  { keywords: ["student", "learner", "participant"], values: ["Student 1", "Student 2", "Student 3", "Student 4", "Student 5", "Student 6"] },
];

// ---------------------------------------------------------------------------
// Type fallback pools — used when no semantic keyword matches.
// ---------------------------------------------------------------------------
const TYPE_POOLS = {
  [DataTypes.categorical.value]: ["Group A", "Group B", "Group C", "Group D"],
  [DataTypes.numerical.value]: [12, 34, 56, 78, 45, 67],
  [DataTypes.catOrdered.value]: ["Low", "Medium", "High", "Very High", "Medium", "Low"],
  // Reserved for future declared types (not yet selectable in Step 1):
  Boolean: ["Yes", "No", "Yes", "No"],
  Date: ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22"],
};

const GENERIC_POOL = ["Group A", "Group B", "Group C", "Group D"];

const matchSemanticPool = (name = "") => {
  const lower = name.toLowerCase();
  return SEMANTIC_POOLS.find((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  );
};

const getTypePool = (col) => {
  const preciseValue = col?.dataType?.value;
  if (preciseValue && TYPE_POOLS[preciseValue]) return TYPE_POOLS[preciseValue];
  if (col?.type === "number") return TYPE_POOLS[DataTypes.numerical.value];
  if (col?.type === "string") return TYPE_POOLS[DataTypes.categorical.value];
  return GENERIC_POOL;
};

/**
 * Pick the value pool for a column: prefer a semantic (name keyword) match,
 * fall back to the column's declared type, then to a generic pool.
 */
const getPoolForColumn = (col) => {
  const semantic = matchSemanticPool(col?.headerName);
  if (semantic) return semantic.values;
  return getTypePool(col);
};

/**
 * Deterministic example values for a single column, cycling its pool to fill
 * `rowCount` cells. Pure.
 * @returns {Array<string|number>}
 */
export const getExampleValuesForColumn = (column, rowCount = DEFAULT_GENERATED_ROW_COUNT) => {
  const pool = getPoolForColumn(column);
  return Array.from({ length: rowCount }, (_, i) => pool[i % pool.length]);
};

/**
 * Build REAL editable prototype rows for the given columns. Pure: same input →
 * same output (only the row `id`s are unique). The caller writes these to
 * dataset.rows on an explicit user action.
 * @param {Array} columns - dataset.columns (each has `field`, `type`, `dataType`, `headerName`)
 * @param {{ rowCount?: number }} [options]
 * @returns {Array<Object>} rows keyed by column field
 */
export const generatePrototypeRows = (columns = [], options = {}) => {
  if (!columns.length) return [];
  const rowCount = options.rowCount ?? DEFAULT_GENERATED_ROW_COUNT;

  const columnValues = columns.map((col) => ({
    field: col.field,
    values: getExampleValuesForColumn(col, rowCount),
  }));

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = { id: uuidv4() };
    columnValues.forEach(({ field, values }) => {
      row[field] = values[rowIndex];
    });
    return row;
  });
};
