import { Button, Collapse, Divider, Grid, Stack } from "@mui/material";
import { useContext } from "react";
import { BasicContext } from "../../basic-indicator";
import FiltersSummary from "./components/filters-summary";
import UserFilter from "./components/user-filter";
import DateFilter from "./components/date-filter";
import ActivityFilters from "./components/activity-filters/activity-filters.jsx";
import WorkflowSection from "../../../../../../common/components/workflow-section/workflow-section.jsx";
import { getStepStatus } from "../../utils/basic-workflow-ui.js";

export default function Filters() {
  const { lockedStep, setLockedStep, filters } = useContext(BasicContext);

  const handleCheckDisabled = () => {
    return filters.selectedActivities.length === 0;
  };

  const handleUnlockPath = () => {
    setLockedStep((p) => ({
      ...p,
      filters: { ...p.filters, openPanel: !p.filters.openPanel },
      analysis: { ...p.analysis, locked: false, openPanel: true },
    }));
  };

  return (
    <>
      <WorkflowSection
        status={getStepStatus(lockedStep, "filters")}
        lockedHint="Select a dataset to unlock Filters."
        ariaLabel="Filters step"
      >
        <FiltersSummary />
          <Collapse
            in={lockedStep.filters.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={2} sx={{ py: 2 }}>
              <Grid container spacing={2} alignItems="stretch">
                <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex" }}>
                  <DateFilter />
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex" }}>
                  <UserFilter />
                </Grid>
              </Grid>
              <ActivityFilters />
              <Divider />
              <Grid container justifyContent="center">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={handleCheckDisabled()}
                    onClick={handleUnlockPath}
                  >
                    Next
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </Collapse>
      </WorkflowSection>
    </>
  );
}
