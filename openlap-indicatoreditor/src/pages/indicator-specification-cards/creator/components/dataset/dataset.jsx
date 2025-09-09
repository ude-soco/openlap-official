import { useContext } from "react";
import { ISCContext } from "../../indicator-specification-card.jsx";
import { Button, Collapse, Divider, Grid, Paper, Stack } from "@mui/material";
import DatasetSummary from "./components/dataset-summary.jsx";
import DataTableManager from "./data-table-manager/data-table-manager";
import { CustomThemeContext } from "../../../../../setup/theme-manager/theme-context-manager.jsx";

const Dataset = () => {
  const { darkMode } = useContext(CustomThemeContext);
  const { dataset, lockedStep, setLockedStep } = useContext(ISCContext);

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      dataset: { ...p.dataset, openPanel: !p.dataset.openPanel },
    }));
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((p) => ({
      ...p,
      visualization: {
        ...p.visualization,
        locked: false,
        openPanel: p.visualization.locked ? true : p.visualization.openPanel,
        step: "4",
      },
    }));
  };

  const handleUnlockFinalize = () => {
    handleTogglePanel();
    setLockedStep((p) => ({
      ...p,
      finalize: { ...p.finalize, locked: false, openPanel: true },
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
            ? darkMode
              ? "grey.800"
              : "grey.400"
            : "background.paper",
        }}
      >
        <DatasetSummary />
        <Collapse
          in={lockedStep.dataset.openPanel}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Stack gap={2} sx={{ py: 2 }}>
            <DataTableManager />
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
      </Paper>
    </>
  );
};

export default Dataset;
