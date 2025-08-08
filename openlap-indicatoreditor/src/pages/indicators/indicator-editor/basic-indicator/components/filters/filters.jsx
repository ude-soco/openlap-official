import { Button, Collapse, Divider, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useContext } from "react";
import { BasicContext } from "../../basic-indicator";
import FiltersSummary from "./components/filters-summary";
import UserFilter from "./components/user-filter";
import DateFilter from "./components/date-filter";
import ActivityFilters from "./components/activity-filters/activity-filters.jsx";
import { CustomThemeContext } from "../../../../../../setup/theme-manager/theme-context-manager.jsx";

export default function Filters() {
  const { darkMode } = useContext(CustomThemeContext);
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
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          position: "relative",
          opacity: lockedStep.filters.locked ? "0.5" : "1",
          pointerEvents: lockedStep.filters.locked ? "none" : "auto",
          backgroundColor: lockedStep.filters.locked
            ? darkMode
              ? "grey.800"
              : "grey.400"
            : "background.paper",
        }}
      >
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <FiltersSummary />
            <Collapse
              in={lockedStep.filters.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, md: 10, lg: 8 }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 7 }}>
                          <DateFilter />
                        </Grid>
                        <Grid size={{ xs: 12, md: 5 }}>
                          <UserFilter />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <ActivityFilters />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid size={{ xs: 12 }} sx={{ py: 2 }}>
                    <Divider />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
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
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
