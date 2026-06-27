import { useContext } from "react";
import { Button, Collapse, Divider, Grid, Stack } from "@mui/material";
import { ISCContext } from "../../isc-context.js";
import ChartTypeFilter from "./components/chart-type-filter.jsx";
import VisualizationFilter from "./components/visualization-filter/visualization-filter";
import VisualizationSummary from "./components/visualization-summary/visualization-summary.jsx";
import WorkflowSection from "../workflow-section/workflow-section.jsx";
import { isVisualizationComplete } from "../../utils/isc-selectors.js";
import pathChoices from "../choose-path/utils/utils.js";

const Visualization = () => {
  const { lockedStep, setLockedStep, visRef, requirements } =
    useContext(ISCContext);

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

  const status = lockedStep.visualization.locked
    ? "locked"
    : lockedStep.visualization.openPanel
      ? "active"
      : isVisualizationComplete({ visRef })
        ? "completed"
        : "available";

  return (
    <>
      <WorkflowSection
        status={status}
        ariaLabel="Choose visualization"
        lockedHint="Complete the previous step to choose your visualization."
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
              <Stack gap={4}>
                {requirements.selectedPath === pathChoices.task && (
                  <>
                    <ChartTypeFilter />
                    {visRef.filter.type && (
                      <>
                        <Divider />
                        <VisualizationFilter />
                      </>
                    )}
                  </>
                )}
                {requirements.selectedPath === pathChoices.vis && (
                  <VisualizationFilter />
                )}
                {requirements.selectedPath === pathChoices.data && (
                  <>
                    <ChartTypeFilter />
                    <Divider />
                    <VisualizationFilter />
                  </>
                )}

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
          </Grid>
        </Grid>
      </WorkflowSection>
    </>
  );
};

export default Visualization;
