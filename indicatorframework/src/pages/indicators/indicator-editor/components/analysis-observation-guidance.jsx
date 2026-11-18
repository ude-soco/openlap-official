import PropTypes from "prop-types";
import { Alert, Typography } from "@mui/material";
import { analysisObservationMessage } from "../utils/analytics-results.js";

export function AnalysisObservationGuidance({ inputs = [], combined = false }) {
  if (!inputs.some((input) => input.type === "Numeric")) return null;
  return (
    <Alert severity="info">
      {combined
        ? "Each row in the combined data is one observation. Match sources using the same learner or activity key before comparing their measures."
        : "Numerical inputs come from the matching xAPI statements. To compare learners, first prepare one row per learner using grouped summaries, then combine those results in Multilevel analysis."}
    </Alert>
  );
}
AnalysisObservationGuidance.propTypes = { inputs: PropTypes.array, combined: PropTypes.bool };

export function AnalysisObservationSummary({ dataset }) {
  const message = analysisObservationMessage(dataset);
  return message ? (
    <Typography variant="body2" color="text.secondary" role="status" aria-live="polite" sx={{ mb: 1.5 }}>
      {message}
    </Typography>
  ) : null;
}
AnalysisObservationSummary.propTypes = { dataset: PropTypes.object };
