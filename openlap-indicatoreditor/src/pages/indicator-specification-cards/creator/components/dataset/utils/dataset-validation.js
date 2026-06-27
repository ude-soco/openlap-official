// Dataset validation & data quality (Phase 4F).
//
// Pure functions over the dataset. They answer "is this dataset actually
// usable?" — not just "do rows/columns exist?". Reused by the table cell
// decorator, the requirements rail, and the Next button so the three can never
// disagree. No side effects, no coercion of user values.
//
// Rules:
//   • Empty cell ("", null, undefined) → "empty" (incomplete, not an error).
//   • Numerical column: value must parse to a finite number. 0 IS valid;
//     non-numeric text is "invalid".
//   • Categorical / Categorical (ordinal): any non-empty value is valid.
//   • A row is "meaningful" when it has at least one non-empty cell.
//   • Ready (the gate for status + Next) = columns exist, ≥1 meaningful row,
//     and no invalid cells. Empty cells are advisory and do NOT block Ready,
//     per the Step 4F spec.

import { DataTypes } from "../../../utils/data/config.js";

export const isNumericColumn = (col) =>
  col?.dataType?.value === DataTypes.numerical.value || col?.type === "number";

export const isEmptyCell = (value) =>
  value === "" || value === null || value === undefined;

// True when `value` represents a finite number. 0 / "0" / "4.5" are valid;
// "" and non-numeric text are not. (Empty is handled separately as "empty".)
export const isValidNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return false;
    return Number.isFinite(Number(trimmed));
  }
  return false;
};

/** Per-cell status: "empty" | "invalid" | "valid". */
export const getCellStatus = (col, value) => {
  if (isEmptyCell(value)) return "empty";
  if (isNumericColumn(col) && !isValidNumber(value)) return "invalid";
  return "valid";
};

/**
 * Validate the whole dataset.
 * @returns {{
 *   hasColumns: boolean,
 *   rowCount: number,
 *   columnCount: number,
 *   meaningfulRowCount: number,
 *   emptyCellCount: number,
 *   invalidCellCount: number,
 *   cellStatus: Object<string, Object<string, string>>,
 *   ready: boolean,
 * }}
 */
export const validateDataset = (dataset) => {
  const columns = dataset?.columns ?? [];
  const rows = dataset?.rows ?? [];
  const hasColumns = columns.length > 0;

  let emptyCellCount = 0;
  let invalidCellCount = 0;
  let meaningfulRowCount = 0;
  const cellStatus = {};

  rows.forEach((row) => {
    let hasValue = false;
    const rowStatus = {};
    columns.forEach((col) => {
      const status = getCellStatus(col, row[col.field]);
      rowStatus[col.field] = status;
      if (status === "empty") {
        emptyCellCount += 1;
      } else {
        hasValue = true;
        if (status === "invalid") invalidCellCount += 1;
      }
    });
    cellStatus[row.id] = rowStatus;
    if (hasValue) meaningfulRowCount += 1;
  });

  const ready = hasColumns && meaningfulRowCount >= 1 && invalidCellCount === 0;

  return {
    hasColumns,
    rowCount: rows.length,
    columnCount: columns.length,
    meaningfulRowCount,
    emptyCellCount,
    invalidCellCount,
    cellStatus,
    ready,
  };
};
