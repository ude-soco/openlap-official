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
import { fetchActionOnActivitiesList } from "../utils/filters-api";
import { getLastWordAndCapitalize } from "../../../utils/utils";

const ActionOnActivities = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery } = useContext(SelectionContext);

  useEffect(() => {
    const loadActivityTypesData = async () => {
      try {
        const actionsData = await fetchActionOnActivitiesList(
          api,
          indicatorQuery.lrsStores,
          indicatorQuery.platforms,
          indicatorQuery.activityTypes,
          indicatorQuery.activities
        );
        setState((prevState) => ({
          ...prevState,
          actionsList: actionsData.filter(
            (action) => !indicatorQuery.actionOnActivities.includes(action)
          ),
        }));
      } catch (error) {
        console.log("Failed to load Action on Activities list", error);
      }
    };

    if (Object.entries(indicatorQuery.activities).length) {
      loadActivityTypesData();
    }
  }, [Object.entries(indicatorQuery.activities).length]);

  const handleSelectActionOnActivity = (selectedAction) => {
    setState((prevState) => ({
      ...prevState,
      actionsList: prevState.actionsList.filter(
        (item) => item.id !== selectedAction.id
      ),
      autoCompleteValue: null,
    }));

    setIndicatorQuery((prevState) => {
      let tempActionOnActivities = [
        ...prevState.actionOnActivities,
        selectedAction.id,
      ];
      return {
        ...prevState,
        actionOnActivities: tempActionOnActivities,
      };
    });
  };

  const handleDeselectActionOnActivity = (selectedAction) => {
    setState((prevState) => {
      let tempActionOnActivity = {
        id: selectedAction,
        name: getLastWordAndCapitalize(selectedAction),
      };
      return {
        ...prevState,
        actionsList: [...prevState.actionsList, tempActionOnActivity].sort(
          (a, b) => a.name.localeCompare(b.name)
        ),
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => ({
      ...prevState,
      actionOnActivities: prevState.actionOnActivities.filter(
        (item) => item !== selectedAction
      ),
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Tooltip
            arrow
            title={
              Object.entries(indicatorQuery.activities).length === 0 ? (
                <Typography variant="body2">
                  Select at least one Activity from above to view the list of
                  Actions.
                </Typography>
              ) : undefined
            }
          >
            <Autocomplete
              disabled={Object.entries(indicatorQuery.activities).length === 0}
              disablePortal
              id="combo-box-lrs"
              options={state.actionsList}
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
                <TextField {...params} placeholder="*Search for Actions" />
              )}
              onChange={(event, value) => {
                if (value) handleSelectActionOnActivity(value);
              }}
            />
          </Tooltip>
        </Grid>

        <Grid item xs={12}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography>Selected Action(s)</Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {indicatorQuery.actionOnActivities?.map((action, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={getLastWordAndCapitalize(action)}
                      onDelete={() => handleDeselectActionOnActivity(action)}
                    />
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

export default ActionOnActivities;
