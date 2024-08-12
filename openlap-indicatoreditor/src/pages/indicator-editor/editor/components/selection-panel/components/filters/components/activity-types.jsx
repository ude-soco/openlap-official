import { useEffect, useContext } from "react";
import {
  Chip,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
  FormHelperText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchActivityTypesList } from "../utils/filters-api";
import { getLastWordAndCapitalize } from "../../../utils/utils";
import { IndicatorEditorContext } from "../../../../../indicator-editor";

const ActivityTypes = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery, setAnalysisRef } = useContext(
    IndicatorEditorContext
  );

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
              !prevState.selectedActivityTypesList.includes(activityType.id)
          ),
        }));
      } catch (error) {
        console.log("Failed to load Activity types list", error);
      }
    };

    if (indicatorQuery.platforms.length) {
      loadActivityTypesData();
    }
  }, [indicatorQuery.platforms.length]);

  const handleSelectActivityTypes = (selectedActivityType) => {
    setState((prevState) => ({
      ...prevState,
      activityTypesList: prevState.activityTypesList.filter(
        (item) => item.id !== selectedActivityType.id
      ),
      selectedActivityTypesList: [
        ...prevState.selectedActivityTypesList,
        selectedActivityType,
      ],
      autoCompleteValue: null,
    }));

    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
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
      return {
        ...prevState,
        activityTypesList: [
          ...prevState.activityTypesList,
          selectedActivityType,
        ].sort((a, b) => a.name.localeCompare(b.name)),
        selectedActivityTypesList: prevState.selectedActivityTypesList.filter(
          (type) => type.id !== selectedActivityType.id
        ),
        autoCompleteValue: null,
      };
    });

    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));
    
    setIndicatorQuery((prevState) => {
      return {
        ...prevState,
        activityTypes: prevState.activityTypes.filter(
          (item) => item !== selectedActivityType.id
        ),
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
              indicatorQuery.platforms.length === 0 ? (
                <Typography variant="body2">
                  Select at least one Platform from Dataset to view the list of
                  Activity types.
                </Typography>
              ) : state.selectedActivitiesList.length > 0 ? (
                <Typography variant="body2">
                  Deselect all the Activities below to remove an activity type.
                </Typography>
              ) : undefined
            }
          >
            <Autocomplete
              disabled={
                indicatorQuery.platforms.length === 0 ||
                state.selectedActivitiesList.length > 0
              }
              disablePortal
              id="combo-box-lrs"
              options={state.activityTypesList}
              fullWidth
              getOptionLabel={(option) => option.name}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Grid container sx={{ py: 0.5 }}>
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
          </Tooltip>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Activity type(s)</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {state.selectedActivityTypesList?.map((activityType, index) => (
                  <Grid item key={index}>
                    <Tooltip
                      arrow
                      title={
                        Object.keys(indicatorQuery.activities).length ? (
                          <Typography variant="body2">
                            Deselect all the Activities below to remove an
                            activity type.
                          </Typography>
                        ) : undefined
                      }
                    >
                      <Chip
                        label={getLastWordAndCapitalize(activityType.name)}
                        onDelete={
                          Object.keys(indicatorQuery.activities).length
                            ? undefined
                            : () => handleDeselectActivityTypes(activityType)
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

export default ActivityTypes;
