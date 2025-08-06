import { useContext, useState } from "react";
import { Autocomplete, TextField, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import HelpIcon from "@mui/icons-material/Help";
import WarningIcon from "@mui/icons-material/Warning";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import TipPopover from "../../../../../../../../common/components/tip-popover/tip-popover";

export default function ActionSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, setFilters } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
        <b>Tip!</b><br/>
        To be decided!
      `,
  });

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleCheckActionsAvailable = () => {
    return activity.actionList.length === 0;
  };

  const handleSelectActions = (value) => {
    let actionIdList = [];
    for (let i = 0; i < value.length; i++) {
      actionIdList.push(value[i].id);
    }

    const loadActivityList = async (actionIdList) => {
      try {
        const activityList = await fetchActivitiesList(
          api,
          dataset.selectedLRSList,
          activity.selectedActivityType.id,
          actionIdList
        );
        return activityList;
      } catch (error) {
        console.error(error);
      }
    };

    if (actionIdList.length > 0) {
      loadActivityList(actionIdList).then((activityList) => {
        setFilters((p) => {
          let updatedActivities;
          updatedActivities = p.selectedActivities.map((a) =>
            a.id === activity.id
              ? {
                  ...a,
                  selectedActionList: value,
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
      });
    } else {
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
    }
  };

  return (
    <>
      <Grid container spacing={1} alignItems="center">
        {handleCheckActionsAvailable() ? (
          <Grid size="auto" sx={{ cursor: "pointer" }}>
            <Tooltip
              title={
                <>
                  <Typography>This dropdown is disabled because:</Typography>
                  <Typography sx={{ my: -1 }}>
                    <ul>
                      <li>At least an activity type needs to be selected</li>
                    </ul>
                  </Typography>
                </>
              }
            >
              <HelpIcon color="info" />
            </Tooltip>
          </Grid>
        ) : (
          <Grid size="auto" sx={{ cursor: "pointer" }}>
            <Tooltip
              title={
                <>
                  <Typography>
                    <b>Caution:</b> <br />
                    If you have selected any <b>Activities</b> below, changing
                    the <b>Actions</b> in this dropdown will reset your{" "}
                    <b>Activity</b> selections.
                  </Typography>
                </>
              }
            >
              <WarningIcon color="warning" />
            </Tooltip>
          </Grid>
        )}
        <Typography
          gutterBottom
          color={handleCheckActionsAvailable() ? "textSecondary" : undefined}
        >
          {handleCheckActionsAvailable() ? (
            "(Disabled) Actions"
          ) : (
            <>
              Select <b>Actions</b>
            </>
          )}
        </Typography>
      </Grid>
      <Grid container spacing={1}>
        <Grid size="grow">
          <Autocomplete
            disableClearable
            disableCloseOnSelect
            disablePortal
            disabled={handleCheckActionsAvailable()}
            fullWidth
            multiple
            options={activity.actionList}
            getOptionLabel={(o) => o.name}
            value={activity.selectedActionList || []}
            onChange={(event, value) => {
              handleSelectActions(value);
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="List of actions" />
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

          {!handleCheckActionsAvailable() && (
            <Typography variant="caption" color="textSecondary" sx={{ p: 2 }}>
              Multi select possible
            </Typography>
          )}
        </Grid>
        {!handleCheckActionsAvailable() && (
          <Grid size="auto" sx={{ pt: 1 }}>
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleTipAnchor}
              description={state.tipDescription}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}
