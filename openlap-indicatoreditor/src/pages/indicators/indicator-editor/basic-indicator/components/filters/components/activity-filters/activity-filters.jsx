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
import TipPopover from "../../../../../../../../common/components/tip-popover/tip-popover";
import { fetchActivityTypesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";
import { v4 as uuidv4 } from "uuid";
import ActivityTypeSelection from "./activity-type-selection";
import ActionSelection from "./action-selection";
import ActivitySelection from "./activity-selection";

export default function ActivityFilters() {
  const { api } = useContext(AuthContext);
  const { dataset, filters, setFilters } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
        <b>Tip!</b><br/>
        To be decided!
      `,
  });

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

  useEffect(() => {
    const loadActivityTypesList = async () => {
      try {
        const activityTypesList = await fetchActivityTypesList(
          api,
          dataset.selectedLRSList
        );
        setFilters((p) => ({ ...p, activityTypesList: activityTypesList }));
      } catch (error) {
        console.error(`Failed to load Activity types list`, error);
      }
    };
    if (dataset.selectedLRSList.length) loadActivityTypesList();
  }, [dataset.selectedLRSList.length]);

  const handleActivityFilterPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

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
              <Grid container spacing={1} alignItems="center">
                <Typography>Apply Activity filters</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleActivityFilterPopoverAnchor}
                  description={state.tipDescription}
                />
              </Grid>
            </Grid>
            <Grid size="auto">
              <Button variant="contained" onClick={handleAddMoreFilter}>
                Add Filter
              </Button>
            </Grid>
          </Grid>

          {filters.selectedActivities.length === 0 ? (
            <Box
              sx={{
                mt: 2,
                pb: 1,
                p: 2,
                border: "1px dashed",
                borderColor: "divider",
                borderRadius: 2,
                textAlign: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body1">
                No filters added. Click "Add Filter" to get started.
              </Typography>
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
