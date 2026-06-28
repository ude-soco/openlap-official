import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";

export default function ActionSelection({ activity, index }) {
  const { api } = useContext(AuthContext);
  const { dataset, setFilters } = useContext(BasicContext);
  const [loading, setLoading] = useState(false);

  const isDisabled = activity.actionList.length === 0;
  const hasActivities = activity.activityList.length !== 0;

  const handleSelectActions = async (value) => {
    let actionIdList = [];
    // TODO:  The selectedActionList currently is taking an object NOT a list
    //        This has to be fixed not only in the front-end, but also in the backend
    if (value.id) actionIdList.push(value.id);

    if (actionIdList.length > 0) {
      setLoading(true);
      try {
        const activityList = await fetchActivitiesList(
          api,
          dataset.selectedLRSList,
          activity.selectedActivityType.id,
          actionIdList
        );
        setFilters((p) => {
          let updatedActivities;
          updatedActivities = p.selectedActivities.map((a) =>
            a.id === activity.id
              ? {
                  ...a,
                  selectedActionList: [...a.selectedActionList, value],
                  activityList: activityList,
                  selectedActivityList: [],
                }
              : a
          );
          return {
            ...p,
            selectedActivities: updatedActivities,
          };
        });
        return;
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    setFilters((p) => {
      let updatedActivities;
      updatedActivities = p.selectedActivities.map((a) =>
        a.id === activity.id
          ? {
              ...a,
              selectedActionList: [],
              activityList: [],
              selectedActivityList: [],
            }
          : a
      );
      return { ...p, selectedActivities: updatedActivities };
    });
  };

  return (
    <Stack gap={0.75}>
      <Typography
        variant="body2"
        fontWeight={500}
        color={isDisabled ? "text.disabled" : undefined}
      >
        Action
      </Typography>
      <Autocomplete
        disableClearable
        disablePortal
        fullWidth
        loading={loading}
        disabled={isDisabled}
        options={activity.actionList}
        getOptionLabel={(o) => o.name}
        value={activity.selectedActionList[index] || null}
        onChange={(event, value) => {
          handleSelectActions(value);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search for an action"
            inputProps={{ ...params.inputProps, "aria-label": "Action" }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...restProps } = props;
          return (
            <li {...restProps} key={key}>
              <Grid container sx={{ py: 0.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Typography>{option.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="textSecondary">
                    {option.id}
                  </Typography>
                </Grid>
              </Grid>
            </li>
          );
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {isDisabled
          ? "Select an activity type first."
          : hasActivities
            ? "Changing the action resets Activities below."
            : "Select an action performed on this activity type, e.g. viewed or edited."}
      </Typography>
    </Stack>
  );
}

ActionSelection.propTypes = {
  activity: PropTypes.object.isRequired,
  index: PropTypes.number,
};
