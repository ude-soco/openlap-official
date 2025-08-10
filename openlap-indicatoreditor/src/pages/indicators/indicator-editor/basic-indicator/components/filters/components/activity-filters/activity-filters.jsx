import { useContext, useEffect, useRef } from "react";
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

export default function ActivityFilters() {
  const { filters, setFilters } = useContext(BasicContext);

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const scroll = scrollContainerRef.current;
      scroll.scrollTo({
        left: scroll.scrollWidth,
        behavior: "smooth",
      });
    }
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
  };

  const handleRemoveFilter = (activity) => {
    setFilters((p) => {
      const updatedActivities = p.selectedActivities.filter(
        (a) => a.id !== activity.id
      );
      return { ...p, selectedActivities: updatedActivities };
    });
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
                <Typography>Apply Activity filters</Typography>
                <CustomTooltip type="description" message={`To be decided.`} />
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
                          <Typography>Filter {index + 1}</Typography>
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
