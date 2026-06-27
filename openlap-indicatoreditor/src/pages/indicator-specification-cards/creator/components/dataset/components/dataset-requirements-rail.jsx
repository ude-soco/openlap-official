import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { ISCContext } from "../../../isc-context.js";
import {
  getChartCompatibility,
  getMissingSummary,
} from "../../visualization/utils/chart-compatibility.js";
import { isExampleDatasetActive } from "../utils/example-dataset.js";

// Step 4 dataset guidance rail (Phase 4B).
//
// READ-ONLY. Reuses the Step 3 compatibility helper (getChartCompatibility /
// getMissingSummary) so this panel can never diverge from Step 3. From visRef +
// dataset it derives a single dataset status, compact progress metrics, a
// requirements checklist, the user's columns grouped by type, and one
// "next best action". It mutates nothing and changes no behavior.

// One tinted, calm card per tone — green only for "ready".
const tonedCardSx = (tone) => (theme) => ({
  p: 1.5,
  borderRadius: `${theme.custom.radii.card}px`,
  border: `1px solid ${
    tone === "success"
      ? alpha(theme.palette.success.main, 0.3)
      : tone === "warning"
        ? alpha(theme.palette.warning.main, 0.3)
        : theme.palette.divider
  }`,
  backgroundColor:
    tone === "success"
      ? alpha(theme.palette.success.main, 0.08)
      : tone === "warning"
        ? alpha(theme.palette.warning.main, 0.08)
        : alpha(theme.palette.text.primary, 0.03),
});

const MetricRow = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600}>
      {value}
    </Typography>
  </Stack>
);
MetricRow.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
};

const SectionHeading = ({ children }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    component="h4"
    sx={{ display: "block", lineHeight: 1.6 }}
  >
    {children}
  </Typography>
);
SectionHeading.propTypes = {
  children: PropTypes.node,
};

