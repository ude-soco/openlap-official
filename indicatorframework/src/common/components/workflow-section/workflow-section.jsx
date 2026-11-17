import { useContext } from "react";
import PropTypes from "prop-types";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { EditorWorkflowContext } from "../editor-workflow/editor-workflow-context.js";

/**
 * Consistent card frame for one ISC Creator workflow phase. See
 * docs/ISC_ARCHITECTURE.md, "Workflow and source map".
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
 * open/close + one-section-at-a-time belongs to the creator's workflow helpers;
 * `lockedStep` + the per-step toggles still own panel state.
 */
const STATUSES = ["active", "completed", "available", "locked"];

const WorkflowSection = ({
  status = "available",
  lockedHint = "Complete the previous step to unlock this section.",
  ariaLabel,
  stepKey,
  children,
}) => {
  const navigation = useContext(EditorWorkflowContext);
  const locked = status === "locked";
  const active = status === "active";

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={ariaLabel}
      id={navigation && stepKey ? `${navigation.id}-${stepKey}` : undefined}
      data-editor-step={navigation ? stepKey : undefined}
      tabIndex={navigation && stepKey ? -1 : undefined}
      aria-disabled={locked || undefined}
      sx={(theme) => ({
        position: "relative",
        scrollMarginTop: "var(--editor-sticky-content-top, 81px)",
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
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
          sx={{ alignItems: "center", gap: 1, mt: 1.5, color: "text.secondary" }}
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
  stepKey: PropTypes.string,
  children: PropTypes.node,
};

export default WorkflowSection;
