import { useContext } from "react";
import PropTypes from "prop-types";
import { Box, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { ISCContext } from "../../../../isc-context.js";
import { validateDataset } from "../../../dataset/utils/dataset-validation.js";
import { getChartCompatibility } from "../../../visualization/utils/chart-compatibility.js";

// Step 5A review frame (read-only).
//
// Restates the indicator (goal / question / name / path / visualization / data
// size) and shows calm confidence checks, so Step 5 reads as "Finalize your
// indicator" rather than "configure a chart". Pure consumer of existing state +
// existing helpers (validateDataset, getChartCompatibility) — it mutates
// nothing and changes no behavior.

const SummaryItem = ({ label, value, muted }) => (
  <Stack gap={0.25}>
    <Typography variant="overline" color="text.secondary" component="h4">
      {label}
    </Typography>
    <Typography
      variant="body2"
      color={muted ? "text.secondary" : "text.primary"}
      sx={{ fontWeight: muted ? 400 : 500 }}
    >
      {value}
    </Typography>
  </Stack>
);
SummaryItem.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  muted: PropTypes.bool,
};

const CheckRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon fontSize="small" color="success" sx={{ mt: "1px" }} />
    ) : (
      <ReportProblemOutlinedIcon
        fontSize="small"
        color="warning"
        sx={{ mt: "1px" }}
      />
    )}
    <Typography variant="body2">{children}</Typography>
  </Stack>
);
CheckRow.propTypes = {
  ok: PropTypes.bool,
  children: PropTypes.node,
};

const FinalizeReview = () => {
  const { requirements, dataset, visRef } = useContext(ISCContext);

  const goal = requirements?.goal || "—";
  const question = requirements?.question || "—";
  const indicatorName = requirements?.indicatorName || "Untitled indicator";
  const selectedPath = requirements?.selectedPath || "—";
  const chartType = visRef?.chart?.type || "Not selected";

  const columnCount = dataset?.columns?.length ?? 0;
  const rowCount = dataset?.rows?.length ?? 0;

  // Reused helpers (no logic duplicated).
  const validation = validateDataset(dataset);
  const hasChart = Boolean(visRef?.chart?.type);
  const compatibility = hasChart
    ? getChartCompatibility(visRef.chart, dataset.columns)
    : null;
  const requiredAvailable = compatibility ? compatibility.compatible : false;

  return (
    <Stack gap={2}>
      {/* Indicator summary */}
      <Paper
        variant="outlined"
        component="section"
        aria-label="Indicator summary"
        sx={(t) => ({ p: 2, borderRadius: `${t.custom.radii.card}px` })}
      >
        <Typography variant="subtitle1" component="h3" fontWeight={600} gutterBottom>
          Indicator summary
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem label="Indicator name" value={indicatorName} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem label="Visualization" value={chartType} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem label="Goal" value={goal} muted />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem label="Question" value={question} muted />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem label="Starting point" value={selectedPath} muted />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <SummaryItem
              label="Dataset"
              value={`${rowCount} row${rowCount === 1 ? "" : "s"} × ${columnCount} column${
                columnCount === 1 ? "" : "s"
              }`}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Confidence checks */}
      <Paper
        variant="outlined"
        component="section"
        aria-label="Readiness checks"
        sx={(t) => ({ p: 2, borderRadius: `${t.custom.radii.card}px` })}
      >
        <Typography variant="subtitle1" component="h3" fontWeight={600} gutterBottom>
          Before you save
        </Typography>
        <Stack gap={0.75}>
          <CheckRow ok={hasChart}>
            {hasChart
              ? "Visualization selected."
              : "Select a visualization below."}
          </CheckRow>
          <CheckRow ok={validation.ready}>
            {validation.ready
              ? `Dataset ready — ${validation.meaningfulRowCount} row${
                  validation.meaningfulRowCount === 1 ? "" : "s"
                } of data.`
              : "Dataset needs at least one complete, valid row."}
          </CheckRow>
          {hasChart && (
            <CheckRow ok={requiredAvailable}>
              {requiredAvailable
                ? "Required columns available for this visualization."
                : "This visualization needs more columns."}
            </CheckRow>
          )}
          <CheckRow ok={validation.invalidCellCount === 0}>
            {validation.invalidCellCount === 0
              ? "All cell values are valid."
              : `${validation.invalidCellCount} invalid value${
                  validation.invalidCellCount === 1 ? "" : "s"
                } to fix.`}
          </CheckRow>
        </Stack>
      </Paper>

      <Box>
        <Divider />
      </Box>
    </Stack>
  );
};

export default FinalizeReview;
