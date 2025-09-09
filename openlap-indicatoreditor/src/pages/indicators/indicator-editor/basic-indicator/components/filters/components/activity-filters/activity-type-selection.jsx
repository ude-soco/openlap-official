import { useContext, useState } from "react";
import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActionOnActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function ActivityTypeSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, filters, setFilters } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!.
    `,
  });

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
    <>
      <Grid container alignItems="center">
        {handleCheckActivityTypeSelected() && (
          <Grid size="auto">
            <CustomTooltip
              type="warning"
              message={`If you have selected any <b>Actions</b> or <b>Activities</b> below, changing the <b>Activity Type</b> from this dropdown will reset both selections.`}
            />
          </Grid>
        )}
        <Typography>
          Select <b>Activity Type</b>
        </Typography>
      </Grid>
      <Grid container spacing={1} alignItems="center">
        <Grid size="grow">
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
                      <Typography variant="body2">{option.id}</Typography>
                    </Grid>
                  </Grid>
                </li>
              );
            }}
          />
        </Grid>
        <Grid size="auto">
          <CustomTooltip
            type="description"
            message={`Choose the type of activity you want to filter by, such as annotations, materials, or videos.`}
          />
        </Grid>
      </Grid>
    </>
  );
}
