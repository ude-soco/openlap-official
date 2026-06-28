import { useContext, useState } from "react";
import {
  Button,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { BasicContext } from "../../../../basic-indicator";
import { v4 as uuidv4 } from "uuid";
import ActivityTypeSelection from "./activity-type-selection";
import ActionSelection from "./action-selection";
import ActivitySelection from "./activity-selection";
import CustomDialog from "../../../../../../../../common/components/custom-dialog/custom-dialog";
import EmptyState from "../../../../../../../../common/components/empty-state/empty-state";
import FilterSection from "../filter-section";

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

  const hasFilters = filters.selectedActivities.length > 0;

  return (
    <FilterSection
      title="Activity filters"
      helper="Narrow the data by activity type, action, and activity. Add at least one filter to continue."
      action={
        hasFilters ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddMoreFilter}
          >
            Add filter
          </Button>
        ) : undefined
      }
    >
      {!hasFilters ? (
        <EmptyState
          icon={FilterAltOutlinedIcon}
          title="No activity filters yet"
          description="Add at least one activity filter to choose which activities to include in the analysis."
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddMoreFilter}
            >
              Add filter
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2}>
          {filters.selectedActivities.map((activity, index) => (
            <Grid
              key={activity.id}
              size={{ xs: 12, lg: 6 }}
              sx={{ display: "flex" }}
            >
              <Paper
                variant="outlined"
                sx={(theme) => ({
                  width: "100%",
                  p: 2,
                  borderRadius: `${theme.custom.radii.card}px`,
                })}
              >
                <Stack gap={2}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                  >
                    <Typography fontWeight={600}>
                      Activity filter {index + 1}
                    </Typography>
                    <Tooltip arrow title="Remove this filter">
                      <IconButton
                        size="small"
                        color="error"
                        aria-label={`Remove activity filter ${index + 1}`}
                        onClick={() => handleRemoveFilter(activity)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack gap={3}>
                    <ActivityTypeSelection activity={activity} />
                    <ActionSelection activity={activity} index={index} />
                    <ActivitySelection activity={activity} />
                  </Stack>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <CustomDialog
        type="delete"
        open={state.activityDialog.openActivityDialog}
        toggleOpen={handleToggleDialogOpen}
        content={state.activityDialog.content}
        handler={handleConfirmRemoveFilter}
      />
    </FilterSection>
  );
}
