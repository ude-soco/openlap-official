import { useContext, useState } from "react";
import { Autocomplete, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActionOnActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import TipPopover from "../../../../../../../../common/components/tip-popover/tip-popover";

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

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

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

  return (
    <>
      <Typography gutterBottom>Select a type of Activity</Typography>
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
              <TextField {...params} placeholder="List of Activity types" />
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
          <TipPopover
            tipAnchor={state.tipAnchor}
            toggleTipAnchor={handleTipAnchor}
            description={state.tipDescription}
          />
        </Grid>
      </Grid>
    </>
  );
}
