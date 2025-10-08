import { useContext } from "react";
import { Autocomplete, Grid, TextField, Typography } from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function ActionSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, setFilters } = useContext(BasicContext);

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
      <Grid container alignItems="center">
        {handleCheckActionsAvailable() ? (
          <Grid size="auto">
            <CustomTooltip
              type="help"
              message={`This dropdown is disabled because:<br/>● An <b>Activity Type</b> needs to be selected`}
            />
          </Grid>
        ) : (
          <Grid size="auto">
            <CustomTooltip
              type="warning"
              message={`If you have selected any <b>Activities</b> below, changing the <b>Actions</b> in this dropdown will reset your <b>Activity</b> selections.`}
            />
          </Grid>
        )}
        <Typography
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
              <TextField {...params} placeholder="Search for actions" />
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

          {!handleCheckActionsAvailable() && (
            <Typography variant="caption" color="textSecondary" sx={{ p: 2 }}>
              Multi select possible
            </Typography>
          )}
        </Grid>
        {!handleCheckActionsAvailable() && (
          <Grid size="auto" sx={{ pt: 1 }}>
            <CustomTooltip
              type="description"
              message={`Select one or more actions performed within the chosen activity type, such as viewed, edited, or deleted.`}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}
