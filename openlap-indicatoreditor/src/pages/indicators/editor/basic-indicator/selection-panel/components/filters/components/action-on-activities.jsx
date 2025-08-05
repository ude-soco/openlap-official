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
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
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
    setLockedStep,
    setGenerate,
    setIndicator,
    setVisRef,
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

      setVisRef((prevState) => {
        return {
          ...prevState,
          visualizationLibraryId: "",
          visualizationTypeId: "",
          visualizationMapping: {
            ...prevState.visualizationMapping,
            mapping: [],
          },
        };
      });
      setGenerate(false);
      setIndicator((prevState) => ({
        ...prevState,
        previewData: {
          ...prevState.previewData,
          displayCode: [],
          scriptData: "",
        },
      }));
      setLockedStep((prevState) => ({
        ...prevState,
        visualization: {
          locked: true,
          openPanel: false,
        },
        finalize: {
          ...prevState.finalize,
          locked: true,
          openPanel: false,
        },
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
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Actions
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Tooltip
                arrow
                title={
                  Object.entries(indicatorQuery.activities).length === 0 ? (
                    <Typography variant="body2">
                      Select at least one Activity from above to view the list
                      of Actions.
                    </Typography>
                  ) : undefined
                }
              >
                <Autocomplete
                  disabled={
                    Object.entries(indicatorQuery.activities).length === 0
                  }
                  disablePortal
                  disableCloseOnSelect
                  id="combo-box-lrs"
                  options={state.actionsList}
                  fullWidth
                  slotProps={{
                    listbox: {
                      style: {
                        maxHeight: "240px",
                      },
                    },
                  }}
                  getOptionLabel={(option) => option?.name}
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <li {...restProps} key={key}>
                        <Grid container>
                          <Grid item xs={12}>
                            <Typography>{option?.name}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="body2">
                              {option?.id}
                            </Typography>
                          </Grid>
                        </Grid>
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="*Actions" />
                  )}
                  onChange={(event, value) => {
                    if (value) handleSelectActionOnActivity(value);
                  }}
                />
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedActionsList.length > 0 ? 1 : 0 }}
            >
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Action(s)</b>
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                {state.selectedActionsList?.map((action, index) => (
                  <Grid item key={index}>
                    <Chip
                      color="primary"
                      label={getLastWordAndCapitalize(action.name)}
                      onDelete={() => handleDeselectActionOnActivity(action)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedActionsList.length > 0 ? 0.5 : 5.5 }}
            >
              <Divider />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default ActionOnActivities;
