import { useContext, useEffect } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  Grid,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchActivityTypesList } from "../utils/filters-api.js";
import { getLastWordAndCapitalize } from "../../../utils/utils.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const ActivityTypes = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery, setAnalysisRef } = useContext(
    BasicIndicatorContext
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
      <Grid container spacing={4} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Activity types
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Tooltip
                arrow
                title={
                  indicatorQuery.platforms.length === 0 ? (
                    <Typography variant="body2">
                      Select at least one Platform from Dataset to view the list
                      of Activity types.
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
                  disableCloseOnSelect
                  id="combo-box-lrs"
                  options={state.activityTypesList}
                  fullWidth
                  slotProps={{
                    listbox: {
                      style: {
                        maxHeight: "240px",
                      },
                    },
                  }}
                  getOptionLabel={(option) => option.name}
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <li {...restProps} key={key}>
                        <Grid container sx={{ py: 0.5 }}>
                          <Grid item xs={12}>
                            <Typography>{option.name}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2">{option.id}</Typography>
                          </Grid>
                        </Grid>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="*Activity types" />
                  )}
                  onChange={(event, value) => {
                    if (value) handleSelectActivityTypes(value);
                  }}
                />
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Activity type(s)</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedActivityTypesList.length > 0 ? 1 : 0 }}
            >
              <Grid container spacing={1}>
                {state.selectedActivityTypesList?.map((activityType, index) => (
                  <Grid item key={index}>
                    <Chip
                      color="primary"
                      label={getLastWordAndCapitalize(activityType.name)}
                      onDelete={
                        Object.keys(indicatorQuery.activities).length
                          ? undefined
                          : () => handleDeselectActivityTypes(activityType)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedActivityTypesList.length > 0 ? 0.5 : 5.5 }}
            >
              <Divider />
            </Grid>
            <Grid item xs={12}>
              {Object.keys(indicatorQuery.activities).length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <i>
                    Remove all the <b>Activities</b> below to add/remove
                    activity types
                  </i>
                </Typography>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default ActivityTypes;
