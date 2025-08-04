import { useContext } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import { Button, Collapse, Divider, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2";
import DatasetSummary from "./components/dataset-summary/dataset-summary.jsx";
import DataTableManager from "./data-table-manager/data-table-manager";

const Dataset = () => {
  const { dataset, lockedStep, setLockedStep } = useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      dataset: {
        ...p.dataset,
        openPanel: !p.dataset.openPanel,
      },
    }));
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        locked: false,
        openPanel: true,
        step: "4",
      },
    }));
  };

  const handleUnlockFinalize = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      finalize: {
        ...prevState.finalize,
        locked: false,
        openPanel: true,
      },
    }));
  };

  const handleCheckDisabled = () => {
    return dataset.rows.length === 0 && dataset.columns.length === 0;
  };

  const handleUnlockPath = () => {
    if (lockedStep.dataset.step === "3") {
      handleUnlockVisualization();
      return;
    }
    if (lockedStep.dataset.step === "4") {
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
          opacity: lockedStep.dataset.locked ? "0.5" : "1",
          pointerEvents: lockedStep.dataset.locked ? "none" : "auto",
          backgroundColor: lockedStep.dataset.locked
            ? "grey.500"
            : "background.paper",
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <DatasetSummary />
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
            <Collapse
              in={lockedStep.dataset.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <DataTableManager />
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

export default Dataset;
