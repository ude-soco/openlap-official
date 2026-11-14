import PropTypes from "prop-types";
import {
  Step,
  StepButton,
  StepLabel,
  Stepper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

/**
 * Visible, accessible progress indicator for the five ISC Creator phases.
 * See docs/ISC_ARCHITECTURE.md, "Workflow and source map".
 *
 * Reflects the real workflow state (completed / current / locked). When the
 * creator provides onStepSelect, unlocked steps can be reopened. Panel
 * visibility remains governed by `lockedStep` and the creator's helpers.
 *
 * @param {{key,label,locked,completed,summary}[]} steps  view-model from getWorkflowSteps
 * @param {string} current  key of the step to mark as current
 * @param {(stepKey: string) => void} [onStepSelect]  when provided, unlocked
 *   steps become clickable (open that section). Locked steps stay disabled.
 */
const WorkflowStepper = ({ steps, current, onStepSelect, ariaLabel = "ISC creation progress" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === current)
  );

  return (
    <Stepper
      nonLinear
      activeStep={currentIndex}
      alternativeLabel={!isMobile}
      orientation={isMobile ? "vertical" : "horizontal"}
      aria-label={ariaLabel}
      sx={{ width: "100%" }}
    >
      {steps.map((step) => {
        const isCurrent = step.key === current;
        const optionalText = step.summary
          ? step.summary
          : step.locked
            ? "Locked"
            : null;
        const optionalNode = optionalText ? (
          <Typography
            variant="caption"
            color={step.locked ? "text.disabled" : "text.secondary"}
          >
            {optionalText}
          </Typography>
        ) : undefined;
        const lockIcon = step.locked ? (
          <LockOutlinedIcon fontSize="small" color="disabled" />
        ) : undefined;
        const clickable = !step.locked && typeof onStepSelect === "function";

        return (
          <Step
            key={step.key}
            completed={step.completed && !isCurrent}
            active={isCurrent}
            disabled={step.locked}
          >
            {clickable ? (
              <StepButton
                onClick={() => onStepSelect(step.key)}
                icon={lockIcon}
                optional={optionalNode}
                aria-current={isCurrent ? "step" : undefined}
              >
                {step.label}
              </StepButton>
            ) : (
              <StepLabel
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={step.locked || undefined}
                icon={lockIcon}
                optional={optionalNode}
              >
                {step.label}
              </StepLabel>
            )}
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
  onStepSelect: PropTypes.func,
  ariaLabel: PropTypes.string,
};

export default WorkflowStepper;
