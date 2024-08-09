import { useEffect, useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  Chip,
  AccordionDetails,
  Grid,
  Typography,
  Tooltip,
  FormControl,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import { SelectionContext } from "../../selection-panel";
import { getLastWordAndCapitalize } from "../../utils/utils";
import ActivityTypes from "./components/activity-types";
import Activities from "./components/activities";
import ActionOnActivities from "./components/action-on-activities";
import Condition from "../../utils/condition";
import { DemoContainer } from "@mui/x-date-pickers/internals/demo";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const Filters = () => {
  const { indicatorQuery, setIndicatorQuery, lockedStep } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: false,
    activityTypesList: [],
    activitiesList: [],
    actionsList: [],
    autoCompleteValue: null,
  });

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !lockedStep.filters,
    }));
  }, [lockedStep.filters]);

  const handleUpdateUserData = (event) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      userQueryCondition: event.target.value,
    }));
  };

  const handleUpdateStartDate = (value) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      duration: {
        ...prevState.duration,
        from: value.toISOString(),
      },
    }));
  };

  const handleUpdateEndDate = (value) => {
    setIndicatorQuery((prevState) => ({
      ...prevState,
      duration: {
        ...prevState.duration,
        until: value.toISOString(),
      },
    }));
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={state.openPanel}
        onChange={handleTogglePanel}
        disabled={lockedStep.filters}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel2-content"
          id="panel2-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
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

            {!state.openPanel && (
              <>
                {/* Activity Types */}
                {indicatorQuery.activityTypes.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Activity Types:</Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1} alignItems="center">
                          {indicatorQuery.activityTypes?.map(
                            (activityType, index) => (
                              <Grid item key={index}>
                                <Chip
                                  label={getLastWordAndCapitalize(activityType)}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Activities */}
                {Object.entries(indicatorQuery.activities).length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Activities:</Typography>
                      </Grid>
                      <Grid item md>
                        <Grid container spacing={1} alignItems="center">
                          {Object.values(indicatorQuery.activities)?.map(
                            (array) =>
                              array.map((activity, index) => (
                                <Grid item key={index}>
                                  <Chip label={activity} />
                                </Grid>
                              ))
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Action on Activites */}

                {indicatorQuery.actionOnActivities.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Actions:</Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1} alignItems="center">
                          {indicatorQuery.actionOnActivities?.map(
                            (action, index) => (
                              <Grid item key={index}>
                                <Chip
                                  label={getLastWordAndCapitalize(action)}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Date Range */}

                {!lockedStep.filters && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Date Range:</Typography>
                      </Grid>
                      <Grid item sm>
                        <Grid container spacing={1}>
                          {Object.entries(indicatorQuery.duration).map(
                            ([key, value]) => (
                              <Grid item key={key}>
                                <Chip
                                  label={`${key}: ${dayjs(value).format(
                                    "YYYY-MM-DD"
                                  )}`}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Users */}
                {!lockedStep.filters && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Users:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          <Grid item>
                            <Chip
                              label={
                                indicatorQuery.userQueryCondition ===
                                Condition.only_me
                                  ? "Use only my data"
                                  : Condition.exclude_me
                                  ? "Exclude my data"
                                  : "Include all data"
                              }
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
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
                  <Typography gutterBottom>Date range</Typography>
                  {/* Date range */}
                  <Grid container spacing={2}>
                    <Grid item>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={["DatePicker"]}>
                          <DatePicker
                            label="Start date"
                            value={dayjs(indicatorQuery.duration.from)}
                            maxDate={dayjs(indicatorQuery.duration.until)}
                            fullWidth
                            onChange={(value) => handleUpdateStartDate(value)}
                          />
                        </DemoContainer>
                      </LocalizationProvider>
                    </Grid>
                    <Grid item>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DemoContainer components={["DatePicker"]}>
                          <DatePicker
                            label="End date"
                            value={dayjs(indicatorQuery.duration.until)}
                            minDate={dayjs(indicatorQuery.duration.from)}
                            fullWidth
                            onChange={(value) => handleUpdateEndDate(value)}
                          />
                        </DemoContainer>
                      </LocalizationProvider>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Typography>Users</Typography>
                  <FormControl>
                    <RadioGroup
                      row
                      aria-labelledby="radio-buttons-group-role-label"
                      name="role"
                      value={indicatorQuery.userQueryCondition}
                      onChange={handleUpdateUserData}
                    >
                      <FormControlLabel
                        value={Condition.only_me}
                        control={<Radio />}
                        label="Use only my data"
                      />
                      <FormControlLabel
                        value={Condition.exclude_me}
                        control={<Radio />}
                        label="Exclude my data"
                      />
                      <FormControlLabel
                        value={Condition.all}
                        control={<Radio />}
                        label="Include all data"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default Filters;
