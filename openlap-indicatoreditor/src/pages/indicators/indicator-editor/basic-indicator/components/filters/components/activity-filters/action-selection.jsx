import { useContext } from "react";
import {
  Autocomplete,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function ActionSelection({ activity, index }) {
  const { api } = useContext(AuthContext);
  const { dataset, setFilters } = useContext(BasicContext);

  const handleCheckActionsAvailable = () => {
    return activity.actionList.length === 0;
  };

  const handleCheckActivityAvailable = () => {
    return activity.activityList.length !== 0;
  };

  const handleSelectActions = async (value) => {
    let actionIdList = [];
    // TODO:  The selectedActionList currently is taking an object NOT a list
    //        This has to be fixed not only in the front-end, but also in the backend
    if (value.id) actionIdList.push(value.id);

    if (actionIdList.length > 0) {
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
    <Stack gap={1}>
      <Stack direction="row" alignItems="center">
        {handleCheckActionsAvailable() && (
          <CustomTooltip
            type="help"
            message={`This dropdown is disabled because:<br/>● An <b>Activity Type</b> needs to be selected`}
          />
        )}

        {handleCheckActivityAvailable() && (
          <CustomTooltip
            type="warning"
            message={`Changing <b>Action</b> will reset your selections in <b>Activities</b>.`}
          />
        )}
        <Typography
          color={handleCheckActionsAvailable() ? "textSecondary" : undefined}
        >
          {handleCheckActionsAvailable() ? (
            "(Disabled) Actions"
          ) : (
            <>
              Select an <b>Action</b>
            </>
          )}
        </Typography>
      </Stack>
      <Stack direction="row" gap={1}>
        <Autocomplete
          disableClearable
          disablePortal
          // disableCloseOnSelect
          fullWidth
          disabled={handleCheckActionsAvailable()}
          options={activity.actionList}
          getOptionLabel={(o) => o.name}
          value={activity.selectedActionList[index] || null}
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
          <CustomTooltip
            type="description"
            message={`Select one or more actions performed within the chosen activity type, such as viewed, edited, or deleted.`}
          />
        )}
      </Stack>
    </Stack>
  );
}
