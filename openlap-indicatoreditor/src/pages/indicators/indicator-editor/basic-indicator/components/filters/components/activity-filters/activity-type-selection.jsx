import { useContext } from "react";
import {
  Autocomplete,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActionOnActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function ActivityTypeSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, filters, setFilters } = useContext(BasicContext);

  const handleSelectActivityType = (value) => {
    const loadActionList = async () => {
      try {
        const actionList = await fetchActionOnActivitiesList(
          api,
          dataset.selectedLRSList,
          value.id
        );
        return actionList;
      } catch (error) {
        console.error(`Failed to load the action on activity list`, error);
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

  const handleCheckActivityTypeSelected = () => {
    return activity.selectedActivityType.name !== "";
  };

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center">
        {handleCheckActivityTypeSelected() && (
          <CustomTooltip
            type="warning"
            message={`Changing your selection for <b>Activity Type</b> will reset the selections of <b>Action</b> and <b>Activities</b>.`}
          />
        )}
        <Typography>
          Select <b>Activity Type</b>
        </Typography>
      </Stack>
      <Stack direction="row" gap={1} alignItems="center">
        <Autocomplete
          disableClearable
          disablePortal
          fullWidth
          options={filters.activityTypesList}
          getOptionLabel={(o) => o.name}
          value={activity.selectedActivityType || null}
          onChange={(event, value) => {
            if (value) handleSelectActivityType(value);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search for a type of Activity"
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
        <CustomTooltip
          type="description"
          message={`Choose the type of activity you want to filter by, such as annotations, materials, or videos.`}
        />
      </Stack>
    </Stack>
  );
}
