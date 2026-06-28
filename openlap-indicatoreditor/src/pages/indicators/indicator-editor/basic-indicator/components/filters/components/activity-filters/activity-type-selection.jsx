import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  Box,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActionOnActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";

export default function ActivityTypeSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, filters, setFilters } = useContext(BasicContext);
  const [loading, setLoading] = useState(false);

  const handleSelectActivityType = (value) => {
    const loadActionList = async () => {
      setLoading(true);
      try {
        const actionList = await fetchActionOnActivitiesList(
          api,
          dataset.selectedLRSList,
          value.id
        );
        return actionList;
      } catch (error) {
        console.error(`Failed to load the action on activity list`, error);
        return [];
      } finally {
        setLoading(false);
      }
    };
    loadActionList().then((actionList) => {
      setFilters((p) => {
        let updatedActivities;
        updatedActivities = p.selectedActivities.map((a) =>
          a.id === activity.id
            ? {
                ...a,
                selectedActivityType: value,
                actionList: actionList,
                selectedActionList: [],
                activityList: [],
                selectedActivityList: [],
              }
            : a
        );
        return {
          ...p,
          selectedActivities: updatedActivities,
        };
      });
    });
  };

  const isSelected = activity.selectedActivityType.name !== "";

  return (
    <Stack gap={0.75}>
      <Typography variant="body2" fontWeight={500}>
        Activity type{" "}
        <Box component="span" sx={{ color: "error.main" }} aria-hidden>
          *
        </Box>
      </Typography>
      <Autocomplete
        disableClearable
        disablePortal
        fullWidth
        loading={loading}
        options={filters.activityTypesList}
        getOptionLabel={(o) => o.name}
        value={activity.selectedActivityType || null}
        onChange={(event, value) => {
          if (value) handleSelectActivityType(value);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search for an activity type"
            inputProps={{ ...params.inputProps, "aria-label": "Activity type" }}
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
        {isSelected
          ? "Changing the type resets Action and Activities below."
          : "Choose the type of activity to filter by, e.g. materials or videos."}
      </Typography>
    </Stack>
  );
}

ActivityTypeSelection.propTypes = {
  activity: PropTypes.object.isRequired,
};
