// Example Dataset Mode (Phase 4C) — pure, presentation-only.
//
// Teaches users what kind of data belongs in the dataset WITHOUT ever inserting
// anything into their real dataset. Nothing here is stored in dataset.rows,
// serialized, autosaved, sent to the backend, or fed to compatibility/preview —
// the example exists only in the render layer.
//
// No side effects, no randomness, no persistence. Given the same columns it
// always produces the same example, and example row ids are stable strings that
// can never collide with real uuid row ids.

import { DataTypes } from "../../../utils/data/config.js";

// Sample value pools per declared data type. Numerical values are numbers so
// they render like real numeric cells.
const SAMPLE_VALUES = {
  [DataTypes.categorical.value]: [
    "Male",
    "Female",
    "Teacher",
    "Student",
    "Mathematics",
    "Physics",
    "English",
  ],
  [DataTypes.numerical.value]: [12, 34, 82, 4.5, 78],
  [DataTypes.catOrdered.value]: ["Low", "Medium", "High", "Very High"],
  // Reserved for future declared types (not yet selectable in Step 1):
  Boolean: ["Yes", "No"],
  Date: ["2026-01-01", "2026-02-01", "2026-03-01"],
};

const GENERIC_VALUES = ["Example 1", "Example 2", "Example 3", "Example 4"];

// How many illustrative rows the example shows. Deliberately not the
// auto-seed count so the example reads as distinct from a real table.
export const EXAMPLE_ROW_COUNT = 4;

// Mirrors the row-seeding default in the orchestrator
// (indicator-specification-card.jsx): when columns exist but no rows do, it
// seeds this many placeholder rows. Example Mode treats that pristine
// auto-seeded state as "empty / no real data yet".
export const AUTO_SEED_ROW_COUNT = 3;

// Pick the right sample pool for a column from its precise declared type,
// falling back to the coarse type ("number"/"string") and finally to generic
// placeholders for unknown types.
const getSamplePool = (col) => {
  const preciseValue = col?.dataType?.value;
  if (preciseValue && SAMPLE_VALUES[preciseValue]) {
    return SAMPLE_VALUES[preciseValue];
  }
  if (col?.type === "number") return SAMPLE_VALUES[DataTypes.numerical.value];
  if (col?.type === "string") return SAMPLE_VALUES[DataTypes.categorical.value];
  return GENERIC_VALUES;
};

/**
 * Build a read-only example dataset for the given columns. Pure: same input →
 * same output, no side effects. Never written to state.
 * @param {Array} columns - dataset.columns (each has `field`, `type`, `dataType`)
 * @param {number} rowCount
 * @returns {Array<Object>} example rows keyed by column field, with stable ids
 */
export const generateExampleDataset = (columns = [], rowCount = EXAMPLE_ROW_COUNT) => {
  if (!columns.length) return [];
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = { id: `example-row-${rowIndex}` };
    columns.forEach((col, colIndex) => {
      const pool = getSamplePool(col);
      // Offset by column so columns don't all show the same first value.
      row[col.field] = pool[(rowIndex + colIndex) % pool.length];
    });
    return row;
  });
};

// A cell still holds its auto-generated default when it equals the seed value
// the orchestrator / Insert Rows produce: "<header> <n>" for string columns,
// 0 for numeric columns.
const isDefaultCell = (row, col, index) => {
  const expected =
    col.type === "string" ? `${col.headerName} ${index + 1}` : 0;
  return row[col.field] === expected;
};

/**
 * Whether to show Example Mode instead of the real table. True only for a
 * pristine, auto-seeded NEW dataset — never for an existing (saved) ISC, never
 * once the user creates real data (insert rows changes the count, editing a
 * cell breaks the all-default check, CSV sets file.name).
 *
 * Read-only predicate over existing state; it changes no behavior.
 */
export const isExampleDatasetActive = ({ dataset, isExistingIsc } = {}) => {
  const { rows = [], columns = [], file } = dataset || {};
  if (isExistingIsc) return false; // editing an existing ISC never shows example
  if (columns.length === 0) return false; // nothing to illustrate
  if (file?.name) return false; // a CSV was uploaded → real data
  if (rows.length !== AUTO_SEED_ROW_COUNT) return false; // user added/removed rows
  // Every cell must still be an untouched auto-seed default.
  return rows.every((row, i) =>
    columns.every((col) => isDefaultCell(row, col, i))
  );
};
