import { useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ExampleDatasetTable from "./example-dataset-table.jsx";
import ImportDialog from "../../components/import-dialog.jsx";

// Example Dataset onboarding (Phase 4C.5).
//
// Frames the empty dataset as an intentional choice between two starting
// points, with the example shown below purely as a format illustration. The
// wording makes clear the user is starting THEIR OWN dataset — not editing the
// example.
//
// CTAs reuse existing flows: "Upload CSV" opens the same ImportDialog the
// toolbar uses; "Start with an empty table" calls the parent-provided
// onStartEmpty (which opens the real editable grid with empty rows — no
// "how many rows?" dialog as the first interaction). Nothing here writes
// example data to state; the example stays presentation-only.
const ExampleDatasetOnboarding = ({ columns, onStartEmpty }) => {
  const [csvOpen, setCsvOpen] = useState(false);
  const toggleCsv = () => setCsvOpen((o) => !o);

  return (
    <Box component="section" aria-label="Get started with your dataset">
      <Paper
        variant="outlined"
        sx={(t) => ({
          p: { xs: 2, md: 3 },
          mb: 2,
          borderRadius: `${t.custom.radii.card}px`,
        })}
      >
        <Stack gap={1.5}>
          <Typography variant="h6" component="h3">
            Your dataset is empty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose how you&apos;d like to begin. You&apos;re starting your own
            dataset — the table below is only an example of the expected format,
            not something you edit.
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1.5}
            sx={{ pt: 0.5 }}
          >
            <Button
              variant="contained"
              startIcon={<UploadRoundedIcon />}
              onClick={toggleCsv}
            >
              Upload CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<TableChartOutlinedIcon />}
              onClick={onStartEmpty}
            >
              Start with an empty table
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Typography variant="subtitle2" component="h4" gutterBottom>
        Example of the expected data format
      </Typography>
      <ExampleDatasetTable columns={columns} />

      {/* CSV flow reused verbatim — same component the toolbar opens. */}
      <ImportDialog open={csvOpen} toggleOpen={toggleCsv} />
    </Box>
  );
};

ExampleDatasetOnboarding.propTypes = {
  columns: PropTypes.array.isRequired,
  onStartEmpty: PropTypes.func.isRequired,
};

export default ExampleDatasetOnboarding;
