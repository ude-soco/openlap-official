import PropTypes from "prop-types";
import {
  Step,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/**
 * Visible, accessible progress indicator for the five ISC Creator phases
 * (Phase C — see docs/ISC_CREATOR_ARCHITECTURE.md §5–§6).
 *
 * INFORMATIONAL ONLY in this phase: it reflects the real workflow state
 * (completed / current / locked) but does not navigate on click. Panel
 * visibility is still governed by the legacy `lockedStep` step-codes + each
 * step's own buttons; safe click-to-navigate needs the step-transition reducer
 * planned for Phase D/E. There are therefore no interactive controls here (no
 * clickable divs).
 *
 * @param {{key,label,locked,completed,summary}[]} steps  view-model from getWorkflowSteps
 * @param {string} current  key of the step to mark as current
 */
const WorkflowStepper = ({ steps, current }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === current)
  );

  return (
    <Stepper
      activeStep={currentIndex}
      alternativeLabel={!isMobile}
      orientation={isMobile ? "vertical" : "horizontal"}
      aria-label="ISC creation progress"
      sx={{ width: "100%" }}
    >
      {steps.map((step) => {
        const isCurrent = step.key === current;
        const optionalText = step.summary
          ? step.summary
          : step.locked
            ? "Locked"
            : null;
        return (
          <Step
            key={step.key}
            completed={step.completed && !isCurrent}
            active={isCurrent}
            disabled={step.locked}
          >
            <StepLabel
              aria-current={isCurrent ? "step" : undefined}
              aria-disabled={step.locked || undefined}
              icon={
                step.locked ? (
                  <LockOutlinedIcon fontSize="small" color="disabled" />
                ) : undefined
              }
              optional={
                optionalText ? (
                  <Typography
                    variant="caption"
                    color={step.locked ? "text.disabled" : "text.secondary"}
                  >
                    {optionalText}
                  </Typography>
                ) : undefined
              }
            >
              {step.label}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
};

WorkflowStepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      locked: PropTypes.bool,
      completed: PropTypes.bool,
      summary: PropTypes.string,
    })
  ).isRequired,
  current: PropTypes.string,
};

export default WorkflowStepper;
