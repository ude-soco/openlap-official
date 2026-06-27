import PropTypes from "prop-types";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/**
 * Consistent card frame for one ISC Creator workflow phase (Phase D — see
 * docs/ISC_CREATOR_ARCHITECTURE.md §5–§6).
 *
 * Presentational only. It replaces each step's ad-hoc outer `Paper` (and the
 * old `opacity + grey + pointer-events:none` "broken" locked styling) with a
 * themed card and four readable states:
 *   - active    — the step currently being worked on (primary-tinted border).
 *   - completed — done & collapsed (its own summary shows inside).
 *   - available — unlocked, not yet started.
 *   - locked    — intentionally unavailable: readable, dashed, with an
 *                 explanatory hint; children stay rendered but non-interactive
 *                 (preserving the previous pointer-events gate without the
 *                 greyed-out look).
 *
 * It does NOT own the step's header/summary/Open-Close — those still live in
 * each step's existing summary component (which renders as `children`). Owning
 * open/close + one-section-at-a-time is deferred to the step-transition reducer
 * (Phase E+), because `lockedStep` + the per-step toggles still own panel state.
 */
const STATUSES = ["active", "completed", "available", "locked"];

const WorkflowSection = ({
  status = "available",
  lockedHint = "Complete the previous step to unlock this section.",
  ariaLabel,
  children,
}) => {
  const locked = status === "locked";
  const active = status === "active";

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={ariaLabel}
      aria-disabled={locked || undefined}
      sx={(theme) => ({
        position: "relative",
        p: 2,
        borderRadius: `${theme.custom.radii.card}px`,
        transition: `border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, box-shadow ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
        ...(active && {
          borderColor: theme.palette.primary.main,
          boxShadow: theme.custom.shadows.sm,
        }),
        ...(locked && {
          borderStyle: "dashed",
          backgroundColor: alpha(theme.palette.text.primary, 0.02),
        }),
      })}
    >
      <Box sx={locked ? { pointerEvents: "none" } : undefined}>{children}</Box>

      {locked && (
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ mt: 1.5, color: "text.secondary" }}
        >
          <LockOutlinedIcon fontSize="small" />
          <Typography variant="caption">{lockedHint}</Typography>
        </Stack>
      )}
    </Paper>
  );
};

WorkflowSection.propTypes = {
  status: PropTypes.oneOf(STATUSES),
  lockedHint: PropTypes.string,
  ariaLabel: PropTypes.string,
  children: PropTypes.node,
};

export default WorkflowSection;
