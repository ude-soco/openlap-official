import { useContext } from "react";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";
import IndicatorsSummary from "./components/indicators-summary";
import { Button, Collapse, Divider, Grid } from "@mui/material";
import { CompositeContext } from "../../composite-indicator";
import IndicatorSelection from "./components/indicator-selection";
import { SelectedIndicatorsTable } from "./components/selected-indicators-table";

const Indicators = () => {
  const { lockedStep, indicator, setLockedStep } = useContext(CompositeContext);

  const handleCheckDisabled = () => {
    return indicator.selectedIndicators.length < 2;
  };

  const handleUnlockPath = () => {
    setLockedStep((p) => ({
      ...p,
      indicators: { ...p.indicators, openPanel: false },
      columnsMerge: {
        ...p.columnsMerge,
        locked: false,
        openPanel: p.columnsMerge.locked ? true : false,
      },
    }));
  };

  return (
    <>
      <CustomPaper sx={{ p: 2 }}>
        <Grid container spacing={1}>
          <Grid size={{ xs: 12 }}>
            <IndicatorsSummary />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Collapse
              in={lockedStep.indicators.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2} justifyContent="center">
                <Grid size={{ xs: 12, xl: 10 }}>
                  <IndicatorSelection />
                </Grid>
                <Grid size={{ xs: 12, xl: 10 }}>
                  <SelectedIndicatorsTable />
                </Grid>

                <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                  <Divider />
                </Grid>
                <Grid size={{ xs: 12, xl: 10 }}>
                  <Grid container justifyContent="center">
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={handleCheckDisabled()}
                        onClick={handleUnlockPath}
                      >
                        {lockedStep.columnsMerge.locked ? "Next" : "Close"}
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </CustomPaper>
    </>
  );
};

export default Indicators;
