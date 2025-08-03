import { useContext } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Grid,
} from "@mui/material";
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
    setLockedStep((prevState) => ({
      ...prevState,
      requirements: {
        ...prevState.requirements,
        openPanel: !prevState.requirements.openPanel,
      },
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
      <Accordion expanded={lockedStep.requirements.openPanel}>
        <AccordionSummary>
          <Grid container>
            <Grid item xs={12}>
              <RequirementSummary />
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
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
        </AccordionDetails>
        <AccordionActions sx={{ py: 1 }}>
          {requirements.show.indicatorName && (
            <Grid item xs={12}>
              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={12} md={6}>
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
          )}
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default SpecifyRequirements;
