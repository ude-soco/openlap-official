import { useContext, useState } from "react";
import {
  Autocomplete,
  Checkbox,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import HelpIcon from "@mui/icons-material/Help";
import { BasicContext } from "../../../../basic-indicator";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import TipPopover from "../../../../../../../../common/components/tip-popover/tip-popover";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function ActivitySelection({ activity }) {
  const { setFilters } = useContext(BasicContext);
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
      <Grid container spacing={1} alignItems="center">
        {handleCheckActivityAvailable() && (
          <Grid size="auto" sx={{ cursor: "pointer" }}>
            <Tooltip
              title={
                <>
                  <Typography>This dropdown is disabled because:</Typography>
                  <Typography component="div" sx={{ my: -1 }}>
                    <ul>
                      <li>At least an action needs to be selected</li>
                    </ul>
                  </Typography>
                </>
              }
            >
              <HelpIcon color="info" />
            </Tooltip>
          </Grid>
        )}
        <Typography
          gutterBottom
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
              <TextField {...params} placeholder="List of activities" />
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