const DatasetRequirementsRail = () => {
  const { dataset, visRef, id } = useContext(ISCContext);
  const [showWhy, setShowWhy] = useState(false);

  const chart = visRef.chart;
  const task = visRef.filter.type;
  const columns = dataset.columns;
  const rows = dataset.rows;

  // While Example Mode is active the rows on screen are illustrative, not the
  // user's data — so the status must not count them as real rows (the example
  // can never mark the dataset complete). Compatibility already depends on
  // columns only, so it is unaffected either way.
  const exampleActive = isExampleDatasetActive({
    dataset,
    isExistingIsc: Boolean(id),
  });
  const realRowCount = exampleActive ? 0 : rows.length;

  const hasChart = Boolean(chart?.type);
  const hasColumns = columns.length > 0;
  const hasRows = realRowCount > 0;

  const compatibility = hasChart ? getChartCompatibility(chart, columns) : null;
  const requirements = compatibility?.requirements ?? [];
  const requiredTypes = new Set(requirements.map((r) => r.type));
  const satisfiedCount = requirements.filter((r) => r.satisfied).length;

  // ---- Single status model (drives the chip, metrics, and next action) ----
  let statusKey;
  if (!hasChart) statusKey = "no-chart";
  else if (compatibility && !compatibility.compatible) statusKey = "missing";
  else if (!hasRows) statusKey = "needs-rows";
  else statusKey = "ready";

  const statusMeta = {
    ready: {
      label: "Ready",
      color: "success",
      Icon: CheckCircleRoundedIcon,
      tone: "success",
      action: "You're ready — continue to the next step.",
    },
    "needs-rows": {
      label: "Needs rows",
      color: "default",
      Icon: TableRowsRoundedIcon,
      tone: "neutral",
      action: "Add rows manually or upload a CSV to preview real data.",
    },
    missing: {
      label: "Missing required columns",
      color: "warning",
      Icon: ReportProblemOutlinedIcon,
      tone: "warning",
      action: hasChart
        ? `Add ${getMissingSummary(chart, columns)} before continuing.`
        : "Add or update the missing column before continuing.",
    },
    "no-chart": {
      label: "No chart selected",
      color: "default",
      Icon: InsightsOutlinedIcon,
      tone: "neutral",
      action: "Choose a visualization in Step 3 first.",
    },
  }[statusKey];

  const StatusIcon = statusMeta.Icon;
  const compatibilityValue = !hasChart
    ? "No chart selected"
    : statusKey === "missing"
      ? `Missing data for ${chart.type}`
      : `Compatible with ${chart.type}`;

  // Columns grouped by their declared (precise) data type, for the checklist.
  const columnsByType = columns.reduce((acc, col) => {
    const typeValue = col?.dataType?.value ?? col?.type ?? "Other";
    (acc[typeValue] = acc[typeValue] || []).push(col);
    return acc;
  }, {});

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Dataset status and guidance"
      sx={(t) => ({
        p: 2,
        borderRadius: `${t.custom.radii.card}px`,
        position: { md: "sticky" },
        top: { md: 16 },
      })}
    >
      <Stack gap={2}>
        {/* 1. Dataset status + progress metrics */}
        <Box>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            sx={{ mb: 1 }}
          >
            <Typography variant="subtitle1" component="h3" fontWeight={600}>
              Dataset status
            </Typography>
            <Chip
              size="small"
              color={statusMeta.color}
              variant={statusMeta.color === "default" ? "outlined" : "filled"}
              icon={<StatusIcon />}
              label={statusMeta.label}
            />
          </Stack>
          <Stack gap={0.5}>
            {hasChart && requirements.length > 0 && (
              <MetricRow
                label="Required columns"
                value={`${satisfiedCount} / ${requirements.length}`}
              />
            )}
            <MetricRow label="Columns" value={columns.length} />
            <MetricRow label="Rows" value={realRowCount} />
            <MetricRow label="Compatibility" value={compatibilityValue} />
          </Stack>
          {task && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Analytical task: {task}
            </Typography>
          )}
        </Box>

        {exampleActive && (
          <Stack
            direction="row"
            gap={1}
            alignItems="flex-start"
            sx={(t) => ({
              p: 1,
              borderRadius: `${t.custom.radii.card}px`,
              backgroundColor: alpha(t.palette.info.main, 0.08),
            })}
          >
            <ScienceOutlinedIcon fontSize="small" color="info" sx={{ mt: "2px" }} />
            <Typography variant="body2">
              You are currently viewing an example dataset.
            </Typography>
          </Stack>
        )}

        <Divider />

        {/* 2. Required data — checklist */}
        <Box>
          <SectionHeading>Required data</SectionHeading>
          {hasChart ? (
            requirements.length > 0 ? (
              <Stack gap={0.75} sx={{ mt: 0.5 }}>
                {requirements.map((r) => (
                  <Stack
                    key={r.type}
                    direction="row"
                    gap={1}
                    alignItems="flex-start"
                  >
                    {r.satisfied ? (
                      <CheckCircleRoundedIcon
                        fontSize="small"
                        color="success"
                        sx={{ mt: "2px" }}
                      />
                    ) : (
                      <ReportProblemOutlinedIcon
                        fontSize="small"
                        color="warning"
                        sx={{ mt: "2px" }}
                      />
                    )}
                    <Typography variant="body2">
                      {r.required} {r.type.toLowerCase()} column
                      {r.required > 1 ? "s" : ""}
                      {!r.satisfied && (
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          {" "}
                          — you have {r.available}
                        </Typography>
                      )}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                This chart has no specific column requirements.
              </Typography>
            )
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Select a visualization in Step 3 to see the columns it needs.
            </Typography>
          )}
        </Box>

        {/* 3. Your columns — grouped by type, with contribution indicator */}
        <Box>
          <SectionHeading>Your columns ({columns.length})</SectionHeading>
          {hasColumns ? (
            <Stack gap={1} sx={{ mt: 0.5 }}>
              {Object.entries(columnsByType).map(([typeValue, cols]) => {
                const contributes = requiredTypes.has(typeValue);
                return (
                  <Box key={typeValue}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                    >
                      {typeValue}
                    </Typography>
                    <Stack gap={0.25} sx={{ mt: 0.25 }}>
                      {cols.map((col) => (
                        <Stack
                          key={col.field}
                          direction="row"
                          gap={1}
                          alignItems="center"
                        >
                          {contributes ? (
                            <CheckCircleRoundedIcon
                              fontSize="small"
                              color="success"
                            />
                          ) : (
                            <RadioButtonUncheckedRoundedIcon
                              fontSize="small"
                              color="disabled"
                            />
                          )}
                          <Typography variant="body2">
                            {col.headerName}
                          </Typography>
                          {hasChart && !contributes && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              not used by this chart
                            </Typography>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              No columns yet. Use <b>Insert Column</b> or upload a CSV.
            </Typography>
          )}
        </Box>

        {/* 4. Next best action — one clear recommendation */}
        <Box sx={tonedCardSx(statusMeta.tone)}>
          <Stack direction="row" gap={1} alignItems="flex-start">
            <ArrowForwardRoundedIcon
              fontSize="small"
              color={statusMeta.tone === "neutral" ? "action" : statusMeta.tone}
              sx={{ mt: "2px" }}
            />
            <Box>
              <Typography
                variant="overline"
                component="h4"
                color="text.secondary"
                sx={{ display: "block", lineHeight: 1.4 }}
              >
                Next best action
              </Typography>
              <Typography variant="body2">{statusMeta.action}</Typography>
            </Box>
          </Stack>
        </Box>

        {/* 5. Step 1 coupling — subtle, expandable disclosure */}
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowWhy((s) => !s)}
            aria-expanded={showWhy}
            startIcon={<HelpOutlineRoundedIcon />}
            endIcon={
              showWhy ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />
            }
            sx={{ textTransform: "none", pl: 0.5 }}
          >
            Why are these columns here?
          </Button>
          <Collapse in={showWhy} unmountOnExit>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 0.5, pt: 0.5 }}
            >
              Columns are based on the data requirements you defined in{" "}
              <b>Step 1</b>. To change names or types, edit Step 1 or use{" "}
              <b>Insert Column</b>.
            </Typography>
          </Collapse>
        </Box>
      </Stack>
    </Paper>
  );
};

export default DatasetRequirementsRail;
