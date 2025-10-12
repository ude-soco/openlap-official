import { useContext, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { BasicContext } from "../../../../basic-indicator";
import { v4 as uuidv4 } from "uuid";
import ActivityTypeSelection from "./activity-type-selection";
import ActionSelection from "./action-selection";
import ActivitySelection from "./activity-selection";
import CustomTooltip from "../../../../../../../../common/components/custom-tooltip/custom-tooltip";
import CustomDialog from "../../../../../../../../common/components/custom-dialog/custom-dialog";

export default function ActivityFilters() {
  const { filters, setFilters, setAnalysis } = useContext(BasicContext);
  const [state, setState] = useState({
    activityDialog: {
      openActivityDialog: false,
      content: `Removing this filter will have the following effects:<br/>
      • Analyzed data in <b>Analysis</b> will be deleted<br/>
      • Chosen visualization and its customizations in <b>Visualization</b> will be lost<br/><br/>
      Please confirm before proceeding.`,
      pendingActivity: null,
    },
  });

  const handleAddMoreFilter = () => {
    setFilters((p) => {
      let tempSelectedActivities = [
        ...p.selectedActivities,
        {
          id: uuidv4(),
          selectedActivityType: { name: "" },
          actionList: [],
          selectedActionList: [],
          activityList: [],
          selectedActivityList: [],
        },
      ];
      return { ...p, selectedActivities: tempSelectedActivities };
    });
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
  };

  const handleToggleDialogOpen = (pendingActivity = null) => {
    setState((p) => ({
      ...p,
      activityDialog: {
        ...p.activityDialog,
        openActivityDialog: !p.activityDialog.openActivityDialog,
        pendingActivity,
      },
    }));
  };

  const handleRemoveFilter = (activity) => {
    if (state.activityDialog.pendingActivity === null) {
      handleToggleDialogOpen(activity);
      return;
    }
    setFilters((p) => {
      const updatedActivities = p.selectedActivities.filter(
        (a) => a.id !== state.activityDialog.pendingActivity.id
      );
      return { ...p, selectedActivities: updatedActivities };
    });
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
    setState((p) => ({
      ...p,
      activityDialog: {
        ...p.activityDialog,
        pendingActivity: null,
      },
    }));
  };

  const handleConfirmRemoveFilter = () => {
    handleRemoveFilter(null);
  };

  return (
    <>
      <Stack gap={2} component={Paper} variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" alignItems="center">
            <Typography>
              Apply <b>Activity filters</b>
            </Typography>
            <CustomTooltip
              type="description"
              message={`Narrow down the data by selecting specific activity types, actions, or activities to include in the analysis.`}
            />
          </Stack>
          {filters.selectedActivities.length > 0 ? (
            <Button variant="contained" onClick={handleAddMoreFilter}>
              Add Filter
            </Button>
          ) : undefined}
        </Stack>

        {filters.selectedActivities.length === 0 ? (
          <Box
            sx={{
              mt: 2,
              pb: 1,
              p: 8,
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" gutterBottom>
              No filters added. Click "Add Filter" to get started.
            </Typography>
            <Button variant="contained" onClick={handleAddMoreFilter}>
              Add Filter
            </Button>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 2,
              overflowX: "auto",
              pb: 2,
            }}
          >
            {filters.selectedActivities.map((activity, index) => (
              <Stack
                key={activity.id}
                gap={2}
                component={Paper}
                sx={{
                  width: 420,
                  flexShrink: 0,
                  p: 2,
                }}
                variant="outlined"
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography>Activity filter {index + 1}</Typography>
                  <Tooltip arrow title={<Typography>Delete filter</Typography>}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveFilter(activity)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <CustomDialog
                    type="delete"
                    open={state.activityDialog.openActivityDialog}
                    toggleOpen={handleToggleDialogOpen}
                    content={state.activityDialog.content}
                    handler={handleConfirmRemoveFilter}
                  />
                </Stack>
                <Stack gap={3}>
                  <ActivityTypeSelection activity={activity} />
                  <ActionSelection activity={activity} index={index} />
                  <ActivitySelection activity={activity} />
                </Stack>
              </Stack>
            ))}
          </Box>
        )}
      </Stack>
    </>
  );
}
