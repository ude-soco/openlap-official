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
import { AuthContext } from "../../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchActionOnActivitiesList } from "../utils/filters-api.js";
import { getLastWordAndCapitalize } from "../../../utils/utils.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const ActionOnActivities = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const {
    indicatorQuery,
    setIndicatorQuery,
    setAnalysisInputMenu,
    setAnalysisRef,
  } = useContext(BasicIndicatorContext);

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
    if (state.selectedActivitiesList.length > 0) {
      loadActivityTypesData();
    }
  }, [state.selectedActivitiesList.length]);

  const handleSelectActionOnActivity = (selectedAction) => {
    setState((prevState) => ({
      ...prevState,
      actionsList: prevState.actionsList.filter(
        (item) => item.id !== selectedAction.id
      ),
      selectedActionsList: [...prevState.selectedActionsList, selectedAction],
      autoCompleteValue: null,
    }));

    setIndicatorQuery((prevState) => ({
      ...prevState,
      actionOnActivities: [...prevState.actionOnActivities, selectedAction.id],
    }));

    // If query is changed
    setAnalysisRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));

    setAnalysisInputMenu((prevState) => {
      let tempActionOptionExists = [
        ...prevState.actionOnActivities.options,
      ].some((output) => output === selectedAction.queryId);
      if (!tempActionOptionExists) {
        let tempOptions = [
          ...prevState.actionOnActivities.options,
          selectedAction.queryId,
        ];
        return {
          ...prevState,
          actionOnActivities: {
            ...prevState.actionOnActivities,
            id: tempOptions.length === 1 ? tempOptions[0] : undefined,
            options: tempOptions,
          },
        };
      }
      return prevState;
    });
  };

  const handleDeselectActionOnActivity = (selectedAction) => {
    setState((prevState) => {
      let tempSelectedActionList = prevState.selectedActionsList.filter(
        (item) => item.id !== selectedAction.id
      );

      // If query is changed
      setAnalysisRef((prevState) => ({
        ...prevState,
        analyzedData: {},
      }));

      setAnalysisInputMenu((prevInputState) => {
        const uniqueQueryIds = [
          ...new Set(tempSelectedActionList.map((item) => item.queryId)),
        ];
        return {
          ...prevInputState,
          actionOnActivities: {
            ...prevInputState.actionOnActivities,
            id: uniqueQueryIds.length === 1 ? uniqueQueryIds[0] : undefined,
            options: uniqueQueryIds,
          },
        };
      });

      return {
        ...prevState,
        actionsList: [...prevState.actionsList, selectedAction].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
        selectedActionsList: tempSelectedActionList,
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => {
      return {
        ...prevState,
        actionOnActivities: prevState.actionOnActivities.filter(
          (item) => item !== selectedAction.id
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
              getOptionLabel={(option) => option?.name}
              renderOption={(props, option) => (
                <li {...props} key={option?.id}>
                  <Grid container>
                    <Grid item xs={12}>
                      <Typography>{option?.name}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2">{option?.id}</Typography>
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
                {state.selectedActionsList?.map((action, index) => (
                  <Grid item key={index}>
                    <Chip
                      label={getLastWordAndCapitalize(action.name)}
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
