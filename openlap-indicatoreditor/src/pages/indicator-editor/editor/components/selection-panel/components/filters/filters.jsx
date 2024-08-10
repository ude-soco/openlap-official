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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import { SelectionContext } from "../../selection-panel";
import ActivityTypes from "./components/activity-types";
import Activities from "./components/activities";
import ActionOnActivities from "./components/action-on-activities";
import ActivityChips from "./components/activity-chips";
import ActivityTypeChips from "./components/activity-type-chips";
import ActionsChips from "./components/action-chips.jsx";
import DateRange from "./components/date-range.jsx";
import User from "./components/user.jsx";
import DateRangeChips from "./components/date-range-chips.jsx";
import UserChips from "./components/user-chips.jsx";

const Filters = () => {
  const { indicatorQuery, lockedStep, setLockedStep } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: false,
    showSelections: true,
    activityTypesList: [],
    selectedActivityTypesList: [],
    activitiesList: [],
    selectedActivitiesList: [],
    actionsList: [],
    selectedActionsList: [],
    autoCompleteValue: null,
  });

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !lockedStep.filters,
    }));
  }, [lockedStep.filters]);

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
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
      analysis: false,
    }));
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={state.openPanel}
        disabled={lockedStep.filters}
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
                      {!lockedStep.filters ? (
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
                {!lockedStep.filters && (
                  <Grid item>
                    <Grid container>
                      {!state.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections} />}
                            onChange={handletoggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" onClick={handleTogglePanel}>
                        {state.openPanel ? "Close section" : "CHANGE"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {!state.openPanel && state.showSelections && (
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
