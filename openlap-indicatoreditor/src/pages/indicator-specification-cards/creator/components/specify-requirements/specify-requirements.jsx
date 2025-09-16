import { useContext } from "react";
import {
  Button,
  Collapse,
  Divider,
  Paper,
  Grid,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ISCContext } from "../../indicator-specification-card";
import SpecifyGoal from "./components/specify-goal/specify-goal";
import ConfirmGoal from "./components/specify-goal/confirm-goal";
import FormulateQuestion from "./components/formulate-question/formulate-question";
import ConfirmQuestion from "./components/formulate-question/confirm-question";
import SpecifyIndicator from "./components/specify-indicator/specify-indicator";
import RequirementSummary from "./components/requirement-summary/requirement-summary";

const SpecifyRequirements = () => {
  const { requirements, lockedStep, setLockedStep } = useContext(ISCContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
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

  const handleCheckDisabled = () => {
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
      </Paper>
    </>
  );
};

export default SpecifyRequirements;
