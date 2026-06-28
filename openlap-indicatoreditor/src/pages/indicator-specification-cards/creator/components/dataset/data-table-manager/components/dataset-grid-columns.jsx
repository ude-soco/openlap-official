import { Stack, Tooltip, Typography } from "@mui/material";
import { getCellStatus } from "../../utils/dataset-validation.js";

// Presentation decorators for the Dataset Builder grid (Phase 4E/4F).
//
// These only override how columns RENDER (header + cell states) for the live
// grid. They do not touch the stored dataset.columns, the edit flow, or any
// values — purely display. Cell states reuse the shared validation helper
// (getCellStatus) so the table and the requirements rail always agree. JSX is
// inlined (no exported sub-components) so the module's only export stays a
// plain helper.

/**
 * Decorate dataset columns with a styled header (name + subtle type label) and
 * cell states: a calm "Enter value…" placeholder for empty cells and a clear-
 * but-calm invalid state (no aggressive red fill) for invalid values. Returns
 * NEW column objects; the inputs are untouched.
 */
export const decorateColumns = (columns = []) =>
  columns.map((col) => {
    const typeLabel = col.dataType?.value ?? col.type;
    return {
      ...col,
      renderHeader: () => (
        <Stack sx={{ lineHeight: 1.25, py: 0.5 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {col.headerName}
          </Typography>
          {typeLabel && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {typeLabel}
            </Typography>
          )}
        </Stack>
      ),
      renderCell: (params) => {
        const status = getCellStatus(col, params.value);
        if (status === "empty") {
          return (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ fontStyle: "italic" }}
              aria-hidden
            >
              Enter value…
            </Typography>
          );
        }
        if (status === "invalid") {
          return (
            <Tooltip title="Expected a number">
              <Typography
                component="span"
                variant="body2"
                color="error"
                sx={{
                  borderBottom: "1px dashed",
                  borderColor: "error.main",
                }}
              >
                {params.value}
              </Typography>
            </Tooltip>
          );
        }
        return <span>{params.value}</span>;
      },
    };
  });
