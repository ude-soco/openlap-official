import { useEffect, useContext } from "react";
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
import { fetchActivitiesList } from "../utils/filters-api";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const Activities = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    setAnalysisRef,
    indicatorQuery,
    setIndicatorQuery,
    setAnalysisInputMenu,
  } = useContext(BasicIndicatorContext);

  useEffect(() => {
    const loadActivitiesData = async () => {
      try {
        const activitiesData = await fetchActivitiesList(
          api,
          indicatorQuery.lrsStores,
          indicatorQuery.platforms,
          indicatorQuery.activityTypes
        );
        // TODO: why not filtered with selected??
        setState((prevState) => ({
          ...prevState,
          activitiesList: activitiesData.filter(
            (activity) =>
              !prevState.selectedActivitiesList.includes(activity.id)
          ),
        }));
      } catch (error) {
        console.log("Failed to load Activities list", error);
      }
    };
    if (indicatorQuery.activityTypes.length > 0) {
      loadActivitiesData();
    }
  }, [indicatorQuery.activityTypes.length]);

  const handleSelectActivities = (selectedActivity) => {
    setState((prevState) => ({
      ...prevState,
      activitiesList: prevState.activitiesList.filter(
        (item) => item.id !== selectedActivity.id
      ),
      selectedActivitiesList: [
        ...prevState.selectedActivitiesList,
        selectedActivity,
      ],
      autoCompleteValue: null,
    }));

    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));

    setIndicatorQuery((prevState) => {
      const { queryId, name } = selectedActivity;
      let tempActivities = { ...prevState.activities };
      if (tempActivities[queryId]) {
        if (!tempActivities[queryId].includes(name)) {
          tempActivities[queryId].push(name);
        }
      } else {
        tempActivities[queryId] = [name];
      }
      let tempActivityKeys = Object.keys(tempActivities);
      setAnalysisInputMenu((prevState) => ({
        ...prevState,
        activities: {
          ...prevState.activities,
          id: tempActivityKeys.length === 1 ? tempActivityKeys[0] : undefined,
          options: tempActivityKeys,
        },
      }));

      return {
        ...prevState,
        activities: tempActivities,
      };
    });
  };

  const handleDeselectActivity = (selectedActivity) => {
    setState((prevState) => {
      return {
        ...prevState,
        activitiesList: [...prevState.activitiesList, selectedActivity].sort(
          (a, b) => a.name.localeCompare(b.name)
        ),
        selectedActivitiesList: prevState.selectedActivitiesList.filter(
          (item) => item.id !== selectedActivity.id
        ),
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => {
      let tempActivities = { ...prevState.activities };
      if (tempActivities[selectedActivity.queryId]) {
        const index = tempActivities[selectedActivity.queryId].indexOf(
          selectedActivity.name
        );
        if (index !== -1) {
          tempActivities[selectedActivity.queryId].splice(index, 1);
        }

        if (tempActivities[selectedActivity.queryId].length === 0) {
          delete tempActivities[selectedActivity.queryId];
        }
      }

      // If query is changed
      setAnalysisRef((prevState) => ({
        ...prevState,
        analyzedData: {},
      }));

      let tempActivityKeys = Object.keys(tempActivities);
      setAnalysisInputMenu((prevState) => ({
        ...prevState,
        activities: {
          ...prevState.activities,
          id: tempActivityKeys.length === 1 ? tempActivityKeys[0] : undefined,
          options: tempActivityKeys,
        },
      }));

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
              ) : state.selectedActionsList.length > 0 ? (
                <Typography variant="body2">
                  Deselect all the Actions below in order to remove an activity.
                </Typography>
              ) : undefined
            }
          >
            <Autocomplete
              disabled={
                indicatorQuery.activityTypes.length === 0 ||
                state.selectedActionsList.length > 0
              }
              disablePortal
              id="combo-box-lrs"
              options={state.activitiesList}
              fullWidth
              getOptionLabel={(option) => option.name}
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
                {state.selectedActivitiesList?.map((activity, index) => (
                  <Grid item key={index}>
                    <Tooltip
                      arrow
                      title={
                        indicatorQuery.actionOnActivities.length ? (
                          <Typography variant="body2">
                            Deselect all the Actions below in order to remove an
                            activity.
                          </Typography>
                        ) : undefined
                      }
                    >
                      <Chip
                        label={activity.name}
                        onDelete={
                          indicatorQuery.actionOnActivities.length
                            ? undefined
                            : () => handleDeselectActivity(activity)
                        }
                      />
                    </Tooltip>
                  </Grid>
                ))}
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
