import { useMemo } from "react";
import PropTypes from "prop-types";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { DataGrid } from "@mui/x-data-grid";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { generateExampleDataset } from "../../utils/example-dataset.js";

// Example Dataset Mode table (Phase 4C). Read-only and purely illustrative — it
// renders generated sample rows so the user can see what good data looks like.
// It never touches dataset.rows, setDataset, or any persistence. The
// surrounding onboarding card (ExampleDatasetOnboarding) carries the
// explanation + the "how do I start" CTAs; this component is just the labelled
// preview.
const ExampleDatasetTable = ({ columns }) => {
  const rows = useMemo(() => generateExampleDataset(columns), [columns]);

  // Same columns as the real table (so it looks familiar) but never editable
  // and with no interactive header behavior.
  const exampleColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        editable: false,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
      })),
    [columns]
  );

  return (
    <Box
      component="section"
      aria-label="Example dataset (illustrative, read-only)"
    >
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip
          size="small"
          color="info"
          variant="outlined"
          icon={<ScienceOutlinedIcon />}
          label="Example"
        />
        <Typography variant="caption" color="text.secondary">
          Illustrative values — read-only and never saved.
        </Typography>
      </Stack>

      <Box
        sx={(t) => ({
          p: 1,
          borderRadius: `${t.custom.radii.card}px`,
          border: `1px dashed ${alpha(t.palette.info.main, 0.5)}`,
          backgroundColor: alpha(t.palette.info.main, 0.04),
        })}
      >
        <DataGrid
          aria-label="Example dataset, illustrative only and not part of your data"
          columns={exampleColumns}
          rows={rows}
          autoHeight
          hideFooter
          disableColumnMenu
          disableColumnFilter
          disableColumnSelector
          disableRowSelectionOnClick
          rowHeight={40}
          columnHeaderHeight={56}
          // Read-only: no edit/selection handlers are attached.
          sx={{
            opacity: 0.85,
            backgroundColor: "transparent",
            "& .MuiDataGrid-cell": { cursor: "default" },
            "& .MuiDataGrid-columnHeaders": { cursor: "default" },
          }}
        />
      </Box>
    </Box>
  );
};

ExampleDatasetTable.propTypes = {
  columns: PropTypes.array.isRequired,
};

export default ExampleDatasetTable;
