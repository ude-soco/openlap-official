import { useContext } from "react";
import PropTypes from "prop-types";
import { alpha } from "@mui/material/styles";
import { Box, Divider, Grid, Paper, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { ISCContext } from "../../../../isc-context.js";
import { validateDataset } from "../../../dataset/utils/dataset-validation.js";
import { getChartCompatibility } from "../../../visualization/utils/chart-compatibility.js";

// Step 5B finalize review (read-only).
//
// A useful final review, not a metadata dump: a scannable summary grouped into
// "What this indicator measures" + "Prototype setup", and a grouped readiness
// check (Indicator definition / Dataset / Visualization) with ACTIONABLE
// warnings. Pure consumer of existing state + existing helpers (validateDataset,
// getChartCompatibility) — it mutates nothing and changes no behavior.

// One labelled field. Long values wrap and are clamped to a few lines so the
// review never becomes huge.
const Field = ({ label, value, clamp }) => (
  <Stack gap={0.25}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={
        clamp
          ? {
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              overflowWrap: "anywhere",
            }
          : { overflowWrap: "anywhere" }
      }
    >
      {value}
    </Typography>
  </Stack>
);
Field.propTypes = {
  label: PropTypes.node,
  value: PropTypes.node,
  clamp: PropTypes.bool,
};

const GroupHeading = ({ children }) => (
  <Typography variant="overline" color="text.secondary" component="h4">
    {children}
  </Typography>
);
GroupHeading.propTypes = { children: PropTypes.node };

const CheckRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon
        fontSize="small"
        color="success"
        sx={{ mt: "1px" }}
      />
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
CheckRow.propTypes = { ok: PropTypes.bool, children: PropTypes.node };

const FinalizeReview = () => {
  const { requirements, dataset, visRef } = useContext(ISCContext);

  const goal = requirements?.goal || "—";
  const question = requirements?.question || "—";
  const indicatorName = requirements?.indicatorName || "Untitled indicator";
  const selectedPath = requirements?.selectedPath || "—";
  const chartType = visRef?.chart?.type || "Not selected";

  const columnCount = dataset?.columns?.length ?? 0;
  const rowCount = dataset?.rows?.length ?? 0;

  // ---- Reused helpers (no logic duplicated) ----
  const validation = validateDataset(dataset);
  const hasChart = Boolean(visRef?.chart?.type);
  const compatibility = hasChart
    ? getChartCompatibility(visRef.chart, dataset.columns)
    : null;

  // ---- Grouped, actionable readiness checks ----
  const hasName = Boolean(requirements?.indicatorName);
  const hasGoal = Boolean(requirements?.goal);
  const hasQuestion = Boolean(requirements?.question);
  const definitionOk = hasName && hasGoal && hasQuestion;

  const groups = [
    {
      key: "definition",
      title: "Indicator definition",
      checks: [
        {
          ok: definitionOk,
          text: definitionOk
            ? "Goal, question, and name are defined."
            : "Complete the goal, question, and name in the requirements step.",
        },
      ],
    },
    {
      key: "dataset",
      title: "Dataset",
      checks: [
        {
          ok: validation.meaningfulRowCount > 0,
          text:
            validation.meaningfulRowCount > 0
              ? `Has data — ${validation.meaningfulRowCount} row${
                  validation.meaningfulRowCount === 1 ? "" : "s"
                } ready.`
              : "Add at least one row in the dataset step.",
        },
        {
          ok: validation.invalidCellCount === 0,
          text:
            validation.invalidCellCount === 0
              ? "All cell values are valid."
              : `Fix ${validation.invalidCellCount} invalid number${
                  validation.invalidCellCount === 1 ? "" : "s"
                } in the dataset step.`,
        },
      ],
    },
    {
      key: "visualization",
      title: "Visualization",
      checks: [
        {
          ok: hasChart,
          text: hasChart
            ? `Visualization selected — ${chartType}.`
            : "Choose a visualization below.",
        },
        // Only meaningful once a chart is selected.
        ...(hasChart
          ? [
              {
                ok: compatibility.compatible,
                text: compatibility.compatible
                  ? "Required columns are available for this visualization."
                  : "Add the missing required columns for this visualization.",
              },
            ]
          : []),
      ],
    },
  ];

  const allOk = groups.every((g) => g.checks.every((c) => c.ok));

  return (
    <Stack gap={2}>
      {/* Indicator summary — grouped and scannable */}
      <Paper
        variant="outlined"
        component="section"
        aria-label="Indicator summary"
        sx={(t) => ({ p: 2, borderRadius: `${t.custom.radii.card}px` })}
      >
        <Typography
          variant="subtitle1"
          component="h3"
          fontWeight={600}
          gutterBottom
        >
          Indicator summary
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack gap={1.5}>
              <GroupHeading>What this indicator measures</GroupHeading>
              <Field label="Indicator name" value={indicatorName} />
              <Field label="Goal" value={goal} clamp />
              <Field label="Question" value={question} clamp />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack gap={1.5}>
              <GroupHeading>Prototype setup</GroupHeading>
              <Field label="Starting point" value={selectedPath} />
              <Field label="Visualization" value={chartType} />
              <Field
                label="Dataset"
                value={`${rowCount} row${rowCount === 1 ? "" : "s"} × ${columnCount} column${
                  columnCount === 1 ? "" : "s"
                }`}
              />
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Readiness check — grouped, actionable, reassuring when complete */}
      <Paper
        variant="outlined"
        component="section"
        aria-label="Readiness check"
        sx={(t) => ({ p: 2, borderRadius: `${t.custom.radii.card}px` })}
      >
        <Typography
          variant="subtitle1"
          component="h3"
          fontWeight={600}
          gutterBottom
        >
          Readiness check
        </Typography>

        {allOk && (
          <Box
            sx={(t) => ({
              p: 1.5,
              mb: 2,
              borderRadius: `${t.custom.radii.card}px`,
              border: `1px solid ${alpha(t.palette.success.main, 0.3)}`,
              backgroundColor: alpha(t.palette.success.main, 0.08),
            })}
          >
            <Stack direction="row" gap={1} alignItems="center">
              <CheckCircleRoundedIcon fontSize="small" color="success" />
              <Typography variant="body2" fontWeight={600}>
                You&apos;re ready to save this indicator.
              </Typography>
            </Stack>
          </Box>
        )}

        <Grid container spacing={2}>
          {groups.map((group) => (
            <Grid key={group.key} size={{ xs: 12, sm: 4 }}>
              <Stack gap={0.75}>
                <GroupHeading>{group.title}</GroupHeading>
                {group.checks.map((check, i) => (
                  <CheckRow key={i} ok={check.ok}>
                    {check.text}
                  </CheckRow>
                ))}
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Box>
        <Divider />
      </Box>
    </Stack>
  );
};

export default FinalizeReview;
