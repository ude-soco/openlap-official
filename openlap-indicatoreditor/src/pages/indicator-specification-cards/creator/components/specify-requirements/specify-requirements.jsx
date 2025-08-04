import { useContext } from "react";
import { Box, Button, Collapse, Divider, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ISCContext } from "../../indicator-specification-card.jsx";
import SpecifyGoal from "./components/specify-goal/specify-goal.jsx";
import ConfirmGoal from "./components/specify-goal/confirm-goal.jsx";
import FormulateQuestion from "./components/formulate-question/formulate-question.jsx";
import ConfirmQuestion from "./components/formulate-question/confirm-question.jsx";
import SpecifyIndicator from "./components/specify-indicator/specify-indicator.jsx";
import RequirementSummary from "./components/requirement-summary/requirement-summary.jsx";

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
    setLockedStep((prevState) => ({
      ...prevState,
      path: {
        ...prevState.path,
        locked: false,
        openPanel: true,
      },
    }));
  };

  const handleCheckDisabled = (requirements) => {
    return (
      requirements.goalType.verb === "" ||
      requirements.goal === "" ||
      requirements.question === "" ||
      requirements.indicatorName === "" ||
      requirements.data.some(
        (item) =>
          typeof item.value !== "string" ||
          item.value.trim() === "" ||
          !item.type ||
          typeof item.type.type !== "string" ||
          item.type.type.trim() === ""
      )
    );
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <RequirementSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.requirements.openPanel}
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ pb: 1 }}>
                    {requirements.edit.goal ? <SpecifyGoal /> : <ConfirmGoal />}
                  </Box>
                  {requirements.show.question && (
                    <Box sx={{ pb: 2 }}>
                      {requirements.edit.question ? (
                        <FormulateQuestion />
                      ) : (
                        <ConfirmQuestion />
                      )}
                    </Box>
                  )}
                  {requirements.show.indicatorName && <SpecifyIndicator />}
                </Grid>
                {requirements.show.indicatorName && (
                  <>
                    <Grid size={{ xs: 12 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            disabled={handleCheckDisabled(requirements)}
                            onClick={handleUnlockPath}
                          >
                            Next
                          </Button>
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default SpecifyRequirements;
