import { v4 as uuidv4 } from "uuid";

// Shared factory for newly-created dataset rows (Phase 4C.5).
//
// New rows are created VISUALLY EMPTY — no pre-filled zeros or "<Column> N"
// placeholders. Zero is a real value, so it should never be a default; an empty
// cell communicates "enter your data here". The row shape is unchanged (an `id`
// plus one key per column field), so dataset persistence, serialization, and
// chart compatibility are all unaffected — only the default cell content
// changed from placeholders to "".
export const createBlankRows = (columns = [], count = 1) =>
  Array.from({ length: Math.max(0, count) }, () => {
    const row = { id: uuidv4() };
    columns.forEach((col) => {
      row[col.field] = "";
    });
    return row;
  });

// How many empty rows "Start with an empty table" opens with — enough to feel
// like a table that's ready to type into, without implying the data is filled.
export const INITIAL_MANUAL_ROWS = 3;
