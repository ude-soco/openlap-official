import { useContext, useState } from "react";
import { ISCContext } from "../../isc-context.js";
import { Button, Divider, Grid, Collapse, Stack, Typography } from "@mui/material";
import NameDialog from "./components/name-dialog.jsx";
import VisSelection from "../visualization/components/visualization-filter/vis-selection";
import FinalizeSummary from "./components/finalize-summary/finalize-summary";
import FinalizeReview from "./components/finalize-review/finalize-review.jsx";
import WorkflowSection from "../../../../../common/components/workflow-section/workflow-section.jsx";
import { useParams } from "react-router-dom";

const Finalize = () => {
  const params = useParams();
  const { dataset, lockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    openSaveDialog: false,
  });

  // Preview first, customize only if needed (Phase 5D): the customization panel
  // starts collapsed so the chart preview uses the full available width.
  const [showCustomize, setShowCustomize] = useState(false);

  const handleOpenSaveDialog = () => {
    setState((prevState) => ({
      ...prevState,
      openSaveDialog: !prevState.openSaveDialog,
    }));
  };

  const handleToggleCustomizePanel = () => {
    setShowCustomize(!showCustomize);
  };

  const handleCheckDisabled = () => {
    return dataset.rows.length === 0 || dataset.columns.length === 0;
  };

  const status = lockedStep.finalize.locked
    ? "locked"
    : lockedStep.finalize.openPanel
      ? "active"
      : "available";

  return (
    <>
      <WorkflowSection
        status={status}
        ariaLabel="Finalize indicator"
        lockedHint="Complete the previous steps to finalize your indicator."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FinalizeSummary />
          </Grid>
          <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
            <Collapse
              in={lockedStep.finalize.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Stack gap={0.5} sx={{ mb: 1 }}>
                    <Typography variant="h6" component="h3">
                      Finalize your indicator
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review the indicator, confirm the data and visualization,
                      then save it.
                    </Typography>
                  </Stack>
                </Grid>

                {/* 1. Review + 2. Checks */}
                <Grid size={{ xs: 12 }}>
                  <FinalizeReview />
                </Grid>

                {/* 3. Preview and customize — the existing chart editor, unchanged */}
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="subtitle1"
                    component="h3"
                    fontWeight={600}
                    gutterBottom
                  >
                    Preview and customize
                  </Typography>
                  <VisSelection
                    customize={showCustomize}
                    handleToggleCustomizePanel={handleToggleCustomizePanel}
                  />
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
                        onClick={handleOpenSaveDialog}
                      >
                        {params.id ? "Update indicator" : "Save indicator"}
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </WorkflowSection>
      <NameDialog
        open={state.openSaveDialog}
        toggleOpen={handleOpenSaveDialog}
      />
    </>
  );
};

export default Finalize;
