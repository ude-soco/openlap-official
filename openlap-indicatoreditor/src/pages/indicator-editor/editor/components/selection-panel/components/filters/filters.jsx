import { useEffect, useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  ListItemText,
  AccordionDetails,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../selection-panel";
import { fetchActivityTypesList } from "./filters-api";
import { getLastWordAndCapitalize } from "../../utils/utils";

const Filters = () => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, lockedStep, setIndicatorQuery, setLockedStep } =
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

  useEffect(() => {
    const loadActivityTypesData = async () => {
      try {
        const activityTypesData = await fetchActivityTypesList(
          api,
          indicatorQuery.lrsStores,
          indicatorQuery.platforms
        );
        setState((prevState) => ({
          ...prevState,
          activityTypesList: activityTypesData.filter(
            (activityType) =>
              !indicatorQuery.activityTypes.includes(activityType.id)
          ),
        }));
      } catch (error) {
        console.log("Failed to load Activity types list", error);
      }
    };

    if (indicatorQuery.platforms.length) {
      loadActivityTypesData();
    }
  }, [indicatorQuery.platforms.length > 0]);

  const handleSelectActivityTypes = (selectedActivityType) => {
    setState((prevState) => ({
      ...prevState,
      activityTypesList: prevState.activityTypesList.filter(
        (item) => item.id !== selectedActivityType.id
      ),
      autoCompleteValue: null,
    }));

    setIndicatorQuery((prevState) => {
      let tempActivityTypes = [
        ...prevState.activityTypes,
        selectedActivityType.id,
      ];
      return {
        ...prevState,
        activityTypes: tempActivityTypes,
      };
    });
  };

  const handleDeselectActivityTypes = (selectedActivityType) => {
    setState((prevState) => {
      let tempActivityType = {
        id: selectedActivityType,
        name: getLastWordAndCapitalize(selectedActivityType),
      };
      return {
        ...prevState,
        activityTypesList: [
          ...prevState.activityTypesList,
          tempActivityType,
        ].sort((a, b) => a.name.localeCompare(b.name)),
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => ({
      ...prevState,
      activityTypes: prevState.activityTypes.filter(
        (item) => item !== selectedActivityType
      ),
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
                          <Grid item>
                            <Chip label="Activity 1" />
                          </Grid>
                          <Grid item>
                            <Chip label="Activity 2" />
                          </Grid>
                          <Grid item>
                            <Typography
                              variant="body2"
                              sx={{ fontStyle: "italic" }}
                            >
                              17 more ...
                            </Typography>
                          </Grid>
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
                          <Grid item>
                            <Chip label="Annotated" />
                          </Grid>
                          <Grid item>
                            <Chip label="Replied" />
                          </Grid>
                          <Grid item>
                            <Typography
                              variant="body2"
                              sx={{ fontStyle: "italic" }}
                            >
                              7 more ...
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Date Range */}

                {indicatorQuery.duration.from.length !== 0 &&
                  indicatorQuery.duration.until.length !== 0 && (
                    <Grid item xs={12}>
                      <Grid container alignItems="center" spacing={1}>
                        <Grid item>
                          <Typography>Date Range:</Typography>
                        </Grid>
                        <Grid item sm>
                          <Grid container spacing={1}>
                            <Tooltip title="10/02/2023 (From)" arrow>
                              <Grid item>
                                <Chip label="10/02/2023" />
                              </Grid>
                            </Tooltip>
                            <Tooltip title="20/02/2024 (Until)" arrow>
                              <Grid item>
                                <Chip label="20/02/2024" />
                              </Grid>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  )}

                {/* Users */}
                {indicatorQuery.outputs.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Users:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          <Grid item>
                            <Chip label="Only me" />
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
              <Autocomplete
                disablePortal
                id="combo-box-lrs"
                options={state.activityTypesList}
                fullWidth
                getOptionLabel={(option) => option.name}
                value={state.autoCompleteValue}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Grid container>
                      <Grid item xs={12}>
                        <Typography>{option.name}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">{option.id}</Typography>
                      </Grid>
                    </Grid>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="*Search for Activity types"
                  />
                )}
                onChange={(event, value) => {
                  if (value) handleSelectActivityTypes(value);
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography>Selected Activity type(s)</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1}>
                    {indicatorQuery.activityTypes?.map(
                      (activityType, index) => (
                        <Grid item key={index}>
                          <Tooltip
                            arrow
                            title={
                              indicatorQuery.activities.length ? (
                                <Typography variant="body2">
                                  Deselect the activities(s) below in order to
                                  remove a activity type.
                                </Typography>
                              ) : undefined
                            }
                          >
                            <Chip
                              label={getLastWordAndCapitalize(activityType)}
                              onDelete={
                                indicatorQuery.activities.length
                                  ? undefined
                                  : () =>
                                      handleDeselectActivityTypes(activityType)
                              }
                            />
                          </Tooltip>
                        </Grid>
                      )
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default Filters;
