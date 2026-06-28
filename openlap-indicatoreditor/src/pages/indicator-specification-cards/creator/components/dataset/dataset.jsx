import { useContext } from "react";
import { ISCContext } from "../../isc-context.js";
import { Button, Collapse, Divider, Grid, Stack } from "@mui/material";
import DatasetSummary from "./components/dataset-summary.jsx";
import DatasetIntro from "./components/dataset-intro.jsx";
import DatasetRequirementsRail from "./components/dataset-requirements-rail.jsx";
import DataTableManager from "./data-table-manager/data-table-manager";
import WorkflowSection from "../../../../../common/components/workflow-section/workflow-section.jsx";
import { isDatasetComplete } from "../../utils/isc-selectors.js";
import { isExampleDatasetActive } from "./utils/example-dataset.js";
import { validateDataset } from "./utils/dataset-validation.js";

const Dataset = () => {
  const { dataset, lockedStep, setLockedStep, id } = useContext(ISCContext);

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

  // Next is allowed only once the dataset is actually usable (Phase 4F):
  // columns exist, at least one meaningful row, and no invalid cells. The
  // Example Mode draft (illustrative placeholders) never counts as real data.
  const handleCheckDisabled = () => {
    if (isExampleDatasetActive({ dataset, isExistingIsc: Boolean(id) })) {
      return true;
    }
    const validation = validateDataset(dataset);
    return !validation.ready;
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

  const status = lockedStep.dataset.locked
    ? "locked"
    : lockedStep.dataset.openPanel
      ? "active"
      : isDatasetComplete({ dataset })
        ? "completed"
        : "available";

  return (
    <>
      <WorkflowSection
        status={status}
        ariaLabel="Choose dataset"
        lockedHint="Complete the previous step to build your dataset."
      >
        <DatasetSummary />
        <Collapse
          in={lockedStep.dataset.openPanel}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Stack gap={2} sx={{ py: 2 }}>
            <DatasetIntro />
            <Divider />
            {/*
              Data workspace: the table is the main area; the read-only
              requirements/compatibility rail sits beside it on desktop and
              above it on mobile (via responsive `order`). The table and its
              action bar (Insert Column / Insert Rows / Upload CSV / Reset) keep
              their existing logic — only the surrounding frame is new.
            */}
            <Grid container spacing={2}>
              <Grid
                size={{ xs: 12, md: 8, lg: 9 }}
                sx={{ order: { xs: 2, md: 1 } }}
              >
                <DataTableManager />
              </Grid>
              <Grid
                size={{ xs: 12, md: 4, lg: 3 }}
                sx={{ order: { xs: 1, md: 2 } }}
              >
                <DatasetRequirementsRail />
              </Grid>
            </Grid>
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
};

export default Dataset;
