import { useContext } from "react";
import Grid from "@mui/material/Grid2";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";
import IndicatorsSummary from "./components/indicators-summary";
import { Button, Collapse, Divider, Typography } from "@mui/material";
import { CompositeContext } from "../../composite-indicator";
import IndicatorSelection from "./components/indicator-selection";
import { SelectedIndicatorsTable } from "./components/selected-indicators-table";

const Indicators = () => {
  const { lockedStep } = useContext(CompositeContext);
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
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12 }}>
                      <IndicatorSelection />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <SelectedIndicatorsTable />
                    </Grid>

                    <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            // disabled={handleCheckDisabled()}
                            // onClick={handleUnlockPath}
                          >
                            Next
                          </Button>
                        </Grid>
                      </Grid>
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
