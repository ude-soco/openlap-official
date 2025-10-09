import {
  Button,
  Collapse,
  Grid,
  Divider,
  Stack,
  Container,
} from "@mui/material";
import { useContext } from "react";
import { BasicContext } from "../../basic-indicator";
import FiltersSummary from "./components/filters-summary";
import UserFilter from "./components/user-filter";
import DateFilter from "./components/date-filter";
import ActivityFilters from "./components/activity-filters/activity-filters.jsx";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper.jsx";

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
      <CustomPaper locked={lockedStep.filters.locked}>
        <Stack>
          <FiltersSummary />
          <Collapse
            in={lockedStep.filters.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={2}>
              <Container maxWidth="lg">
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <DateFilter />
                  </Grid>
                  <Grid size={{ xs: 12, lg: 6 }}>
                    <UserFilter />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <ActivityFilters />
                  </Grid>
                </Grid>
              </Container>
              <Divider />
              <Container maxWidth="sm">
                <Button
                  fullWidth
                  variant="contained"
                  disabled={handleCheckDisabled()}
                  onClick={handleUnlockPath}
                >
                  Next
                </Button>
              </Container>
            </Stack>
          </Collapse>
        </Stack>
      </CustomPaper>
    </>
  );
}
