import { useContext, useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  Box,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
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

  const scrollContainerRef = useRef(null);
  const prevLengthRef = useRef(filters.selectedActivities.length);

  useEffect(() => {
    const prevLength = prevLengthRef.current;
    const newLength = filters.selectedActivities.length;

    if (newLength > prevLength) {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "smooth",
        });
      }
    }

    prevLengthRef.current = newLength;
  }, [filters.selectedActivities]);

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
    handleToggleDialogOpen(null);
  };

  const handleConfirmRemoveFilter = () => {
    handleRemoveFilter(null);
  };

  return (
    <>
      <Accordion
        defaultExpanded
        sx={{
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "none",
        }}
      >
        <AccordionDetails sx={{ pt: 2 }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid size="auto">
              <Grid container alignItems="center">
                <Typography>
                  Apply <b>Activity filters</b>
                </Typography>
                <CustomTooltip
                  type="description"
                  message={`Narrow down the data by selecting specific activity types, actions, or activities to include in the analysis.`}
                />
              </Grid>
            </Grid>
            {filters.selectedActivities.length > 0 ? (
              <Grid size="auto">
                <Button variant="contained" onClick={handleAddMoreFilter}>
                  Add Filter
                </Button>
              </Grid>
            ) : undefined}
          </Grid>

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
              ref={scrollContainerRef}
              sx={{
                display: "flex",
                gap: 2,
                overflowX: "auto",
                mt: 2,
                pb: 1,
              }}
            >
              {filters.selectedActivities.map((activity, index) => (
                <div key={activity.id}>
                  <Paper
                    sx={{
                      width: 450,
                      p: 2,
                      flexShrink: 0,
                    }}
                    variant="outlined"
                  >
                    <Grid container spacing={2}>
                      <Grid size="grow">
                        <Grid
                          container
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography>Activity filter {index + 1}</Typography>
                          <Tooltip
                            arrow
                            title={<Typography>Delete filter</Typography>}
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveFilter(activity)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Grid>
                        <CustomDialog
                          type="delete"
                          open={state.activityDialog.openActivityDialog}
                          toggleOpen={handleToggleDialogOpen}
                          content={state.activityDialog.content}
                          handler={handleConfirmRemoveFilter}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <ActivityTypeSelection activity={activity} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <ActionSelection activity={activity} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <ActivitySelection activity={activity} />
                      </Grid>
                    </Grid>
                  </Paper>
                </div>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </>
  );
}
