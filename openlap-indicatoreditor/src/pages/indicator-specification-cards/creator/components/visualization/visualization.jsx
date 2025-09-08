import { useContext, useState } from "react";
import { Button, Collapse, Divider, Paper, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ISCContext } from "../../indicator-specification-card.jsx";
import ChartTypeFilter from "./components/chart-type-filter.jsx";
import VisualizationFilter from "./components/visualization-filter/visualization-filter";
import VisualizationSummary from "./components/visualization-summary/visualization-summary.jsx";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager.jsx";

const Visualization = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { lockedStep, setLockedStep, visRef } = useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      visualization: {
        ...p.visualization,
        openPanel: !p.visualization.openPanel,
      },
    }));
  };

  const handleUnlockDataset = () => {
    handleTogglePanel();
    setLockedStep((p) => ({
      ...p,
      dataset: {
        ...p.dataset,
        locked: false,
        openPanel: p.dataset.locked ? true : p.dataset.openPanel,
        step: "4",
      },
    }));
  };

  const handleUnlockFinalize = () => {
    handleTogglePanel();
    setLockedStep((p) => ({
      ...p,
      finalize: {
        ...p.finalize,
        locked: false,
        openPanel: true,
      },
    }));
  };

  const handleCheckDisabled = () => {
    return visRef.chart.type === "";
  };

  const handleUnlockPath = () => {
    if (lockedStep.visualization.step === "3") {
      handleUnlockDataset();
      return;
    }
    if (lockedStep.visualization.step === "4") {
      handleUnlockFinalize();
      return;
    }
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          position: "relative",
          opacity: lockedStep.visualization.locked ? "0.5" : "1",
          pointerEvents: lockedStep.visualization.locked ? "none" : "auto",
          backgroundColor: lockedStep.visualization.locked
            ? darkMode
              ? "grey.800"
              : "grey.400"
            : "background.paper",
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <VisualizationSummary />
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
            <Collapse
              in={lockedStep.visualization.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <ChartTypeFilter />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <VisualizationFilter />
                </Grid>
                <Grid size={{ xs: 12 }}>
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
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default Visualization;
