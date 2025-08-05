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
  Tooltip,
  Grow,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
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

  const handleToggleShowSelection = () => {
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
                    {!lockedStep.filter.openPanel &&
                      !lockedStep.filter.locked && (
                        <>
                          <Grid item>
                            <Tooltip title="Edit filter selection">
                              <IconButton onClick={handleTogglePanel}>
                                <EditIcon color="primary" />
                              </IconButton>
                            </Tooltip>
                          </Grid>

                          <Grid item>
                            <Tooltip
                              title={
                                !state.showSelections
                                  ? "Show summary"
                                  : "Hide summary"
                              }
                            >
                              <IconButton onClick={handleToggleShowSelection}>
                                {!state.showSelections ? (
                                  <VisibilityIcon color="primary" />
                                ) : (
                                  <VisibilityOffIcon color="primary" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </>
                      )}
                  </Grid>
                </Grid>
                {lockedStep.filter.openPanel && !lockedStep.filter.locked && (
                  <Grid item>
                    <Tooltip title="Close panel">
                      <IconButton onClick={handleTogglePanel}>
                        <CloseIcon color="primary" />
                      </IconButton>
                    </Tooltip>
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
            <Grow
              in={indicatorQuery.activityTypes.length > 0}
              timeout={{ enter: 500, exit: 500 }}
              unmountOnExit
            >
              <Grid item xs={12}>
                <Activities state={state} setState={setState} />
              </Grid>
            </Grow>
            <Grow
              in={Object.entries(indicatorQuery.activities).length > 0}
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid item xs={12}>
                <ActionOnActivities state={state} setState={setState} />
              </Grid>
            </Grow>
            <Grow
              in={indicatorQuery.actionOnActivities.length > 0}
              timeout={{ enter: 500, exit: 0 }}
              unmountOnExit
            >
              <Grid item xs={12}>
                <Grid container spacing={4}>
                  <Grid item xs={12} sx={{ mb: 2 }}>
                    <DateRange />
                  </Grid>
                  <Grid item xs={12}>
                    <User />
                  </Grid>
                </Grid>
              </Grid>
            </Grow>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container justifyContent="center">
            <Grid item xs={12} md={6}>
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
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Filters;
