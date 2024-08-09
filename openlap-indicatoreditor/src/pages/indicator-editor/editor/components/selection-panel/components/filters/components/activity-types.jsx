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
import { SelectionContext } from "../../../selection-panel";
import { fetchActivityTypesList } from "../utils/filters-api";
import { getLastWordAndCapitalize } from "../../../utils/utils";

const ActivityTypes = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery } = useContext(SelectionContext);

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
  }, [indicatorQuery.platforms.length]);

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

    setIndicatorQuery((prevState) => {
      return {
        ...prevState,
        activityTypes: prevState.activityTypes.filter(
          (item) => item !== selectedActivityType
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
              ) : undefined
            }
          >
            <Autocomplete
              disabled={indicatorQuery.platforms.length === 0}
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
          </Tooltip>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Activity type(s)</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {indicatorQuery.activityTypes?.map((activityType, index) => (
                  <Grid item key={index}>
                    <Tooltip
                      arrow
                      title={
                        Object.keys(indicatorQuery.activities).length ? (
                          <Typography variant="body2">
                            Deselect the activities(s) below in order to remove
                            a activity type.
                          </Typography>
                        ) : undefined
                      }
                    >
                      <Chip
                        label={getLastWordAndCapitalize(activityType)}
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
