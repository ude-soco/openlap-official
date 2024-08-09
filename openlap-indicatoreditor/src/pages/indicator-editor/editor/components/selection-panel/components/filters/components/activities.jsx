import { useEffect, useState, useContext } from "react";
import {
  Chip,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../../selection-panel";
import { fetchActivitiesList } from "../filters-api";
import { getLastWordAndCapitalize } from "../../../utils/utils";

const Activities = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery } = useContext(SelectionContext);

  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        const activitiesData = await fetchActivitiesList(
          api,
          indicatorQuery.lrsStores,
          indicatorQuery.platforms,
          indicatorQuery.activityTypes
        );
        setState((prevState) => ({
          ...prevState,
          activitiesList: activitiesData,
        }));
      } catch (error) {
        console.log("Failed to load Activities list", error);
      }
    };
    if (indicatorQuery.activityTypes.length) {
      loadActivitiesData();
    }
  }, [indicatorQuery.activityTypes.length]);

  const handleSelectActivities = (selectedActivity) => {
    setState((prevState) => ({
      ...prevState,
      activitiesList: prevState.activitiesList.filter(
        (item) => item.id !== selectedActivity.id
      ),
      autoCompleteValue: null,
    }));

    setIndicatorQuery((prevState) => {
      const { queryId, name } = selectedActivity;
      let tempActivities = { ...prevState.activities };
      if (tempActivities[queryId]) {
        // If the name doesn't already exist in the array, add it
        if (!tempActivities[queryId].includes(name)) {
          tempActivities[queryId].push(name);
        }
      } else {
        // If the queryId doesn't exist, create a new array with the name
        tempActivities[queryId] = [name];
      }
      return {
        ...prevState,
        activities: tempActivities,
      };
    });
  };

  const handleDeselectActivity = (queryId, selectedActivity) => {
    setState((prevState) => {
      let tempActivity = {
        id: selectedActivity,
        queryId: queryId,
        name: selectedActivity,
      };
      return {
        ...prevState,
        activitiesList: [...prevState.activitiesList, tempActivity].sort(
          (a, b) => a.name.localeCompare(b.name)
        ),
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => {
      let tempActivities = { ...prevState.activities };
      if (tempActivities[queryId]) {
        const index = tempActivities[queryId].indexOf(selectedActivity);
        if (index !== -1) {
          tempActivities[queryId].splice(index, 1);
        }

        if (tempActivities[queryId].length === 0) {
          delete tempActivities[queryId];
        }
      }
      return {
        ...prevState,
        activities: tempActivities,
      };
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Tooltip
            arrow
            title={
              indicatorQuery.activityTypes.length === 0 ? (
                <Typography variant="body2">
                  Select at least one Activity Type from above to view the list
                  of Activities.
                </Typography>
              ) : undefined
            }
          >
            <Autocomplete
              disabled={indicatorQuery.activityTypes.length === 0}
              disablePortal
              id="combo-box-lrs"
              options={state.activitiesList}
              fullWidth
              getOptionLabel={(option) => option.name}
              value={state.autoCompleteValue}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} placeholder="*Search for Activities" />
              )}
              onChange={(event, value) => {
                if (value) handleSelectActivities(value);
              }}
            />
          </Tooltip>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Activity(ies)</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {Object.entries(indicatorQuery.activities)?.map(
                  ([key, array]) =>
                    array.map((activity, index) => (
                      <Grid item key={index}>
                        <Tooltip
                          arrow
                          title={
                            indicatorQuery.actionOnActivities.length ? (
                              <Typography variant="body2">
                                Deselect the action(s) below in order to remove
                                an activity.
                              </Typography>
                            ) : undefined
                          }
                        >
                          <Chip
                            label={activity}
                            onDelete={
                              indicatorQuery.actionOnActivities.length
                                ? undefined
                                : () => handleDeselectActivity(key, activity)
                            }
                          />
                        </Tooltip>
                      </Grid>
                    ))
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sx={{ pb: 2 }}>
          <Divider />
        </Grid>
      </Grid>
    </>
  );
};

export default Activities;
