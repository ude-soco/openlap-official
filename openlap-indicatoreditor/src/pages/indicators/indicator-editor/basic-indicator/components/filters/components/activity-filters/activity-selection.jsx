import { useContext } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  Checkbox,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function ActivitySelection({ activity }) {
  const { setFilters, setAnalysis } = useContext(BasicContext);

  const isDisabled = activity.activityList.length === 0;

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
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
  };

  return (
    <Stack gap={0.75}>
      <Typography
        variant="body2"
        fontWeight={500}
        color={isDisabled ? "text.disabled" : undefined}
      >
        Activities
      </Typography>
      <Autocomplete
        fullWidth
        disabled={isDisabled}
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
          <TextField
            {...params}
            placeholder="Search for activities"
            inputProps={{ ...params.inputProps, "aria-label": "Activities" }}
          />
        )}
        value={activity.selectedActivityList || []}
      />
      <Typography variant="caption" color="text.secondary">
        {isDisabled
          ? "Select an action first."
          : "Pick the activities to include — multiple selections allowed."}
      </Typography>
    </Stack>
  );
}

ActivitySelection.propTypes = {
  activity: PropTypes.object.isRequired,
};
