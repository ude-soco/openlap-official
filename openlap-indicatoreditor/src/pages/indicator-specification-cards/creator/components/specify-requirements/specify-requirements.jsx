import { useContext } from "react";
import {
  Alert,
  Button,
  Collapse,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../isc-context.js";
import WorkflowSection from "../../../../../common/components/workflow-section/workflow-section.jsx";
import { isRequirementsComplete } from "../../utils/isc-selectors.js";
import {
  isRequirementStepComplete,
  getMissingRequirementLabels,
} from "../../utils/requirements-validation.js";
import SpecifyGoal from "./components/specify-goal/specify-goal";
import ConfirmGoal from "./components/specify-goal/confirm-goal";
import FormulateQuestion from "./components/formulate-question/formulate-question";
import ConfirmQuestion from "./components/formulate-question/confirm-question";
import SpecifyIndicator from "./components/specify-indicator/specify-indicator";
import RequirementSummary from "./components/requirement-summary/requirement-summary";

const SpecifyRequirements = () => {
  const { requirements, lockedStep, setLockedStep } = useContext(ISCContext);
  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      requirements: { ...p.requirements, openPanel: !p.requirements.openPanel },
    }));
  };

  const handleUnlockPath = () => {
    handleTogglePanel();
    if (lockedStep.path.locked) {
      setLockedStep((p) => ({
        ...p,
        path: {
          ...p.path,
          locked: false,
          openPanel: true,
        },
      }));
    }
  };

  // Next is disabled exactly when the step is not complete — both derived from
  // the shared validation helper so they can never diverge.
  const handleCheckDisabled = () => !isRequirementStepComplete(requirements);

  const missingRequirements = getMissingRequirementLabels(requirements);

  const status = lockedStep.requirements.openPanel
    ? "active"
    : isRequirementsComplete({ requirements })
      ? "completed"
      : "available";

  return (
    <>
      <WorkflowSection status={status} ariaLabel="Step 1: Specify requirements">
        <Stack gap={1}>
          <RequirementSummary />
          <Collapse
            in={lockedStep.requirements.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Grid
              container
              direction="column"
              spacing={1}
              alignItems="center"
              sx={{ pt: 2 }}
            >
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  Specify what you want to measure. Work through your goal, the
                  question behind it, the indicator you need, and the data it
                  requires — one part at a time.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                {requirements.edit.goal ? <SpecifyGoal /> : <ConfirmGoal />}
              </Grid>
              {requirements.show.question && (
                <Grid size={{ xs: 12, md: 8 }}>
                  {requirements.edit.question ? (
                    <FormulateQuestion />
                  ) : (
                    <ConfirmQuestion />
                  )}
                </Grid>
              )}
              {requirements.show.indicatorName && (
                <Grid size={{ xs: 12, md: 8 }}>
                  <SpecifyIndicator />
                </Grid>
              )}
            </Grid>
            {requirements.show.indicatorName && lockedStep.path.locked && (
              <Grid container spacing={2} direction="column">
                <Divider />
                {missingRequirements.length > 0 && (
                  <Grid container justifyContent="center">
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Alert severity="info" variant="outlined">
                        To continue, please provide:{" "}
                        {missingRequirements.join(", ")}.
                      </Alert>
                    </Grid>
                  </Grid>
                )}
                <Grid container justifyContent="center">
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={handleCheckDisabled()}
                      onClick={handleUnlockPath}
                    >
                      {lockedStep.path.locked ? "Next" : "Close"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Collapse>
        </Stack>
      </WorkflowSection>
    </>
  );
};

export default SpecifyRequirements;
