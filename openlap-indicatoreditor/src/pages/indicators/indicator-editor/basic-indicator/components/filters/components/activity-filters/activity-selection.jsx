import { useContext, useState } from "react";
import { Autocomplete, Checkbox, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../../../basic-indicator";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function ActivitySelection({ activity }) {
  const { setFilters } = useContext(BasicContext);

  const handleCheckActivityAvailable = () => {
    return activity.activityList.length === 0;
  };

  const handleSelectActivities = (value) => {
    setFilters((p) => {
      let updatedActivities;
      updatedActivities = p.selectedActivities.map((a) =>
        a.id === activity.id ? { ...a, selectedActivityList: value } : a
      );
      return {
        ...p,
        selectedActivities: updatedActivities,
      };
    });
  };

  return (
    <>
      <Grid container alignItems="center">
        {handleCheckActivityAvailable() && (
          <Grid size="auto">
            <CustomTooltip
              type="help"
              message={`This dropdown is disabled because:<br />● At least one <b>Action</b> needs to be selected`}
            />
          </Grid>
        )}
        <Typography
          color={handleCheckActivityAvailable() ? "textSecondary" : undefined}
        >
          {handleCheckActivityAvailable() ? (
            "(Disabled) Activities"
          ) : (
            <>
              Select <b>Activities</b>
            </>
          )}
        </Typography>
      </Grid>
      <Grid container spacing={1}>
        <Grid size="grow">
          <Autocomplete
            disabled={handleCheckActivityAvailable()}
            disableClearable
            disableCloseOnSelect
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            limitTags={5}
            multiple
            options={[
              { id: "__select_all__", name: "Select All" },
              ...activity.activityList,
            ]}
            onChange={(event, value) => {
              const lastSelected = value[value.length - 1];

              if (!lastSelected) return;

              if (lastSelected.id === "__select_all__") {
                // If all are selected already, deselect all
                if (
                  activity.selectedActivityList.length ===
                  activity.activityList.length
                ) {
                  handleSelectActivities([]);
                } else {
                  handleSelectActivities(activity.activityList);
                }
              } else {
                // Normal handling, ignore "Select All" if already present
                const cleaned = value.filter((v) => v.id !== "__select_all__");
                handleSelectActivities(cleaned);
              }
            }}
            renderOption={(props, option, { selected }) => {
              const isSelectAll = option.id === "__select_all__";
              const allSelected =
                activity.selectedActivityList.length ===
                activity.activityList.length;

              const { key, ...rest } = props;

              return (
                <li key={key} {...rest}>
                  <Checkbox
                    icon={icon}
                    checkedIcon={checkedIcon}
                    style={{ marginRight: 8 }}
                    checked={isSelectAll ? allSelected : selected}
                  />
                  {option.name}
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Search for activities" />
            )}
            value={activity.selectedActivityList || []}
          />

          {!handleCheckActivityAvailable() && (
            <Typography variant="caption" color="textSecondary" sx={{ pl: 2 }}>
              Multi select possible
            </Typography>
          )}
        </Grid>
        {!handleCheckActivityAvailable() && (
          <Grid size="auto" sx={{ pt: 1 }}>
            <CustomTooltip
              type="description"
              message={`Pick specific activities or resources that match your chosen type and actions.<br/>Multiple selections are allowed.`}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}
