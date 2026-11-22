import PropTypes from "prop-types";
import { Alert, Typography } from "@mui/material";

export function AnalysisObservationGuidance({ inputs = [], combined = false }) {
  const numerical = inputs.some((input) => input.type === "Numeric");
  const outcome = inputs.some((input) => input.type === "TrueFalse");
  if (!numerical && !outcome) return null;
  return (
    <Alert severity="info">
      {!numerical && outcome
        ? "Success and completion are separate recorded outcomes. The rate uses events with a recorded true or false outcome."
        : combined
        ? "Each row in the combined data is one observation. To compare measures across activities, match sources by the same activity identifier."
        : "Each matching xAPI statement can contribute one measurement. Group by activity identifier for a separate summary per activity."}
    </Alert>
  );
}
AnalysisObservationGuidance.propTypes = { inputs: PropTypes.array, combined: PropTypes.bool };

export function AnalysisObservationSummary({ message }) {
  return message ? (
    <Typography variant="body2" color="text.secondary" role="status" aria-live="polite" sx={{ mb: 1.5 }}>
      {message}
    </Typography>
  ) : null;
}
AnalysisObservationSummary.propTypes = { message: PropTypes.string };
