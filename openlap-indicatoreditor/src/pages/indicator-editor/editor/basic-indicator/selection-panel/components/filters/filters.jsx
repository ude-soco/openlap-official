import { useEffect, useState, useContext } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionSummary,
  Button,
  Chip,
  AccordionDetails,
  Grid,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import ActivityTypes from "./components/activity-types.jsx";
import Activities from "./components/activities.jsx";
import ActionOnActivities from "./components/action-on-activities.jsx";
import ActivityChips from "./components/activity-chips.jsx";
import ActivityTypeChips from "./components/activity-type-chips.jsx";
import ActionsChips from "./components/action-chips.jsx";
import DateRange from "./components/date-range.jsx";
import User from "./components/user.jsx";
import DateRangeChips from "./components/date-range-chips.jsx";
import UserChips from "./components/user-chips.jsx";
import { BasicIndicatorContext } from "../../../basic-indicator.jsx";

const Filters = () => {
  const { setAnalysisRef, indicatorQuery, lockedStep, setLockedStep } =
    useContext(BasicIndicatorContext);
  const [state, setState] = useState(() => {
    const savedState = sessionStorage.getItem("filters");
    return savedState
      ? JSON.parse(savedState)
      : {
          openPanel: false,
          showSelections: true,
          activityTypesList: [],
          selectedActivityTypesList: [],
          activitiesList: [],
          selectedActivitiesList: [],
          actionsList: [],
          selectedActionsList: [],
          autoCompleteValue: null,
        };
  });

  useEffect(() => {
    sessionStorage.setItem("filters", JSON.stringify(state));
  }, [state]);

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      filter: {
        ...prevState.filter,
        openPanel: !prevState.filter.openPanel,
      },
    }));
  };

  const handletoggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockAnalysis = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      analysis: {
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={lockedStep.filter.openPanel}
        disabled={lockedStep.filter.locked}
      >
        <AccordionSummary aria-controls="panel2-content" id="panel2-header">
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      {!lockedStep.filter.locked ? (
                        <Chip label="2" color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Filters</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.filter.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.filter.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections} />}
                            onChange={handletoggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" variant="outlined" size="small" onClick={handleTogglePanel}>
                        {lockedStep.filter.openPanel
                          ? "Close section"
                          : "Change selections"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {!lockedStep.filter.openPanel &&
              !lockedStep.filter.locked &&
              state.showSelections && (
                <>
                  <ActivityTypeChips />
                  <ActivityChips />
                  <ActionsChips />
                  <DateRangeChips />
                  <UserChips />
                </>
              )}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ActivityTypes state={state} setState={setState} />
            </Grid>
            <Grid item xs={12}>
              <Activities state={state} setState={setState} />
            </Grid>
            <Grid item xs={12}>
              <ActionOnActivities state={state} setState={setState} />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={4}>
                <Grid item xs={12}>
                  <DateRange />
                </Grid>
                <Grid item xs={12}>
                  <User />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container>
            <Button
              variant="contained"
              fullWidth
              disabled={
                !indicatorQuery.activityTypes.length ||
                !Object.entries(indicatorQuery.activities).length ||
                !indicatorQuery.actionOnActivities.length
              }
              onClick={handleUnlockAnalysis}
            >
              Next
            </Button>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Filters;
